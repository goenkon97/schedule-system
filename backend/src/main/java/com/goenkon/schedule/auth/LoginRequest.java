// =====================================================================
// LoginRequest.java：登录时前端发来的数据（请求 DTO）
//
// 前端发：POST /api/auth/login
//   {"email": "manager@demo.com", "password": "demo1234"}
// Spring 用 Jackson 把这段 JSON 按字段名变成一个 LoginRequest 对象，
// 再按下面的注解检查格式（Controller 参数上的 @Valid 触发），格式不对直接 400，进不了 Service。
//
// 注意：这里只检查「格式」（有没有填、像不像邮箱），
//       「邮箱和密码对不对得上」是业务判断，在 AuthService 里做。
// =====================================================================

package com.goenkon.schedule.auth;

// Email：检查字符串是不是邮箱的格式（有 @、@ 后面有域名……）
import jakarta.validation.constraints.Email;
// NotBlank：不能是 null、不能是空字符串、也不能只有空格
import jakarta.validation.constraints.NotBlank;
// Size：字符串长度的上下限
import jakarta.validation.constraints.Size;

// record：只装数据的类。Java 自动生成构造方法、email() / password() 这两个读取方法、equals、toString
// 一个 record 的字段一旦创建就不能改（不可变），很适合「请求进来的数据」
public record LoginRequest(
		// 邮箱：必填、要像邮箱、最长 100（和 accounts.email 的列长度一致）
		@NotBlank(message = "请输入邮箱。")
		@Email(message = "邮箱格式不正确。")
		@Size(max = 100, message = "邮箱太长了。")
		String email,

		// 密码：必填。最长 72：BCrypt 只会用密码的前 72 个字节，再长也没意义，
		//   同时也防止有人故意发一个几 MB 的「密码」让服务器算很久（一种拖垮服务器的攻击）
		@NotBlank(message = "请输入密码。")
		@Size(max = 72, message = "密码太长了。")
		String password) {

	// 注意：record 自动生成的 toString() 会把所有字段都打印出来 —— 包括密码原文！
	// 万一哪天有人写了 log.info("login {}", request)，密码就进了日志。
	// 所以这里重写 toString，把密码换成 ***（这是工作中很常见的安全习惯）
	@Override
	public String toString() {
		return "LoginRequest[email=" + email + ", password=***]";
	}
}
