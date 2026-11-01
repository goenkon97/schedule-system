// src/data/employees.ts
// =====================================================
// 员工 Mock 数据（烤肉店：厨房 12 人 + 服务员 12 人）
//
// 先把假数据集中放在这里，页面只负责“显示”。
// 以后接 Java 后端时，只要把这里换成 API 请求（fetch / axios），
// 页面组件基本不用改。
//
// 注意：department / position / status 存的是“英文值”，
// 显示时再用翻译字典转换。数据库里存的也会是这种固定值。
// =====================================================

import type { Department, EmployeeStatus, Position } from "../i18n/translations";

// 一个员工的数据结构（以后后端返回的 JSON 也按这个格式）
export interface Employee {
  id: number;
  name: string;
  department: Department;
  position: Position;
  phone: string;
  status: EmployeeStatus;
}

export const employees: Employee[] = [
  // ---------- 厨房 Kitchen（12 人）----------
  { id: 1,  name: "Tom Lee",        department: "Kitchen", position: "Chef",       phone: "555-123-4567", status: "active" },
  { id: 3,  name: "Jack Wang",      department: "Kitchen", position: "Cook",       phone: "555-345-6789", status: "active" },
  { id: 5,  name: "Mike Chen",      department: "Kitchen", position: "Dishwasher", phone: "555-567-8901", status: "active" },
  { id: 7,  name: "David Kim",      department: "Kitchen", position: "Cook",       phone: "555-789-0123", status: "active" },
  { id: 10, name: "Charlotte Tan",  department: "Kitchen", position: "Cook",       phone: "555-012-3456", status: "active" },
  { id: 11, name: "Benjamin Wong",  department: "Kitchen", position: "Cook",       phone: "555-111-2233", status: "active" },
  { id: 13, name: "Grace Park",     department: "Kitchen", position: "Chef",       phone: "555-333-4455", status: "active" },
  { id: 14, name: "Ryan Zhao",      department: "Kitchen", position: "Dishwasher", phone: "555-444-5566", status: "active" },
  { id: 18, name: "Lucas Yang",     department: "Kitchen", position: "Cook",       phone: "555-888-9900", status: "active" },
  { id: 20, name: "Ethan Guo",      department: "Kitchen", position: "Cook",       phone: "555-101-2020", status: "active" },
  { id: 23, name: "Zoe He",         department: "Kitchen", position: "Dishwasher", phone: "555-404-5050", status: "onLeave" },
  { id: 24, name: "Leo Feng",       department: "Kitchen", position: "Dishwasher", phone: "555-505-6060", status: "active" },

  // ---------- 服务员 Hall（12 人）----------
  { id: 2,  name: "Alice Chen",     department: "Hall",    position: "Server",     phone: "555-234-5678", status: "active" },
  { id: 4,  name: "Emily Zhang",    department: "Hall",    position: "Server",     phone: "555-456-7890", status: "onLeave" },
  { id: 6,  name: "Lisa Sun",       department: "Hall",    position: "Host",       phone: "555-678-9012", status: "active" },
  { id: 8,  name: "Sophia Liu",     department: "Hall",    position: "Manager",    phone: "555-890-1234", status: "active" },
  { id: 9,  name: "Daniel Ho",      department: "Hall",    position: "Host",       phone: "555-901-2345", status: "onLeave" },
  { id: 12, name: "Aiden Lee",      department: "Hall",    position: "Server",     phone: "555-222-3344", status: "active" },
  { id: 15, name: "Olivia Huang",   department: "Hall",    position: "Host",       phone: "555-555-6677", status: "active" },
  { id: 16, name: "Kevin Lin",      department: "Hall",    position: "Server",     phone: "555-666-7788", status: "active" },
  { id: 17, name: "Hannah Xu",      department: "Hall",    position: "Server",     phone: "555-777-8899", status: "active" },
  { id: 19, name: "Mia Wu",         department: "Hall",    position: "Host",       phone: "555-999-0011", status: "active" },
  { id: 21, name: "Chloe Ma",       department: "Hall",    position: "Manager",    phone: "555-202-3030", status: "active" },
  { id: 22, name: "Nathan Shi",     department: "Hall",    position: "Server",     phone: "555-303-4040", status: "active" },
];
