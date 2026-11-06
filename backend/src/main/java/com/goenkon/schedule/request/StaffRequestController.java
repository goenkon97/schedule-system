// =====================================================================
// StaffRequestController.java：员工申请的 5 个接口（「前台」：只管收请求、交给 Service、把结果送回去）
//
//   GET    /api/requests/mine         员工看自己的申请        登录了就能用
//   GET    /api/requests              店长看所有申请          @ManagerOnly
//   POST   /api/requests              员工提交申请            登录了就能用
//   PATCH  /api/requests/{id}/status  店长改处理状态          @ManagerOnly
//   DELETE /api/requests/{id}         员工撤回自己的申请      登录了就能用（「是不是自己的」在 Service 里查）
//
// 所有接口都在 /api/** 下面，所以都会先经过门卫 AuthInterceptor：
//   没带通行证 → 401；贴了 @ManagerOnly 但不是店长 → 403；
//   通过了 → 门卫把「你是谁」（TokenInfo）写在纸条上（request.setAttribute），下面用 @RequestAttribute 读出来
// =====================================================================

package com.goenkon.schedule.request;

// List：列表
import java.util.List;

// HttpStatus：HTTP 状态码的枚举（CREATED = 201、NO_CONTENT = 204）
import org.springframework.http.HttpStatus;
// 下面这些都是 Spring MVC 的注解：
// DeleteMapping / GetMapping / PatchMapping / PostMapping：把方法绑定到 DELETE / GET / PATCH / POST 请求
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
// 【新】PatchMapping：PATCH = 「只改一部分」（这里只改状态这一个字段）；PUT 一般是「整个换掉」
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
// PathVariable：从网址里取值（/api/requests/5 里的 5）
import org.springframework.web.bind.annotation.PathVariable;
// RequestAttribute：读门卫写在这次请求上的「纸条」
import org.springframework.web.bind.annotation.RequestAttribute;
// RequestBody：把请求体里的 JSON 变成 Java 对象（DTO）
import org.springframework.web.bind.annotation.RequestBody;
// RequestMapping：整个类的网址前缀
import org.springframework.web.bind.annotation.RequestMapping;
// ResponseStatus：成功时返回的状态码（不写就是 200）
import org.springframework.web.bind.annotation.ResponseStatus;
// RestController：这个类是接口类，方法的返回值自动转成 JSON
import org.springframework.web.bind.annotation.RestController;

// 门卫（用它的常量 CURRENT_USER = 纸条的名字）、「只有店长」贴纸、纸条上的内容 TokenInfo —— 都在 auth 包里
import com.goenkon.schedule.auth.AuthInterceptor;
import com.goenkon.schedule.auth.ManagerOnly;
import com.goenkon.schedule.auth.TokenInfo;

// Valid：让 Spring 按 DTO 上的注解（@NotNull、@NotBlank、@Size）检查，不通过 → 400
import jakarta.validation.Valid;

@RestController
// 所有方法的网址都以 /api/requests 开头
@RequestMapping("/api/requests")
public class StaffRequestController {

	// 唯一的依赖：Service。Spring 按类型找到 StaffRequestService，通过构造方法传进来
	private final StaffRequestService requestService;

	public StaffRequestController(StaffRequestService requestService) {
		this.requestService = requestService;
	}

	// ---------- GET /api/requests/mine：员工看自己的 ----------
	// 为什么不用 /api/requests?employeeId=2？
	//   那样员工把 2 改成 3 就能看别人的。用 /mine，「我是谁」只从通行证里拿，改不了
	@GetMapping("/mine")
	public List<StaffRequestResponse> listMine(@RequestAttribute(AuthInterceptor.CURRENT_USER) TokenInfo currentUser) {
		// currentUser.employeeId()：通行证上写的员工 id
		return requestService.listMine(currentUser.employeeId());
	}

	// ---------- GET /api/requests：店长看全部 ----------
	@GetMapping
	@ManagerOnly
	public List<StaffRequestResponse> listAll() {
		return requestService.listAll();
	}

	// ---------- POST /api/requests：员工提交 ----------
	@PostMapping
	// 201 Created：新建成功（比 200 更准确，和添加员工一样）
	@ResponseStatus(HttpStatus.CREATED)
	public StaffRequestResponse create(
			// 「谁提交的」：从纸条上拿
			@RequestAttribute(AuthInterceptor.CURRENT_USER) TokenInfo currentUser,
			// 「提交了什么」：从 JSON 里拿，先按 StaffRequestInput 上的注解检查
			@Valid @RequestBody StaffRequestInput input) {
		return requestService.create(currentUser.employeeId(), input);
	}

	// ---------- PATCH /api/requests/{id}/status：店长改状态 ----------
	// {id}：网址里的这一段是变量，@PathVariable Long id 把它取出来（"5" → 5L）
	@PatchMapping("/{id}/status")
	@ManagerOnly
	public StaffRequestResponse changeStatus(@PathVariable Long id, @Valid @RequestBody StatusInput input) {
		return requestService.changeStatus(id, input.status());
	}

	// ---------- DELETE /api/requests/{id}：员工撤回 ----------
	@DeleteMapping("/{id}")
	// 204 No Content：成功了，但没有内容要返回
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void cancel(@PathVariable Long id, @RequestAttribute(AuthInterceptor.CURRENT_USER) TokenInfo currentUser) {
		// 「是不是自己的」「是不是还没处理」都交给 Service 判断
		requestService.cancel(id, currentUser.employeeId());
	}
}
