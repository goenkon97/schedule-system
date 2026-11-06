// src/api/http.ts
// =====================================================
// 所有「调后端接口」的公共工具
//
// 每个接口都要做同样几件事：拼网址、设请求头、把对象转成 JSON、
// 检查成功还是失败、失败时把后端的错误信息拿出来……
// 写在一个地方，以后员工、班表、申请、登录的接口都用它，不用每次重复。
//
// 和后端的约定（common/GlobalExceptionHandler.java）：
//   成功 → 状态码 2xx，body 是数据（或者 204 没有 body）
//   失败 → 状态码 4xx / 5xx，body 是 {"message": "给人看的错误说明"}
// =====================================================

// -----------------------------------------------------
// ApiError：接口失败时抛出的错误
//
// extends Error：继承 JS 自带的 Error 类，所以它也有 message，也能被 try/catch 接住；
// 多加一个 status（HTTP 状态码），页面需要时可以区分「404 找不到」「409 冲突」……
// （对应后端的 ApiException：后端抛 ApiException → 变成 HTTP 回复 → 前端这里再变回 ApiError）
// -----------------------------------------------------
export class ApiError extends Error {
  // 类的字段：每个 ApiError 对象都带一个状态码
  status: number;

  constructor(status: number, message: string) {
    // super(message)：先调用父类 Error 的构造方法，把 message 存好
    super(message);
    this.status = status;
    // name 会显示在控制台的报错里（ApiError: 找不到这个员工），方便认出是接口错误
    this.name = "ApiError";
  }
}

// -----------------------------------------------------
// 通行证（token）放在浏览器里
//
// 登录成功时后端给了一张通行证，之后每个请求都要带上它。
// 它要存在浏览器里，刷新页面才不会丢：
//   勾了「记住我」→ localStorage：关掉浏览器再打开也还在
//   没勾        → sessionStorage：关掉这个标签页就没了
// 读、写都包在 try 里：有的浏览器（无痕模式等）不让存，出错也不能让页面崩掉
// -----------------------------------------------------
const TOKEN_KEY = "schedule-system-token";

// 读出通行证：两个地方都找一下，没有就是 null（没登录）
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// 通行证存在 localStorage（记住我）吗？用户信息要跟着存在同一个地方
export function tokenRemembered(): boolean {
  try {
    return localStorage.getItem(TOKEN_KEY) !== null;
  } catch {
    return false;
  }
}

// 存通行证：remember 决定存在哪个地方
export function saveToken(token: string, remember: boolean) {
  try {
    clearToken();                                             // 先把旧的清掉，免得两个地方各有一张
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
    // 存不进去也能用，只是刷新页面后要重新登录
  }
}

// 删通行证：退出登录、或者后端说通行证失效（401）时调用
export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // 忽略
  }
}

// -----------------------------------------------------
// 「通行证失效了」时要做的事（由 AuthProvider 登记进来）
//
// 为什么不在这里直接把用户退出？因为「当前登录的是谁」放在 AuthProvider 的 state 里，
// 这个文件只是普通的函数，碰不到 React 的 state。
// 所以让 AuthProvider 把「退出登录」这个函数交给这里保管，收到 401 时调用它。
// -----------------------------------------------------
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

// -----------------------------------------------------
// apiFetch：发一个请求，返回后端给的数据
//
// <T>：泛型 —— 调用的人告诉它「返回的数据是什么类型」，
//      比如 apiFetch<Employee[]>("/api/employees")，TypeScript 就知道结果是员工数组。
//      注意：这只是给 TypeScript 看的「承诺」，运行时不会真的检查后端返回的格式。
//
// 参数：
//   path   → 接口路径，比如 "/api/employees"（不写主机和端口，开发时由 Vite 代理转发）
//   method → GET / POST / PUT / DELETE，不传就是 GET
//   body   → 要发给后端的对象（POST / PUT 时用），这里负责转成 JSON 字符串
// -----------------------------------------------------
export async function apiFetch<T>(
  path: string,
  { method = "GET", body }: { method?: string; body?: unknown } = {},
): Promise<T> {
  // 请求头：有通行证就带上；有 body 才加 Content-Type
  // Record<string, string>：一个「键是字符串、值也是字符串」的对象（这里就是请求头的每一行）
  const headers: Record<string, string> = {};
  // 有 body 才加 Content-Type 头：告诉 Spring「body 是 JSON」，
  // 它才会用 Jackson 把 JSON 转成 EmployeeRequest（不加会返回 415 不支持的格式）
  if (body !== undefined) headers["Content-Type"] = "application/json";
  // 带上通行证：请求头里加一行 Authorization: Bearer eyJ...
  // 后端的门卫（AuthInterceptor）就是读这一行来判断「你是谁」
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    // fetch：浏览器自带的发请求函数。底下发生的事：
    //   浏览器和 5173 建立（或复用）一条 TCP 连接 → 把请求行、请求头、body 按 HTTP 格式写过去
    //   → 等回复 → 回复的状态码和头到了，fetch 的 Promise 就完成（body 可能还在路上）
    res = await fetch(path, {
      method,
      headers,
      // JSON.stringify：JS 对象 → JSON 字符串（网络上只能传文字 / 字节，不能直接传对象）
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch 只有在「根本没收到回复」时才会走到这里：后端没开、网断了、代理连不上……
    // （注意：收到 404、500 这种回复不算失败，不会进 catch，下面要自己判断）
    // 状态码写 0：表示「连 HTTP 回复都没有」
    throw new ApiError(0, "连不上后端服务器，请确认后端（8080）和数据库都已经启动。");
  }

  // res.ok：状态码在 200–299 之间就是 true
  if (!res.ok) {
    // 失败：试着读出后端的 {"message": "..."}
    let message = `请求失败（HTTP ${res.status}）`;
    try {
      // res.json()：读完 body，把 JSON 字符串转回 JS 对象（返回 Promise，所以要 await）
      const data = await res.json();
      // 后端按约定给了 message 就用它（比如「这个电话号码已经有其他员工在用了。」）
      if (data && typeof data.message === "string") message = data.message;
    } catch {
      // body 不是 JSON（比如 Vite 代理连不上 8080 时返回的是一段文字），就用上面的默认说明
    }
    // 504 / 502：Vite 代理收到了浏览器的请求，但转发给 8080 时没人接 → 多半是后端没启动
    if (res.status === 502 || res.status === 504) {
      message = "连不上后端服务器，请确认后端（8080）和数据库都已经启动。";
    }
    // 401 = 通行证没带、是假的或者过期了（登录接口本身的 401 是「密码错」，不算在内）
    // → 删掉手上的通行证，通知 AuthProvider 退出登录（页面会自动跳到登录页）
    if (res.status === 401 && path !== "/api/auth/login") {
      clearToken();
      onUnauthorized?.();          // ?.()：登记过才调用，没登记就什么都不做
    }
    throw new ApiError(res.status, message);
  }

  // 204 No Content：成功了，但后端什么都没返回（比如删除）。这时不能调用 res.json()，会报错
  if (res.status === 204) {
    // undefined as T：告诉 TypeScript「这里就是没有数据」（调用的人会用 apiFetch<void>）
    return undefined as T;
  }

  // 成功且有数据：JSON → JS 对象，交给调用的人
  return (await res.json()) as T;
}
