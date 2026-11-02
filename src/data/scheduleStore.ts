// src/data/scheduleStore.ts
// =====================================================
// 班表数据（一个月 = 一个对象）
//
// 这就是以后前后端之间传的数据格式：
//   提交班表 → POST /api/schedules   body = 一个 MonthSchedule
//   查看班表 → GET  /api/schedules?month=2026-12 → 返回一个 MonthSchedule
//
// 现在后端还没写，所以用浏览器的 localStorage 模拟两个地方：
//   - 本地（STORAGE_KEY）：页面上正在看 / 正在改的班表，包括还没提交的草稿
//   - 后台（SERVER_KEY）：「提交」之后的班表，相当于数据库里的数据，由 mockApi 读写
// 以后只要把 mockApi 里的几个函数换成 fetch 调真正的接口，页面代码不用改。
// =====================================================

import type { ShiftType } from "../i18n/translations";
import {
  DEFAULT_SETTINGS,
  generateFullTimeSchedule,
  type FullTimeSettings,
  type ScheduleResult,
} from "./fullTimeScheduler";

// ---------- 一天的安排 ----------
export interface PartTimeEntry {
  employeeId: number;
  shift: ShiftType;        // 兼职一天只上一个班：day 白班 / evening 晚班
}

// 正社员按班次分开记：默认白班、晚班都是同一批人（= 全天班），
// 但分开存以后，可以只把某人的白班或晚班换给别人
export interface ShiftStaff {
  day: number[];           // 白班 10:00 - 15:00 的员工 id
  evening: number[];       // 晚班 17:00 - 23:00 的员工 id
}

export interface DayEntry {
  date: string;            // "2026-12-01"
  kitchen: ShiftStaff;     // 厨房正社员
  hall: ShiftStaff;        // 服务员正社员
  partTime: PartTimeEntry[]; // 服务员兼职（店长手动填）
}

// 某个部门这一天上班的人（白班或晚班至少上一个），去重
export const workingIds = (s: ShiftStaff) => [...new Set([...s.day, ...s.evening])];

// ---------- 一个月的班表 ----------
export interface MonthSchedule {
  id: string;              // "2026-12"（一个月只有一份班表，所以用年月当 id）
  name: string;            // 自动生成的名字，例如「2026年12月 班表」
  year: number;
  month: number;           // 1 ~ 12（给人看的月份）
  note: string;            // 备注（店长写，例如「24 号年末聚餐，晚班提前结束」）
  settings: FullTimeSettings;  // 生成时用的人数设置（厨房每天几人、服务员每天几人）
  days: DayEntry[];        // 这个月每一天的安排，长度 = 这个月的天数（28 ~ 31）
  status: "draft" | "submitted";   // draft = 改过但还没提交；submitted = 已提交到后台
  updatedAt: string;       // 最后修改时间（ISO 字符串）
}

// "2026-12" 这种 key
export const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

// 从今天往后数 offset 个月（offset = 0 就是这个月），返回 { year, month(1~12) }
export function monthFromToday(offset: number) {
  const d = new Date();
  d.setDate(1);                          // 先设成 1 号，避免 31 号加一个月跳过二月这种问题
  d.setMonth(d.getMonth() + offset);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// 自动生成的名字（存进数据里；页面上显示时会按当前语言重新格式化）
export const scheduleName = (year: number, month: number) => `${year}年${month}月 班表`;

// 把排班算法的结果，变成一个月的班表对象
export function buildMonthSchedule(
  year: number,
  month: number,
  settings: FullTimeSettings,
  result: ScheduleResult,
  note = "",
  status: MonthSchedule["status"] = "draft"
): MonthSchedule {
  return {
    id: monthKey(year, month),
    name: scheduleName(year, month),
    year,
    month,
    note,
    settings,
    // 算法排的是全天班 → 白班、晚班放同一批人
    days: result.days.map((d) => ({
      date: d.date,
      kitchen: { day: [...d.staff.Kitchen], evening: [...d.staff.Kitchen] },
      hall: { day: [...d.staff.Hall], evening: [...d.staff.Hall] },
      partTime: [],
    })),
    status,
    updatedAt: new Date().toISOString(),
  };
}

// ---------- 读写（现在是 localStorage，以后换成接口）----------
const STORAGE_KEY = "schedule-system-schedules";

export type ScheduleMap = Record<string, MonthSchedule>;

export function loadSchedules(): ScheduleMap {
  let map: ScheduleMap = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) map = JSON.parse(raw) as ScheduleMap;
  } catch {
    map = {};
  }

  // 兼容旧数据：以前正社员是一个数组（全天班），现在拆成白班 / 晚班
  for (const s of Object.values(map)) {
    s.days = s.days.map((d) => {
      const old = d as unknown as { kitchen: number[] | ShiftStaff; hall: number[] | ShiftStaff };
      const fix = (v: number[] | ShiftStaff): ShiftStaff => (Array.isArray(v) ? { day: [...v], evening: [...v] } : v);
      return { ...d, kitchen: fix(old.kitchen), hall: fix(old.hall) };
    });
  }

  // 演示用：这个月如果还没有班表，就当作「上个月已经排好并提交了」，自动生成一份
  // （第一次打开时才放；之后被店长清除了就不再自动生成，这样「清除」才看得到效果）
  const SEEDED_KEY = "schedule-system-seeded";
  const { year, month } = monthFromToday(0);
  const key = monthKey(year, month);
  let seeded = false;
  try { seeded = localStorage.getItem(SEEDED_KEY) === key; } catch { /* 忽略 */ }
  // 已经有这个月的班表（以前打开过）：也记成「放过了」，清除后刷新不会又冒出来
  if (map[key] && !seeded) {
    try { localStorage.setItem(SEEDED_KEY, key); } catch { /* 忽略 */ }
    seeded = true;
  }
  if (!map[key] && !seeded) {
    map[key] = buildMonthSchedule(
      year, month, DEFAULT_SETTINGS,
      generateFullTimeSchedule(year, month - 1, DEFAULT_SETTINGS),
      "", "submitted"
    );
    mockApi.submit(map[key]);              // 「已提交」的班表，后台里也要有一份
    try { localStorage.setItem(SEEDED_KEY, key); } catch { /* 忽略 */ }
  }
  return map;
}

// ---------- 模拟的后台接口 ----------
// 以后分别换成：
//   submit → fetch("/api/schedules", { method: "POST", body: JSON.stringify(s) })
//   remove → fetch(`/api/schedules/${id}`, { method: "DELETE" })
//   get    → fetch(`/api/schedules/${id}`)
const SERVER_KEY = "schedule-system-server";

function readServer(): ScheduleMap {
  try {
    return JSON.parse(localStorage.getItem(SERVER_KEY) || "{}") as ScheduleMap;
  } catch {
    return {};
  }
}

function writeServer(map: ScheduleMap) {
  try {
    localStorage.setItem(SERVER_KEY, JSON.stringify(map));
  } catch {
    // 忽略
  }
}

export const mockApi = {
  // 提交一个月的班表（同一个月再提交就覆盖）
  submit(s: MonthSchedule) {
    const server = readServer();
    server[s.id] = s;
    writeServer(server);
  },
  // 删除后台里某个月的班表
  remove(id: string) {
    const server = readServer();
    delete server[id];
    writeServer(server);
  },
  // 读后台里某个月的班表（没有就是 undefined）
  get(id: string): MonthSchedule | undefined {
    return readServer()[id];
  },
};

export function saveSchedules(map: ScheduleMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 浏览器禁止存储时忽略：页面照样能用，只是刷新后改动会丢
  }
}
