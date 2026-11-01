// src/data/mockSchedule.ts
// =====================================================
// 排班的 Mock 数据（以后换成后端接口）
//
// 和以前不同：现在 mock 的不再是「这天有几个人」，而是一条条
// 「哪个员工 × 哪一天 × 哪个班」的排班记录，和以后数据库里存的一样。
// 月历上的人数、首页的今日排班，都是从这些记录统计出来的，所以两个页面的数据一定对得上。
//
// 分两步，和真实店铺的流程一样：
//
// 第一步 generateMonth：按自动排班规则先把整个月排出来（这时不看请假）
//   1. 长期休假中（status = onLeave）的员工不排 —— 这些人整段时间都不在
//   2. 每人每天最多一个班
//   3. 尽量平均：本月班数少的人优先
//   4. 每个部门排满需要的人数就停；人不够就少排（格子会显示缺人）
//
// 第二步 applyLeaves：排好以后，谁哪天请假，就把他那天的班删掉（变成休息）
//   → 那个班次少了一个人，月历上会显示缺人（例如「白班 1/2」变红），由店长手动找人补
// =====================================================

import { employees } from "./employees";
import { departments, requiredStaff, shiftDefinitions } from "./shifts";
import type { Department, ShiftType } from "../i18n/translations";

// 一条排班记录（以后后端返回的 JSON 也按这个格式）
export interface Assignment {
  employeeId: number;
  date: string;              // "2026-11-01" 这种格式，方便比较和当作 key
  shift: ShiftType;
  department: Department;
}

// 一条请假记录
export interface Leave {
  employeeId: number;
  date: string;
}

// 日期 → "YYYY-MM-DD"（用本地时间；toISOString 会转成 UTC，在日本会差一天）
export const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ---------------------------------------------------
// Mock 请假：用一个固定公式算出来，每个月零星几天（刷新页面结果不变）
// ---------------------------------------------------
export function mockLeaves(year: number, month: number): Leave[] {
  const days = new Date(year, month + 1, 0).getDate();      // 这个月有几天
  const result: Leave[] = [];
  for (let day = 1; day <= days; day++) {
    for (const e of employees) {
      if (e.status !== "active") continue;
      if ((day * 7 + e.id * 5 + month) % 41 === 0) {          // 随便选的公式：大约每天 0~1 人请假
        result.push({ employeeId: e.id, date: toDateKey(new Date(year, month, day)) });
      }
    }
  }
  return result;
}

// ---------------------------------------------------
// 按规则生成一个月的排班（month 和 JS 一样从 0 开始）
// ---------------------------------------------------
export function generateMonth(year: number, month: number): Assignment[] {
  const days = new Date(year, month + 1, 0).getDate();
  const countByEmployee = new Map<number, number>();         // 每人本月已排几个班
  const result: Assignment[] = [];

  for (let day = 1; day <= days; day++) {
    const date = toDateKey(new Date(year, month, day));
    const workingToday = new Set<number>();                  // 今天已经有班的人（规则 3）

    for (const shift of shiftDefinitions) {
      for (const dept of departments) {
        const candidates = employees
          .filter((e) => e.department === dept)
          .filter((e) => e.status === "active")              // 规则 1：长期休假中的人不排
          .filter((e) => !workingToday.has(e.id))            // 规则 2：今天已经有班的不排
          // 规则 3：班少的优先；一样多时用日期打乱一下顺序，避免总是同一批人
          .sort((a, b) =>
            (countByEmployee.get(a.id) ?? 0) - (countByEmployee.get(b.id) ?? 0) ||
            ((a.id * 31 + day) % 17) - ((b.id * 31 + day) % 17))
          .slice(0, requiredStaff(shift, dept));             // 规则 4：最多取需要的人数

        for (const e of candidates) {
          result.push({ employeeId: e.id, date, shift: shift.type, department: dept });
          workingToday.add(e.id);
          countByEmployee.set(e.id, (countByEmployee.get(e.id) ?? 0) + 1);
        }
      }
    }
  }
  return result;
}

// ---------------------------------------------------
// 第二步：把请假套用到已经排好的班表上
// 请假那天他本来的班被删掉（= 那天休息）；没有排班的日子请假，班表不变
// 以后接后端：审批通过一条请假时，后端在同一个事务里删掉他那天的排班记录
// ---------------------------------------------------
export function applyLeaves(assignments: Assignment[], leaves: Leave[]): Assignment[] {
  const off = new Set(leaves.map((l) => `${l.employeeId}|${l.date}`));   // 「员工|日期」组成的集合，查起来快
  return assignments.filter((a) => !off.has(`${a.employeeId}|${a.date}`));
}

// 页面直接用这个：先排班，再套用请假
export function scheduleWithLeaves(year: number, month: number): Assignment[] {
  return applyLeaves(generateMonth(year, month), mockLeaves(year, month));
}
