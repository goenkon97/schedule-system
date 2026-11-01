// src/auth/AuthContext.ts
// =====================================================
// 登录状态的「全局盒子」（和语言的 LanguageContext 是同一种写法）
// 任何组件里写 const { user, login, logout } = useAuth(); 就能拿到
// =====================================================

import { createContext, useContext } from "react";

// 登录后的用户信息（以后由后端登录接口返回）
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "manager" | "staff";       // 店长 / 员工：决定登录后能做什么
}

// 登录的结果：成功，或者失败的原因（原因用 key，页面再翻译成当前语言）
export type LoginResult = { ok: true } | { ok: false; error: "invalid" };

export interface AuthContextValue {
  user: AuthUser | null;                                         // 没登录时是 null
  login: (email: string, password: string, remember: boolean) => Promise<LoginResult>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
