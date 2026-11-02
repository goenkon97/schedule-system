// src/data/fullTimeScheduler.ts
// =====================================================
// 正社员自动排班算法（前端版，用假数据先跑通；以后后端用同样的逻辑再写一遍）
//
// 规则（见 docs/business-rules.md）：
//   - 只排正社员；正社员每天上全天班（白班 + 晚班，10:00 - 23:00）
//   - 每人每周最多上 4 天
//   - 厨房每天需要 N 名正社员（默认 3），服务员每天需要 M 名正社员（默认 2），店长可以调
//   - 上班天数尽量平均：每次选人时，优先选「这周上得少」的，再看「这个月上得少」的
//   - 人不够就少排，那天显示缺人（不硬塞、不违反「每周最多 4 天」）
//   - 兼职不在这里排，由店长之后手动填
// =====================================================

import { employees, type Employee } from "./employees";
import { toDateKey } from "./mockSchedule";
import type { Department } from "../i18n/translations";

// 每人每周最多上几天
export const MAX_DAYS_PER_WEEK = 4;

// 店长在弹窗里调的两个数字
export interface FullTimeSettings {
  kitchenPerDay: number;   // 厨房每天需要几名正社员
  hallPerDay: number;      // 服务员每天需要几名正社员
}

export const DEFAULT_SETTINGS: FullTimeSettings = { kitchenPerDay: 3, hallPerDay: 2 };

// 两个部门按顺序处理
const DEPTS: Department[] = ["Kitchen", "Hall"];

// 每个部门每天需要几人（从设置里取）
const perDayOf = (s: FullTimeSettings, d: Department) => (d === "Kitchen" ? s.kitchenPerDay : s.hallPerDay);

// ---------------------------------------------------
// 某个部门可以参加排班的正社员：在职 + 正社员 + 没有被店长排除
// ---------------------------------------------------
export function availableFullTime(dept: Department, excluded: number[] = []): Employee[] {
  return employees.filter(
    (e) => e.department === dept && e.employment === "fullTime" && e.status === "active" && !excluded.includes(e.id)
  );
}

// ---------------------------------------------------
// 至少需要几名正社员
// 一个人上一天班 = 1 个工作量
// 一周需要的工作量 = 每天人数 × 7；一个人一周最多提供 4 个
// 所以：至少需要 = 向上取整( 每天人数 × 7 ÷ 4 )
// ---------------------------------------------------
export const minFullTimeNeeded = (perDay: number) => Math.ceil((perDay * 7) / MAX_DAYS_PER_WEEK);

export interface StaffingEstimate {
  dept: Department;
  perDay: number;   // 每天需要几人
  need: number;     // 至少需要几名正社员
  have: number;     // 现在可用几名
  short: number;    // 缺几名（够的话是 0）
}

// 店长每改一次数字，就算一次这个，显示在弹窗里
export function estimateStaffing(settings: FullTimeSettings, excluded: number[] = []): StaffingEstimate[] {
  return DEPTS.map((dept) => {
    const perDay = perDayOf(settings, dept);
    const need = minFullTimeNeeded(perDay);
    const have = availableFullTime(dept, excluded).length;
    return { dept, perDay, need, have, short: Math.max(0, need - have) };
  });
}

// ---------------------------------------------------
// 排班结果
// ---------------------------------------------------
export interface DayPlan {
  date: string;                          // "2026-12-01"
  day: number;                           // 几号
  weekday: number;                       // 0 = 周日 … 6 = 周六
  staff: Record<Department, number[]>;   // 每个部门当天上班的员工 id
  short: Record<Department, number>;     // 每个部门当天缺几人
}

export interface ScheduleResult {
  days: DayPlan[];
  daysByEmployee: Map<number, number>;   // 每个人这个月上几天
  shortDayCount: number;                 // 有几天缺人
}

// ---------------------------------------------------
// 生成一个月的正社员班表（month 和 JS 一样从 0 开始：0 = 1 月）
// ---------------------------------------------------
export function generateFullTimeSchedule(
  year: number,
  month: number,
  settings: FullTimeSettings,
  excluded: number[] = []
): ScheduleResult {
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthCount = new Map<number, number>();   // 每人这个月已经上了几天
  let weekCount = new Map<number, number>();      // 每人这一周已经上了几天（每周一清零）

  const days: DayPlan[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const weekday = date.getDay();

    // 周一（getDay() = 1）开始新的一周：每个人的「本周天数」清零
    if (weekday === 1) weekCount = new Map();

    const plan: DayPlan = {
      date: toDateKey(date),
      day,
      weekday,
      staff: { Kitchen: [], Hall: [] },
      short: { Kitchen: 0, Hall: 0 },
    };

    for (const dept of DEPTS) {
      const need = perDayOf(settings, dept);

      const chosen = availableFullTime(dept, excluded)
        // 规则：每人每周最多 4 天
        .filter((e) => (weekCount.get(e.id) ?? 0) < MAX_DAYS_PER_WEEK)
        // 尽量平均：先比本周天数（避免周末没人可排），再比本月天数；
        // 都一样时用一个和日期有关的数打乱顺序，避免永远是同一批人先上
        .sort(
          (a, b) =>
            (weekCount.get(a.id) ?? 0) - (weekCount.get(b.id) ?? 0) ||
            (monthCount.get(a.id) ?? 0) - (monthCount.get(b.id) ?? 0) ||
            ((a.id * 31 + day) % 17) - ((b.id * 31 + day) % 17)
        )
        .slice(0, need);

      for (const e of chosen) {
        plan.staff[dept].push(e.id);
        weekCount.set(e.id, (weekCount.get(e.id) ?? 0) + 1);
        monthCount.set(e.id, (monthCount.get(e.id) ?? 0) + 1);
      }

      // 人不够：记下缺几人，不硬塞
      plan.short[dept] = need - chosen.length;
    }

    days.push(plan);
  }

  return {
    days,
    daysByEmployee: monthCount,
    shortDayCount: days.filter((d) => d.short.Kitchen > 0 || d.short.Hall > 0).length,
  };
}
