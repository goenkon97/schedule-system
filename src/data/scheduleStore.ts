// src/data/scheduleStore.ts
// =====================================================
// 班表数据（一个月 = 一个对象）
//
// 这就是以后前后端之间传的数据格式：
//   提交班表 → POST /api/schedules   body = 一个 MonthSchedule
//   查看班表 → GET  /api/schedules?month=2026-12 → 返回一个 MonthSchedule
//
// 现在后端还没写，所以先存在浏览器的 localStorage 里（刷新页面不会丢）。
// 以后只要把 loadSchedules / saveSchedules 换成调用接口，页面代码不用改。
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

export interface DayEntry {
  date: string;            // "2026-12-01"
  kitchen: number[];       // 厨房正社员（全天班）的员工 id
  hall: number[];          // 服务员正社员（全天班）的员工 id
  partTime: PartTimeEntry[]; // 服务员兼职（店长手动填）
}

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
    days: result.days.map((d) => ({ date: d.date, kitchen: [...d.staff.Kitchen], hall: [...d.staff.Hall], partTime: [] })),
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

  // 演示用：这个月如果还没有班表，就当作「上个月已经排好并提交了」，自动生成一份
  const { year, month } = monthFromToday(0);
  const key = monthKey(year, month);
  if (!map[key]) {
    map[key] = buildMonthSchedule(
      year, month, DEFAULT_SETTINGS,
      generateFullTimeSchedule(year, month - 1, DEFAULT_SETTINGS),
      "", "submitted"
    );
  }
  return map;
}

export function saveSchedules(map: ScheduleMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 浏览器禁止存储时忽略：页面照样能用，只是刷新后改动会丢
  }
}
