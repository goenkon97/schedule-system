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
  let res: Response;
  try {
    // fetch：浏览器自带的发请求函数。底下发生的事：
    //   浏览器和 5173 建立（或复用）一条 TCP 连接 → 把请求行、请求头、body 按 HTTP 格式写过去
    //   → 等回复 → 回复的状态码和头到了，fetch 的 Promise 就完成（body 可能还在路上）
    res = await fetch(path, {
      method,
      // 有 body 才加 Content-Type 头：告诉 Spring「body 是 JSON」，
      // 它才会用 Jackson 把 JSON 转成 EmployeeRequest（不加会返回 415 不支持的格式）
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
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
