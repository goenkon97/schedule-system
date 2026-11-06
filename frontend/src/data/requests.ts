// src/data/requests.ts
// =====================================================
// 员工申请（请假 / 换班 / 其他）—— 调用真正的后端接口
//
// 业务规则（docs/business-rules.md 6.7）：
// - 员工在「我的信息」页提交申请；申请只是“通知店长”，系统里不做审批
// - 店长收到后和员工当面沟通，谈好后店长自己去排班页调班
// - 店长沟通完点「标记为已沟通」；员工这边就会看到“店长已处理”
// - 还没处理的申请，员工可以自己撤回
//
// 对应的后端接口（backend/.../request/StaffRequestController.java）：
//   GET    /api/requests/mine          员工看自己的（「我是谁」由后端从通行证里读，前端不传 id）
//   GET    /api/requests               店长看全部（员工调用会得到 403）
//   POST   /api/requests               提交
//   PATCH  /api/requests/{id}/status   店长改状态
//   DELETE /api/requests/{id}          员工撤回（只能撤回自己的、还没处理的）
//
// 以前存在浏览器 localStorage 里，现在数据都在 MySQL 的 staff_requests 表
// =====================================================

import { apiFetch } from "../api/http";

// 申请类型：请假 / 换班 / 其他（和后端 RequestType.java 一样）
export type RequestType = "leave" | "swap" | "other";

// 状态：pending 等店长处理；done 店长已经当面沟通过（和后端 RequestStatus.java 一样）
export type RequestStatus = "pending" | "done";

// 一条申请 —— 和后端 StaffRequestResponse.java 的字段一一对应
export interface StaffRequest {
  id: number;
  employeeId: number;        // 谁提交的（对应员工 id）
  employeeName: string;      // 提交人的名字（后端一起查好返回的）
  type: RequestType;
  // 日期：请假 = 一天或一段；换班 = 想换的那一天（开始 = 结束）；其他 = 没有日期（null）
  startDate: string | null;  // "2026-12-05"
  endDate: string | null;    // 只有一天时和 startDate 一样
  note: string;              // 备注：原因、想和谁换等，员工自由写
  status: RequestStatus;
  createdAt: string;         // 提交时间（ISO 字符串，比如 "2026-11-06T11:52:00Z"）
}

// 提交时填的内容 —— 和后端 StaffRequestInput.java 一样。
// 没有 employeeId：「谁提交的」后端从通行证里拿，前端传了也没用
export type RequestInput = Pick<StaffRequest, "type" | "startDate" | "endDate" | "note">;

// ---------------------------------------------------
// 订阅：申请数据一变（提交 / 撤回 / 改状态），通知正在显示申请的组件重新拿一次
//   例如：店长在「员工申请」页点了已沟通 → 首页通知、侧边栏红色数字都要跟着变
// ---------------------------------------------------
const listeners = new Set<() => void>();

export function subscribeRequests(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify() {
  listeners.forEach((fn) => fn());
}

// ---------------------------------------------------
// 未处理数量（侧边栏、标签上的红色数字）
//
// 这些地方是「同步地」读数字的（不等网络），所以在这里记一份最近一次的结果。
// 每次店长拿全部申请（listAll）时顺便更新；数字变了才通知，避免订阅的组件来回重复请求。
// 员工账号不能调 listAll（403），对员工来说这个数字一直是 0，也用不到。
// ---------------------------------------------------
let pendingCache = 0;

export function pendingRequestCount(): number {
  return pendingCache;
}

function updatePendingCache(list: StaffRequest[]) {
  const count = list.filter((r) => r.status === "pending").length;
  if (count !== pendingCache) {
    pendingCache = count;
    notify();
  }
}

// 店长用：重新拿一次全部申请，并通知所有订阅的组件刷新
// （App.tsx 在店长登录后调用一次，之后每分钟调用一次 —— 员工在别的电脑上提交了，店长这边也能看到）
export async function refreshRequests(): Promise<void> {
  await requestApi.listAll();
  notify();
}

// 退出登录时清空（不然换成员工账号登录，还会看到上一个店长的数字）
export function resetRequests() {
  pendingCache = 0;
  notify();
}

// 失败时 apiFetch 会抛出 ApiError（message 是后端返回的中文说明），调用的页面用 try / catch 显示出来
export const requestApi = {
  // 员工：只看自己的（后端已经按提交时间倒序排好）
  async listMine(): Promise<StaffRequest[]> {
    return apiFetch<StaffRequest[]>("/api/requests/mine");
  },

  // 店长：看全部（顺便更新未处理数量）
  async listAll(): Promise<StaffRequest[]> {
    const list = await apiFetch<StaffRequest[]>("/api/requests");
    updatePendingCache(list);
    return list;
  },

  // 员工：提交
  async create(input: RequestInput): Promise<StaffRequest> {
    const created = await apiFetch<StaffRequest>("/api/requests", { method: "POST", body: input });
    notify();
    return created;
  },

  // 店长：标记已沟通 / 改回未处理
  async setStatus(id: number, status: RequestStatus): Promise<void> {
    await apiFetch<StaffRequest>(`/api/requests/${id}/status`, { method: "PATCH", body: { status } });
    notify();
  },

  // 员工：撤回还没处理的申请（成功时后端返回 204，没有内容）
  async cancel(id: number): Promise<void> {
    await apiFetch<void>(`/api/requests/${id}`, { method: "DELETE" });
    notify();
  },
};
