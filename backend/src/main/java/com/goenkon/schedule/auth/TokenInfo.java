// =====================================================================
// TokenInfo.java：从通行证（JWT）里读出来的信息
//
// 通行证上写着三样东西：账号 id、员工 id、角色。
// JwtService 检查完通行证、确认章是真的以后，把这三样装进一个 TokenInfo 交出去，
// 下一步的「门卫」（拦截器）就靠它知道「这个请求是谁发的、是不是店长」。
//
// 为什么要单独装一个 record，而不是直接把那一长串 token 传来传去？
//   token 只是一串字符，每次用都要重新解析、重新检查签名；
//   解析一次、装进 TokenInfo，后面的代码直接 info.role() 就行，又快又清楚。
// =====================================================================

package com.goenkon.schedule.auth;

// record：只装数据的类（构造方法、读取方法由 Java 自动生成）
//   accountId  → 账号 id（accounts 表）
//   employeeId → 员工 id（employees 表）：前端、班表、申请用的都是它
//   role       → manager / staff：门卫判断权限用
public record TokenInfo(Long accountId, Long employeeId, Role role) {
}
