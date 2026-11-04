// =====================================================================
// LoginResponse.java：登录成功后返回给前端的数据
//
// 现在（第 3 步）只有 user：先确认「邮箱密码对了就能登录」这件事本身是对的。
// 下一步（第 4 步）会在这里加一个 token 字段（JWT 通行证）：
//   {"token": "eyJhbGciOi...", "user": {...}}
// 前端拿到 token 以后，之后每个请求都带上它，后端就知道「这个请求是谁发的」。
// =====================================================================

package com.goenkon.schedule.auth;

// 一个字段 user，类型是 MeResponse —— 转成 JSON 就是 {"user": {"id": 8, "name": "Sophia Liu", ...}}
public record LoginResponse(MeResponse user) {
}
