// =====================================================================
// AuthController.java：登录相关的接口（只负责「接请求、交给 Service、返回结果」）
//
//   POST /api/auth/login   登录（第 3 步，现在）
//   GET  /api/auth/me      我是谁（要带通行证，门卫检查通过后才进得来）
// =====================================================================

package com.goenkon.schedule.auth;

// Valid：触发 LoginRequest 上那些 @NotBlank / @Email 校验，不通过就 400
import jakarta.validation.Valid;
// GetMapping：这个方法处理 GET 请求
import org.springframework.web.bind.annotation.GetMapping;
// PostMapping：这个方法处理 POST 请求
import org.springframework.web.bind.annotation.PostMapping;
// RequestBody：把请求体里的 JSON 变成 Java 对象（Jackson 做的）
import org.springframework.web.bind.annotation.RequestBody;
// RequestAttribute：从「这一个请求」身上取出门卫贴的小纸条
import org.springframework.web.bind.annotation.RequestAttribute;
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
	//   成功 → 200 + {"token": "eyJ...", "user": {"id": 8, "name": "Sophia Liu", "email": "manager@demo.com", "role": "manager", "passwordTemporary": false}}
	//   邮箱或密码错 → 401 + {"message": "邮箱或密码错误。"}
	//   格式不对（没填、不像邮箱）→ 400
	// 为什么登录用 POST 而不是 GET？
	//   GET 的参数在网址里（?password=demo1234），会被浏览器历史、服务器访问日志原样记下来；
	//   POST 的数据在请求体里，不会出现在网址上。密码绝对不能放进网址。
	@PostMapping("/login")
	public LoginResponse login(@Valid @RequestBody LoginRequest request) {
		// Service 已经把「通行证 + 用户信息」装好了，这里直接交出去
		return authService.login(request);
	}

	// GET /api/auth/me：「我是谁」
	//   前端打开页面时，用存着的通行证来问一句：这张通行证是谁的？还有效吗？
	//   有效 → 200 + 这个人的最新信息；无效 / 过期 → 门卫或 Service 返回 401，前端就回到登录页
	//
	// @RequestAttribute(AuthInterceptor.CURRENT_USER) TokenInfo currentUser：
	//   从这个请求身上取出门卫贴的那张纸条（名字叫 "currentUser"），放进参数 currentUser。
	//   能走到这里，说明门卫已经检查过通行证了，纸条一定在。
	@GetMapping("/me")
	public MeResponse me(@RequestAttribute(AuthInterceptor.CURRENT_USER) TokenInfo currentUser) {
		return authService.me(currentUser.accountId());
	}
}
