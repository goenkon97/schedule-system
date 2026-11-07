// src/data/scheduleStore.ts
// =====================================================
// 班表数据（一个月 = 一个对象）
//
// 两个地方存班表：
//   - 浏览器（localStorage，STORAGE_KEY）：页面上正在看 / 正在改的班表，包括还没提交的草稿
//   - 后端（MySQL）：店长点「提交」之后的班表。员工、首页看到的都是这一份
//       GET    /api/schedules?from=2026-11&to=2027-01   查几个月
//       PUT    /api/schedules/2026-12                   提交（整月覆盖）
//       DELETE /api/schedules/2026-12                   删除
//   后端把班表拍平存成一行一行（schedules + schedule_assignments 两张表），
//   返回时再组装回下面这个 MonthSchedule 的样子，所以页面代码不用关心数据库长什么样
// =====================================================

import { apiFetch } from "../api/http";
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
// [...s.day, ...s.evening]：把两个数组拼成一个；new Set(...)：去掉重复的 id；
// 外面的 [...]：再把 Set 变回数组
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

// "2026-12" 这种 key；padStart(2, "0")：不足两位前面补 0（3 → "03"）
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
// note = ""、status = "draft"：参数的默认值，调用时不传就用它
// MonthSchedule["status"]：取 MonthSchedule 里 status 字段的类型（"draft" | "submitted"）
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

// 所有月份的班表：{ "2026-11": {...}, "2026-12": {...} }
// Record<string, MonthSchedule>：key 是字符串、值是 MonthSchedule 的对象
export type ScheduleMap = Record<string, MonthSchedule>;

// ---------------------------------------------------
// 读出浏览器里存的班表（排班页打开时先用它显示，等后端的数据回来再合并）
// 步骤：读 localStorage → 兼容旧格式
// ---------------------------------------------------
export function loadSchedules(): ScheduleMap {
  let map: ScheduleMap = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // localStorage 只能存字符串，所以存的时候 JSON.stringify，读的时候 JSON.parse 变回对象
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

  return map;
}

// ---------- 后端接口 ----------
// 失败时 apiFetch 会抛出 ApiError（message 是后端返回的说明，比如「12-05 的白班里，Alice 被安排了两次」）
export const scheduleApi = {
  // 查 from ~ to 这几个月（都是 "2026-12" 这种格式）；没提交过的月份不在结果里
  async list(from: string, to: string): Promise<MonthSchedule[]> {
    return apiFetch<MonthSchedule[]>(`/api/schedules?from=${from}&to=${to}`);
  },

  // 提交一个月（同一个月再提交就覆盖）。只发后端需要的字段：
  //   是哪个月写在网址里；status、updatedAt 由后端决定
  async submit(s: MonthSchedule): Promise<MonthSchedule> {
    return apiFetch<MonthSchedule>(`/api/schedules/${s.id}`, {
      method: "PUT",
      body: { name: s.name, note: s.note, settings: s.settings, days: s.days },
    });
  },

  // 删除某个月（成功时后端返回 204，没有内容）
  async remove(id: string): Promise<void> {
    await apiFetch<void>(`/api/schedules/${id}`, { method: "DELETE" });
  },
};

// ---------------------------------------------------
// 把后端拿到的班表合并进浏览器里的班表
//   keys：这次向后端查了哪几个月
//   keepDrafts：要不要保留浏览器里的草稿（店长 = 要；员工不能改班表，只看后端的）
// 每个月：
//   浏览器里是草稿，而且要保留 → 用草稿（店长还没改完）
//   否则后端有 → 用后端的（最新提交的版本）
//   后端没有 → 删掉（可能已经被别的设备删除了）
// ---------------------------------------------------
export function mergeServerSchedules(
  local: ScheduleMap,
  server: ScheduleMap,
  keys: string[],
  keepDrafts: boolean,
): ScheduleMap {
  const next = { ...local };
  for (const key of keys) {
    if (keepDrafts && local[key]?.status === "draft") continue;
    if (server[key]) next[key] = server[key];
    else delete next[key];
  }
  return next;
}

// ---------------------------------------------------
// 演示用：店长第一次打开时，如果后端还没有「这个月」的班表，自动生成一份并提交
// （当作「上个月已经排好了」，招聘方一登录就能看到月历和首页的数据）
// 每个浏览器只做一次：之后被店长清除了就不再自动生成，这样「清除」才看得到效果
// 返回新提交的班表；不需要生成时返回 null
// ---------------------------------------------------
// （名字和以前 localStorage 版本用的不一样：以前的标记是「浏览器里放过」，现在要的是「后端里放过」，所以换个名字重新算一次）
const SEEDED_KEY = "schedule-system-seeded-server";

export async function seedCurrentMonthIfNeeded(server: ScheduleMap): Promise<MonthSchedule | null> {
  const { year, month } = monthFromToday(0);
  const key = monthKey(year, month);
  if (server[key]) return null;
  let seeded = false;
  try { seeded = localStorage.getItem(SEEDED_KEY) === key; } catch { /* 忽略 */ }
  if (seeded) return null;
  try { localStorage.setItem(SEEDED_KEY, key); } catch { /* 忽略 */ }
  const draft = buildMonthSchedule(
    year, month, DEFAULT_SETTINGS,
    generateFullTimeSchedule(year, month - 1, DEFAULT_SETTINGS),
  );
  return scheduleApi.submit(draft);
}

// 保存所有班表到「本地」（包括草稿）；排班页每次改动后自动调用
export function saveSchedules(map: ScheduleMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 浏览器禁止存储时忽略：页面照样能用，只是刷新后改动会丢
  }
}
