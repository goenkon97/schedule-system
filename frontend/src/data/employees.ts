// src/data/employees.ts
// =====================================================
// 员工数据（已经接上 Java 后端）
//
// 以前：员工存在浏览器的 localStorage 里（假装是数据库），初始 24 人写在这个文件里。
// 现在：员工存在 MySQL 里，这个文件通过后端接口读写：
//   GET    /api/employees        → 所有员工（已删除的不返回）
//   POST   /api/employees        → 添加
//   PUT    /api/employees/{id}   → 修改
//   DELETE /api/employees/{id}   → 删除（后端是软删除）
// 初始的 24 人改由后端的 EmployeeSeeder.java 在数据库为空时插进去。
//
// 注意：department / position / status 存的是「英文值」，
// 显示时再用翻译字典转换。数据库里的 enum 列存的也是这些值，前后端必须一模一样。
// =====================================================

import type { Department, EmployeeStatus, EmploymentType, Position } from "../i18n/translations";
// apiFetch：发请求的公共函数（src/api/http.ts），负责 JSON 转换和错误处理
import { apiFetch } from "../api/http";

// 一个员工的数据结构 —— 和后端 EmployeeResponse.java 的字段一一对应
// （后端返回 {"id":2,"name":"Alice Chen",...}，fetch 转成 JS 对象后就是这个样子）
export interface Employee {
  id: number;
  name: string;
  department: Department;
  position: Position;
  phone: string;
  status: EmployeeStatus;
  employment: EmploymentType;   // fullTime 正社员 / partTime 兼职（厨房和店长只能是正社员）
}

// =====================================================
// 每个部门可以选的职位（添加 / 编辑员工时用）
// 厨房：主厨、厨师、洗碗工；服务员：服务员、接待、店长
// 后端 EmployeeService 里也有一份同样的规则（POSITIONS_BY_DEPARTMENT）：
//   前端这份 → 让表单只显示能选的职位（用户体验）
//   后端那份 → 真正的把关（有人绕过页面直接用 curl 发请求也拦得住）
// =====================================================
export const positionsByDepartment: Record<Department, Position[]> = {
  Kitchen: ["Chef", "Cook", "Dishwasher"],
  Hall: ["Server", "Host", "Manager"],
};

// 添加 / 编辑时表单提交的数据：比 Employee 少一个 id（id 由数据库自增分配）
// 正好对应后端的 EmployeeRequest.java（请求体里没有 id）
export type EmployeeInput = Omit<Employee, "id">;

// =====================================================
// employees：全系统共用的员工列表（内存里的一份「副本」）
//
// 排班页、首页、新建排班弹窗都直接 import 这个数组，同步地读（不用 await）。
// 所以 App.tsx 一打开就先调用 loadEmployees() 从后端拿一次，拿到之前不显示页面，
// 这样别的页面读它时一定已经有数据了。
//
// 之后员工页每次增删改成功，都用 commit() 更新这个数组，别的页面下次渲染就是最新数据。
// 不换成新数组，而是「原地替换内容」（splice），因为别的文件 import 拿到的是这个数组本身的引用，
// 换成新数组的话，它们手里还是旧的那个。
// （这是过渡做法：等排班页也接后端以后，各页面会自己调接口拿需要的数据）
// =====================================================
export const employees: Employee[] = [];

// 用新内容原地替换 employees 的全部元素
function commit(next: Employee[]) {
  // splice(从下标 0 开始, 删掉原来全部的个数, ...再放进新的元素)
  employees.splice(0, employees.length, ...next);
}

// 从后端拿全部员工，放进 employees（App.tsx 启动时调用；失败会抛 ApiError，由 App 显示错误）
export async function loadEmployees(): Promise<void> {
  commit(await apiFetch<Employee[]>("/api/employees"));
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
// employeeApi：员工的增删改查 —— 现在是真的调后端了
//
// 方法名、参数、返回值和接后端之前完全一样，
// 所以 Employee.tsx 里调用它的地方一行都不用改（只是多了失败时的提示）。
// 每个方法：先请求后端 → 后端成功了，再同步更新内存里的 employees。
// 后端失败时 apiFetch 会抛出 ApiError，下面的 commit 不会执行，内存数据保持原样。
// =====================================================
export const employeeApi = {
  // 查：GET /api/employees → 后端返回 JSON 数组（id 从小到大，已删除的不在里面）
  async list(): Promise<Employee[]> {
    const list = await apiFetch<Employee[]>("/api/employees");
    commit(list);                                   // 顺便刷新全局副本
    return list.map((e) => ({ ...e }));             // 给页面一份复制，页面改它不影响这里
  },

  // 增：POST /api/employees，body 是表单数据
  // 成功返回 201 + 新员工（带数据库分配的新 id）
  // 失败：手机号重复 409、厨房 / 店长不是正社员 400、字段不合法 400
  async create(input: EmployeeInput): Promise<Employee> {
    const created = await apiFetch<Employee>("/api/employees", { method: "POST", body: input });
    commit([...employees, created]);
    return { ...created };
  },

  // 改：PUT /api/employees/{id}，body 是这个人修改后的全部数据（不是只发改了的字段）
  // 成功返回 200 + 修改后的员工；这个人已被删除 404
  async update(id: number, input: EmployeeInput): Promise<Employee> {
    // `...${id}`：模板字符串，把数字 id 拼进网址里，比如 /api/employees/25
    const updated = await apiFetch<Employee>(`/api/employees/${id}`, { method: "PUT", body: input });
    commit(employees.map((e) => (e.id === id ? updated : e)));
    return { ...updated };
  },

  // 删：DELETE /api/employees/{id}，成功返回 204（没有 body，所以类型是 void）
  async remove(id: number): Promise<void> {
    await apiFetch<void>(`/api/employees/${id}`, { method: "DELETE" });
    commit(employees.filter((e) => e.id !== id));
  },
};
