// src/data/employees.ts
// =====================================================
// 员工 Mock 数据（烤肉店：厨房正社员 8 人；服务员正社员 4 人 + 兼职 12 人）
//
// 先把假数据集中放在这里，页面只负责“显示”。
// 员工页的增删改查都走下面的 employeeApi（现在存在浏览器 localStorage 里），
// 以后接 Java 后端时，只要把 employeeApi 里面换成 fetch 请求，
// 页面组件基本不用改。
//
// 注意：department / position / status 存的是“英文值”，
// 显示时再用翻译字典转换。数据库里存的也会是这种固定值。
// =====================================================

import type { Department, EmployeeStatus, EmploymentType, Position } from "../i18n/translations";

// 一个员工的数据结构（以后后端返回的 JSON 也按这个格式）
export interface Employee {
  id: number;
  name: string;
  department: Department;
  position: Position;
  phone: string;
  status: EmployeeStatus;
  employment: EmploymentType;   // fullTime 正社员 / partTime 兼职（厨房只有正社员）
}

// 初始假数据（第一次打开时写进 localStorage，之后以 localStorage 为准）
const seedEmployees: Employee[] = [
  // ---------- 厨房：全部是正社员（在职 7 人 + 长期休假 1 人）----------
  // 默认每天 3 人 → 至少需要 6 人；店长改成每天 4 人 → 需要 7 人（刚好够）；改成 5 人 → 需要 9 人（会提示缺人）
  { id: 1,  name: "Tom Lee",        department: "Kitchen", position: "Chef",       phone: "555-123-4567", status: "active",  employment: "fullTime" },
  { id: 3,  name: "Jack Wang",      department: "Kitchen", position: "Cook",       phone: "555-345-6789", status: "active",  employment: "fullTime" },
  { id: 5,  name: "Mike Chen",      department: "Kitchen", position: "Dishwasher", phone: "555-567-8901", status: "active",  employment: "fullTime" },
  { id: 7,  name: "David Kim",      department: "Kitchen", position: "Cook",       phone: "555-789-0123", status: "active",  employment: "fullTime" },
  { id: 10, name: "Charlotte Tan",  department: "Kitchen", position: "Cook",       phone: "555-012-3456", status: "active",  employment: "fullTime" },
  { id: 13, name: "Grace Park",     department: "Kitchen", position: "Chef",       phone: "555-333-4455", status: "active",  employment: "fullTime" },
  { id: 18, name: "Lucas Yang",     department: "Kitchen", position: "Cook",       phone: "555-888-9900", status: "active",  employment: "fullTime" },
  { id: 23, name: "Zoe He",         department: "Kitchen", position: "Dishwasher", phone: "555-404-5050", status: "onLeave", employment: "fullTime" },

  // ---------- 服务员：正社员 4 人（默认每天 2 人 → 至少需要 4 人）----------
  { id: 2,  name: "Alice Chen",     department: "Hall",    position: "Server",     phone: "555-234-5678", status: "active",  employment: "fullTime" },
  { id: 8,  name: "Sophia Liu",     department: "Hall",    position: "Manager",    phone: "555-890-1234", status: "active",  employment: "fullTime" },
  { id: 12, name: "Aiden Lee",      department: "Hall",    position: "Server",     phone: "555-222-3344", status: "active",  employment: "fullTime" },
  { id: 21, name: "Chloe Ma",       department: "Hall",    position: "Manager",    phone: "555-202-3030", status: "active",  employment: "fullTime" },

  // ---------- 服务员：兼职（时间不固定，排班后由店长手动填）----------
  { id: 4,  name: "Emily Zhang",    department: "Hall",    position: "Server",     phone: "555-456-7890", status: "onLeave", employment: "partTime" },
  { id: 6,  name: "Lisa Sun",       department: "Hall",    position: "Host",       phone: "555-678-9012", status: "active",  employment: "partTime" },
  { id: 9,  name: "Daniel Ho",      department: "Hall",    position: "Host",       phone: "555-901-2345", status: "onLeave", employment: "partTime" },
  { id: 11, name: "Benjamin Wong",  department: "Hall",    position: "Server",     phone: "555-111-2233", status: "active",  employment: "partTime" },
  { id: 14, name: "Ryan Zhao",      department: "Hall",    position: "Server",     phone: "555-444-5566", status: "active",  employment: "partTime" },
  { id: 15, name: "Olivia Huang",   department: "Hall",    position: "Host",       phone: "555-555-6677", status: "active",  employment: "partTime" },
  { id: 16, name: "Kevin Lin",      department: "Hall",    position: "Server",     phone: "555-666-7788", status: "active",  employment: "partTime" },
  { id: 17, name: "Hannah Xu",      department: "Hall",    position: "Server",     phone: "555-777-8899", status: "active",  employment: "partTime" },
  { id: 19, name: "Mia Wu",         department: "Hall",    position: "Host",       phone: "555-999-0011", status: "active",  employment: "partTime" },
  { id: 20, name: "Ethan Guo",      department: "Hall",    position: "Server",     phone: "555-101-2020", status: "active",  employment: "partTime" },
  { id: 22, name: "Nathan Shi",     department: "Hall",    position: "Server",     phone: "555-303-4040", status: "active",  employment: "partTime" },
  { id: 24, name: "Leo Feng",       department: "Hall",    position: "Server",     phone: "555-505-6060", status: "active",  employment: "partTime" },
];

// =====================================================
// 每个部门可以选的职位（添加 / 编辑员工时用）
// 厨房：主厨、厨师、洗碗工；服务员：服务员、接待、店长
// =====================================================
export const positionsByDepartment: Record<Department, Position[]> = {
  Kitchen: ["Chef", "Cook", "Dishwasher"],
  Hall: ["Server", "Host", "Manager"],
};

// 添加 / 编辑时表单提交的数据：比 Employee 少一个 id（id 由“服务器”分配）
export type EmployeeInput = Omit<Employee, "id">;

// =====================================================
// 本地存储（假装是服务器的数据库）
// =====================================================
const STORAGE_KEY = "schedule-system-employees";

// 从 localStorage 读；没有（第一次打开）或者坏了，就用初始假数据
function readStorage(): Employee[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Employee[];
  } catch {
    // 读不到就当没有
  }
  return seedEmployees.map((e) => ({ ...e }));
}

// =====================================================
// employees：全系统共用的员工列表
//
// 排班页、首页、新建排班弹窗都直接 import 这个数组。
// 为了让它们看到员工页的修改，这里不换成新数组，而是“原地替换内容”（splice），
// 这样别的文件拿到的还是同一个数组，下次渲染就是最新数据。
// （这是接后端之前的临时做法；接后端后各页面改成调接口拿员工列表）
// =====================================================
export const employees: Employee[] = readStorage();

function commit(next: Employee[]) {
  employees.splice(0, employees.length, ...next);              // 原地替换
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
  } catch {
    // 存不进去（比如无痕模式）也不影响页面使用，只是刷新后会恢复
  }
}

// 按 id 找员工（每次都查最新列表；被删掉的员工返回 undefined）
export function employeeById(id: number): Employee | undefined {
  return employees.find((e) => e.id === id);
}

// 按 id 取名字。以前的班表里可能还留着已经被删掉的员工，找不到时显示「—」，页面不会报错
export function employeeName(id: number): string {
  return employeeById(id)?.name ?? "—";
}

// =====================================================
// employeeApi：员工的增删改查（模拟后端接口）
//
// 以后对应的后端接口大概是：
//   list   → GET    /api/employees
//   create → POST   /api/employees
//   update → PUT    /api/employees/{id}
//   remove → DELETE /api/employees/{id}
// 现在全部返回 Promise，写法和真正调接口一样（await），
// 换成 fetch 时页面里的代码不用动。
// =====================================================
export const employeeApi = {
  // 查：返回所有员工（复制一份，页面改了也不会影响这里）
  async list(): Promise<Employee[]> {
    return employees.map((e) => ({ ...e }));
  },

  // 增：分配一个新 id（现有最大 id + 1），加到列表最后
  async create(input: EmployeeInput): Promise<Employee> {
    const id = employees.reduce((max, e) => Math.max(max, e.id), 0) + 1;
    const created: Employee = { id, ...input };
    commit([...employees, created]);
    console.log("POST /api/employees", created);              // 方便在控制台看提交了什么
    return { ...created };
  },

  // 改：用新数据整个替换这个人（id 不变）
  async update(id: number, input: EmployeeInput): Promise<Employee> {
    const updated: Employee = { id, ...input };
    commit(employees.map((e) => (e.id === id ? updated : e)));
    console.log(`PUT /api/employees/${id}`, updated);
    return { ...updated };
  },

  // 删：从列表里去掉
  async remove(id: number): Promise<void> {
    commit(employees.filter((e) => e.id !== id));
    console.log(`DELETE /api/employees/${id}`);
  },
};
