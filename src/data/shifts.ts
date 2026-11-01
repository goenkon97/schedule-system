// src/data/shifts.ts
// =====================================================
// 班次的业务规则（整个前端唯一的来源）
//
// 店铺：烤肉店，一天两个班次
//   白班 10:00 - 15:00：厨房 2 人、服务员（大厅）2 人
//   晚班 17:00 - 23:00：厨房 3 人、服务员（大厅）3 人
//
// 以前班次时间在 Dashboard、Schedule 各写了一份而且对不上；
// 现在所有页面都从这里读。以后接后端时，这份数据会变成
// 数据库里的「班次表」，由接口返回，页面代码不用改。
// =====================================================

import type { Department, ShiftType } from "../i18n/translations";

// 一个班次的定义
export interface ShiftDefinition {
  type: ShiftType;                         // "day" 白班 / "evening" 晚班（显示名称从翻译里取）
  start: string;                           // 开始时间
  end: string;                             // 结束时间
  required: Record<Department, number>;    // 每个部门需要几个人（默认值，以后可以在设置里改）
}

export const shiftDefinitions: ShiftDefinition[] = [
  { type: "day",     start: "10:00", end: "15:00", required: { Kitchen: 2, Hall: 2 } },
  { type: "evening", start: "17:00", end: "23:00", required: { Kitchen: 3, Hall: 3 } },
];

// 店里的部门（顺序 = 页面上显示的顺序）
export const departments: Department[] = ["Kitchen", "Hall"];

// 「10:00 - 15:00」这样的时间段文字
export const shiftTimeLabel = (s: ShiftDefinition) => `${s.start} - ${s.end}`;

// 某个班次需要的人数：传部门就是这个部门的，不传（或 "all"）就是所有部门加起来
export function requiredStaff(s: ShiftDefinition, dept: Department | "all" = "all") {
  if (dept !== "all") return s.required[dept];
  return departments.reduce((sum, d) => sum + s.required[d], 0);
}
