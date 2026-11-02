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

// 「公共盒子」里装的东西：当前用户 + 登录 / 退出两个函数
// login 返回 Promise：因为以后要等后端回复，是「异步」的，调用时要写 await
export interface AuthContextValue {
  user: AuthUser | null;                                         // 没登录时是 null
  login: (email: string, password: string, remember: boolean) => Promise<LoginResult>;
  logout: () => void;
}

// 创建 Context，默认值 null（真正的值由 AuthProvider 提供）
export const AuthContext = createContext<AuthContextValue | null>(null);

// 自定义 Hook：组件里写 const { user } = useAuth(); 就能拿到登录用户
// 忘了在外层包 AuthProvider 时直接报错，方便发现问题
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
