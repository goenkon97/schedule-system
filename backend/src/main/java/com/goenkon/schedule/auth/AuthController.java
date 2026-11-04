// =====================================================================
// AuthController.java：登录相关的接口（只负责「接请求、交给 Service、返回结果」）
//
//   POST /api/auth/login   登录（第 3 步，现在）
//   GET  /api/auth/me      我是谁（第 5 步，以后加）
// =====================================================================

package com.goenkon.schedule.auth;

// Valid：触发 LoginRequest 上那些 @NotBlank / @Email 校验，不通过就 400
import jakarta.validation.Valid;
// PostMapping：这个方法处理 POST 请求
import org.springframework.web.bind.annotation.PostMapping;
// RequestBody：把请求体里的 JSON 变成 Java 对象（Jackson 做的）
import org.springframework.web.bind.annotation.RequestBody;
// RequestMapping：类上的「网址前缀」，下面每个方法的网址都接在 /api/auth 后面
import org.springframework.web.bind.annotation.RequestMapping;
// RestController：这是一个接口类，方法的返回值自动变成 JSON
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;

	// 构造方法注入：Spring 启动时按类型找到 AuthService 对象传进来
	public AuthController(AuthService authService) {
		this.authService = authService;
	}

	// POST /api/auth/login
	//   成功 → 200 + {"user": {"id": 8, "name": "Sophia Liu", "email": "manager@demo.com", "role": "manager", "passwordTemporary": false}}
	//   邮箱或密码错 → 401 + {"message": "邮箱或密码错误。"}
	//   格式不对（没填、不像邮箱）→ 400
	// 为什么登录用 POST 而不是 GET？
	//   GET 的参数在网址里（?password=demo1234），会被浏览器历史、服务器访问日志原样记下来；
	//   POST 的数据在请求体里，不会出现在网址上。密码绝对不能放进网址。
	@PostMapping("/login")
	public LoginResponse login(@Valid @RequestBody LoginRequest request) {
		return new LoginResponse(authService.login(request));
	}
}
