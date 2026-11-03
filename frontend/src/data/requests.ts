// src/data/requests.ts
// =====================================================
// 员工申请（请假 / 换班 / 其他）—— Mock 数据 + 模拟接口
//
// 业务规则（docs/business-rules.md 6.7）：
// - 员工在「我的信息」页提交申请；申请只是“通知店长”，系统里不做审批
// - 店长收到后和员工当面沟通，谈好后店长自己去排班页调班
// - 店长沟通完点「标记为已沟通」；员工这边就会看到“店长已处理”
// - 还没处理的申请，员工可以自己撤回
//
// 现在存在浏览器 localStorage 里；以后对应的后端接口：
//   GET    /api/requests?employeeId=2   员工看自己的
//   GET    /api/requests                店长看全部
//   POST   /api/requests                提交
//   PATCH  /api/requests/{id}           店长改状态
//   DELETE /api/requests/{id}           员工撤回
// =====================================================

// 申请类型：请假 / 换班 / 其他
export type RequestType = "leave" | "swap" | "other";

// 状态：pending 等店长处理；done 店长已经当面沟通过
export type RequestStatus = "pending" | "done";

export interface StaffRequest {
  id: number;
  employeeId: number;        // 谁提交的（对应员工 id）
  type: RequestType;
  startDate: string;         // "2026-12-05"
  endDate: string;           // 只有一天时和 startDate 一样
  note: string;              // 备注：原因、想和谁换等，员工自由写
  status: RequestStatus;
  createdAt: string;         // 提交时间（ISO 字符串）
}

// 提交时填的内容：id、状态、提交时间由“服务器”补上
export type RequestInput = Pick<StaffRequest, "employeeId" | "type" | "startDate" | "endDate" | "note">;

const STORAGE_KEY = "schedule-system-requests";

// 第一次打开时放两条示例申请，店长账号一登录就能看到效果
function seed(): StaffRequest[] {
  const now = new Date();
  const d = (offset: number) => {
    const x = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  };
  return [
    { id: 1, employeeId: 3, type: "leave", startDate: d(10), endDate: d(11), note: "Attending a family wedding back home.", status: "pending", createdAt: new Date(now.getTime() - 3 * 3600_000).toISOString() },
    { id: 2, employeeId: 6, type: "other", startDate: d(5), endDate: d(5), note: "I have a school exam that day, so I can only work the evening shift.", status: "done", createdAt: new Date(now.getTime() - 26 * 3600_000).toISOString() },
  ];
}

function read(): StaffRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StaffRequest[];
  } catch {
    // 读不到就用示例数据
  }
  const s = seed();
  write(s);
  return s;
}

function write(list: StaffRequest[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // 存不进去也不影响当前页面
  }
  // 通知正在“订阅”的组件（比如侧边栏的未处理数量）重新读一次
  listeners.forEach((fn) => fn());
}

// ---------------------------------------------------
// 订阅：侧边栏的红色数字要跟着变，所以数据一改就通知它
// （以后接后端，一般改成定时请求接口，或者用 WebSocket 推送）
// ---------------------------------------------------
const listeners = new Set<() => void>();

export function subscribeRequests(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// 店长还没处理的申请有几条
export function pendingRequestCount(): number {
  return read().filter((r) => r.status === "pending").length;
}

// 新的在前面
const newestFirst = (a: StaffRequest, b: StaffRequest) => b.createdAt.localeCompare(a.createdAt);

export const requestApi = {
  // 员工：只看自己的
  async listMine(employeeId: number): Promise<StaffRequest[]> {
    return read().filter((r) => r.employeeId === employeeId).sort(newestFirst);
  },

  // 店长：看全部
  async listAll(): Promise<StaffRequest[]> {
    return read().sort(newestFirst);
  },

  // 员工：提交
  async create(input: RequestInput): Promise<StaffRequest> {
    const list = read();
    const id = list.reduce((max, r) => Math.max(max, r.id), 0) + 1;
    const created: StaffRequest = { ...input, id, status: "pending", createdAt: new Date().toISOString() };
    write([...list, created]);
    console.log("POST /api/requests", created);
    return created;
  },

  // 店长：标记已沟通 / 改回未处理
  async setStatus(id: number, status: RequestStatus): Promise<void> {
    write(read().map((r) => (r.id === id ? { ...r, status } : r)));
    console.log(`PATCH /api/requests/${id}`, { status });
  },

  // 员工：撤回还没处理的申请
  async cancel(id: number): Promise<void> {
    write(read().filter((r) => r.id !== id));
    console.log(`DELETE /api/requests/${id}`);
  },
};
