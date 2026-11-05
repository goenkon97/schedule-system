// =====================================================================
// LoginResponse.java：登录成功后返回给前端的数据
//
// 转成 JSON：
//   {"token": "eyJhbGciOi...", "user": {"id": 8, "name": "Sophia Liu", ...}}
//   token → JWT 通行证（JwtService 发的）。前端存起来，之后每个请求都带上它，后端就知道「这个请求是谁发的」。
//   user  → 这个人是谁。前端马上就要显示名字、判断是不是店长，不用再专门问一次。
// =====================================================================

package com.goenkon.schedule.auth;

// 两个字段：token（一长串字符）和 user（MeResponse 那张表）
public record LoginResponse(String token, MeResponse user) {
}
