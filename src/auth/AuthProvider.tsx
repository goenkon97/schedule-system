// src/auth/AuthProvider.tsx
// =====================================================
// 登录状态的 Provider —— 现在是「假登录」（Mock）
//
// 以后接后端时，只需要把 login 里的这段 mock 换成：
//   const res = await fetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })
// 页面组件（登录页、顶部栏）一行都不用改。
// =====================================================

import { useState, type ReactNode } from "react";
import { AuthContext, type AuthUser, type LoginResult } from "./AuthContext";

// 演示账号：密码都是 demo1234（只在前端演示用，真实密码以后存在后端数据库里，而且是加密后的）
export const DEMO_ACCOUNTS = [
  { email: "manager@demo.com", password: "demo1234", user: { id: 8, name: "Sophia Liu", email: "manager@demo.com", role: "manager" } },
  { email: "staff@demo.com",   password: "demo1234", user: { id: 2, name: "Alice Chen", email: "staff@demo.com",   role: "staff" } },
] as const;

const STORAGE_KEY = "schedule-system-user";

// 刷新页面后恢复登录状态：勾了「记住我」存在 localStorage（关浏览器也在），没勾存在 sessionStorage（关掉标签页就没了）
function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // 当前登录的用户；第一次渲染时从浏览器存储里恢复（刷新页面不用重新登录）
  const [user, setUser] = useState<AuthUser | null>(loadUser);

  // ---------------------------------------------------
  // 登录：检查邮箱和密码 → 成功就保存用户，失败返回原因
  // async：函数里可以用 await 等待（以后等后端回复）
  // remember：登录页「记住我」有没有勾
  // ---------------------------------------------------
  const login = async (email: string, password: string, remember: boolean): Promise<LoginResult> => {
    // 模拟网络请求的等待时间（让按钮的「登录中」状态看得见）
    await new Promise((r) => setTimeout(r, 700));

    // 在演示账号里找：邮箱去掉前后空格、转小写后比较，密码要完全一样
    const hit = DEMO_ACCOUNTS.find((a) => a.email === email.trim().toLowerCase() && a.password === password);
    if (!hit) return { ok: false, error: "invalid" };

    // { ...hit.user }：复制一份用户信息（不直接用原对象，避免以后被意外修改）
    const u: AuthUser = { ...hit.user };
    try {
      (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(u));
    } catch {
      // 浏览器禁止存储时也能登录，只是刷新后要重新登
    }
    // 更新 state → 所有用 useAuth() 的组件（顶部栏、各页面）重新渲染，显示成已登录
    setUser(u);
    return { ok: true };
  };

  // ---------------------------------------------------
  // 退出：删掉两个地方保存的用户，state 变回 null
  // （以后用 token 登录时，就是把 token 删掉）
  // ---------------------------------------------------
  const logout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // 忽略
    }
    setUser(null);
  };

  // 把 user / login / logout 放进「公共盒子」，App 里所有组件都能取用
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}
