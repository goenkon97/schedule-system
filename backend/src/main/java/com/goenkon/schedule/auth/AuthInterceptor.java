// =====================================================================
// AuthInterceptor.java：门卫（拦截器）—— 每个请求进 Controller 之前，先过它这一关
//
// 大白话：
//   之前登录接口能发通行证了，但其他接口根本不看通行证：不登录也能查员工、删员工。
//   门卫站在所有接口的门口，每个请求进来都先做两道检查：
//     ① 你是谁？—— 有没有带通行证？章是真的吗？过期了吗？  不行 → 401
//     ② 你能做这件事吗？—— 这个接口贴了 @ManagerOnly，你是店长吗？  不是 → 403
//   都通过，就在请求上贴一张「这是谁」的小纸条，放行；后面的 Controller 可以读这张纸条。
//
// 「拦截器」（Interceptor）是 Spring MVC 提供的一个位置：
//   请求被分派员（DispatcherServlet）找到要交给哪个 Controller 方法之后、真正调用那个方法之前，
//   Spring 会先调用拦截器的 preHandle。preHandle 返回 true 才继续，抛异常就到此为止。
//   哪些网址要经过这个门卫，在 common/WebConfig.java 里设置。
//
// 通行证放在请求的哪里？—— 请求头（header）里，固定的格式：
//   Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOi....
//   「Authorization」是 HTTP 规定的、专门放身份凭证的请求头；
//   「Bearer」的意思是「持有者」：谁拿着这张通行证，就当他是通行证上写的那个人（所以 token 不能被偷）。
// =====================================================================

package com.goenkon.schedule.auth;

// HttpServletRequest：一个请求的全部信息（网址、请求头、请求体……），Tomcat 收到请求时做好的对象
import jakarta.servlet.http.HttpServletRequest;
// HttpServletResponse：要发回去的回复（这里用不到，但 preHandle 规定了必须有这个参数）
import jakarta.servlet.http.HttpServletResponse;

// Component：让 Spring 启动时 new 一个门卫放进仓库，WebConfig 再把它安排到门口
import org.springframework.stereotype.Component;
// HandlerMethod：「这个请求要交给哪个 Controller 的哪个方法」的说明，能从它身上看到方法上贴了什么标签
import org.springframework.web.method.HandlerMethod;
// HandlerInterceptor：Spring 规定的「门卫」接口（一份招聘启事），实现它的 preHandle 方法就能当门卫
import org.springframework.web.servlet.HandlerInterceptor;

import com.goenkon.schedule.common.ApiException;

@Component
// implements HandlerInterceptor：签下「门卫」这份清单
public class AuthInterceptor implements HandlerInterceptor {

	// 小纸条的名字。门卫用这个名字把「这是谁」贴在请求上，Controller 用同一个名字去读。
	// public static final：公开的常量，别的类写 AuthInterceptor.CURRENT_USER 就能用，避免两边名字拼得不一样
	public static final String CURRENT_USER = "currentUser";

	// 请求头里通行证前面固定的那段文字（注意最后有一个空格）
	private static final String BEARER = "Bearer ";

	// 检查通行证要用到 JwtService（办证处）：构造方法注入，Spring 按类型塞进来
	private final JwtService jwtService;

	public AuthInterceptor(JwtService jwtService) {
		this.jwtService = jwtService;
	}

	// preHandle：「进门之前」—— Spring 在调用 Controller 方法之前，先调用这里
	//   返回 true  → 放行，继续去 Controller
	//   抛出异常   → 不放行；异常会被 GlobalExceptionHandler 接住，变成 {"message": ...} 返回给前端
	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
		// handler：这个请求要交给谁处理。
		// 只有交给 Controller 方法的请求才需要检查（instanceof：「它是不是 HandlerMethod 这种类型」）。
		// 「handler instanceof HandlerMethod method」是 Java 16+ 的写法：判断是的话，顺便把它当成 HandlerMethod 存进变量 method
		if (!(handler instanceof HandlerMethod method)) {
			return true;
		}

		// ---------- 第 ① 道：你是谁？ ----------
		// 从请求头里取出 Authorization 这一行，比如 "Bearer eyJhbGci..."；没带就是 null
		String header = request.getHeader("Authorization");
		// 没带，或者格式不对（不是以 "Bearer " 开头）→ 401
		if (header == null || !header.startsWith(BEARER)) {
			throw ApiException.unauthorized("请先登录。");
		}
		// substring(BEARER.length())：从第 7 个字符开始截到最后，去掉前面的 "Bearer "，剩下的就是通行证本身
		String token = header.substring(BEARER.length());
		// 交给办证处检查：章是真的、没过期 → 得到 TokenInfo（这是谁）；不对 → parse 里面直接抛 401
		TokenInfo currentUser = jwtService.parse(token);

		// ---------- 第 ② 道：你能做这件事吗？ ----------
		// method.hasMethodAnnotation(ManagerOnly.class)：要去的那个 Controller 方法上，有没有贴 @ManagerOnly？
		// 贴了，而且通行证上的角色不是店长 → 403（我们知道你是谁，但你没有这个权限）
		if (method.hasMethodAnnotation(ManagerOnly.class) && currentUser.role() != Role.manager) {
			throw ApiException.forbidden("只有店长可以进行这个操作。");
		}

		// ---------- 都通过：贴纸条，放行 ----------
		// setAttribute(名字, 值)：在「这一个请求」身上挂一样东西。
		//   它只跟着这一个请求走：请求结束，纸条就没了；别人的请求看不到。
		//   Controller 里用 @RequestAttribute(AuthInterceptor.CURRENT_USER) 就能把它取出来。
		request.setAttribute(CURRENT_USER, currentUser);
		return true;
	}
}
