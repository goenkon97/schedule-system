// src/auth/AuthProvider.tsx
// =====================================================
// 登录状态的 Provider —— 已经接上 Java 后端
//
// 登录：POST /api/auth/login → 后端返回 { token, user }
//   token（通行证）存进浏览器，之后每个请求由 apiFetch 自动带上
//   user（这是谁）放进 state，所有页面都能用 useAuth() 拿到
// 打开页面时：手上有通行证，就用 GET /api/auth/me 问后端「这张通行证还有效吗？是谁的？」
// 任何请求收到 401（通行证失效）：apiFetch 会通知这里，自动退出登录 → 回到登录页
// =====================================================

import { useEffect, useState, type ReactNode } from "react";
import { AuthContext, type AuthUser, type LoginResult } from "./AuthContext";
// apiFetch：发请求；getToken / saveToken / clearToken / tokenRemembered：读、存、删通行证，看它存在哪；
// setUnauthorizedHandler：登记「通行证失效时要做什么」；ApiError：接口失败时的错误
import {
  ApiError,
  apiFetch,
  clearToken,
  getToken,
  saveToken,
  setUnauthorizedHandler,
  tokenRemembered,
} from "../api/http";

// 用户信息也存一份在浏览器里：刷新页面时可以马上显示（不用等 /me 回来）
const USER_KEY = "schedule-system-user";

// 读出上次保存的用户：前提是还有通行证（没有通行证，用户信息也不作数）
function loadUser(): AuthUser | null {
  if (!getToken()) return null;
  try {
    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

// 存用户：和通行证存在同一个地方（记住我 → localStorage，否则 sessionStorage）
function saveUser(u: AuthUser) {
  try {
    (tokenRemembered() ? localStorage : sessionStorage).setItem(USER_KEY, JSON.stringify(u));
  } catch {
    // 存不进去也没关系
  }
}

// 删用户：两个地方都删
function clearUser() {
  try {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
  } catch {
    // 忽略
  }
}

// 登录接口返回的数据（对应后端 LoginResponse.java）
interface LoginResponse {
  token: string;
  user: AuthUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // 当前登录的用户；第一次渲染时从浏览器存储里恢复（刷新页面不用重新登录）
  const [user, setUser] = useState<AuthUser | null>(loadUser);

  // ---------------------------------------------------
  // 打开页面时做两件事（[] = 只在第一次显示时做一次）
  // ---------------------------------------------------
  useEffect(() => {
    // ① 把「清掉登录状态」交给 apiFetch 保管：以后任何请求收到 401，它就调用这个函数
    //    （apiFetch 自己已经删过通行证了，这里只要清掉用户；user 变成 null，App 就会跳到登录页）
    setUnauthorizedHandler(() => {
      clearUser();
      setUser(null);
    });

    // ② 手上有通行证：问后端「我是谁」，拿到最新的信息（名字被改过、角色变过也能更新）
    //    通行证已经失效的话，后端返回 401 → apiFetch 自动调用 ① 登记的函数 → 退出登录
    if (getToken()) {
      apiFetch<AuthUser>("/api/auth/me")
        .then((u) => {
          saveUser(u);
          setUser(u);
        })
        .catch(() => {
          // 401 已经由 ① 处理；连不上后端时先不退出，等后端恢复（App 会显示「连不上」的画面）
        });
    }

    // 组件消失时，把登记的函数撤掉（返回的这个函数由 React 在卸载时调用）
    return () => setUnauthorizedHandler(null);
  }, []);

  // ---------------------------------------------------
  // 登录：把邮箱和密码发给后端，成功就存通行证和用户
  // remember：登录页「记住我」有没有勾
  // ---------------------------------------------------
  const login = async (email: string, password: string, remember: boolean): Promise<LoginResult> => {
    try {
      // POST /api/auth/login：body 是 { email, password }，apiFetch 负责转成 JSON
      const res = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });
      saveToken(res.token, remember);     // 通行证存进浏览器，之后 apiFetch 每次自动带上
      saveUser(res.user);
      setUser(res.user);                  // 更新 state → 所有用 useAuth() 的组件重新渲染，显示成已登录
      return { ok: true };
    } catch (err) {
      // 401 = 邮箱或密码错；400 = 格式不对（比如不像邮箱）→ 都当成「邮箱或密码错误」
      if (err instanceof ApiError && (err.status === 401 || err.status === 400)) {
        return { ok: false, error: "invalid" };
      }
      // 其他情况：后端没开、网络断了、服务器出错
      return { ok: false, error: "network" };
    }
  };

  // ---------------------------------------------------
  // 退出：删通行证、删用户，state 变回 null → App 看到没登录，跳回登录页
  // ---------------------------------------------------
  const logout = () => {
    clearToken();
    clearUser();
    setUser(null);
  };

  // 把 user / login / logout 放进「公共盒子」，App 里所有组件都能取用
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}
