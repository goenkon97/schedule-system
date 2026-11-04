// =====================================================================
// MeResponse.java：「当前登录的是谁」—— 返回给前端的用户信息（响应 DTO）
//
// 登录成功时返回它；以后的 GET /api/auth/me（「我是谁」）也返回它。
// 字段和前端 src/auth/AuthContext.ts 里的 AuthUser 类型对应：
//   { id, name, email, role }，再多一个 passwordTemporary（以后用来显示「请修改密码」）
//
// 这里的 id 是「员工 id」（不是账号 id）：
//   前端到处用员工 id（班表里记的是员工 id、MyProfile 按员工 id 找自己的信息），
//   账号 id 只在后端内部用，前端不需要知道。
//
// 绝对不放进来的字段：passwordHash。DTO 只挑「前端需要、可以给」的字段，这就是不直接返回 Entity 的原因。
// =====================================================================

package com.goenkon.schedule.auth;

public record MeResponse(Long id, String name, String email, Role role, boolean passwordTemporary) {

	// 从 Account Entity 转成 DTO。
	// account.getEmployee() 是懒加载的「替身」，调用 getId() / getName() 时才会去查 employees 表，
	// 所以这个方法必须在 Service 的事务里调用（AuthService 里就是这样用的），否则会报 LazyInitializationException。
	public static MeResponse from(Account account) {
		return new MeResponse(
				account.getEmployee().getId(),      // 员工 id
				account.getEmployee().getName(),    // 员工名字（这一行会触发 SELECT ... FROM employees）
				account.getEmail(),
				account.getRole(),
				account.isPasswordTemporary());
	}
}
