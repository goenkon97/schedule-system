// =====================================================================
// EmployeeController.java：员工的 4 + 1 个 HTTP 接口（三层里的第一层）
//
//   GET    /api/employees        查所有在职员工
//   GET    /api/employees/{id}   查一个员工
//   POST   /api/employees        添加员工
//   PUT    /api/employees/{id}   修改员工
//   DELETE /api/employees/{id}   删除员工（软删除）
//
// Controller 只做三件事：收请求 → 交给 Service → 把结果返回去。
// 不写任何业务规则（规则都在 EmployeeService 里），所以每个方法基本只有一行。
// 和前端 src/data/employees.ts 里 employeeApi 的 list / create / update / remove 一一对应，
// 以后前端只要把 employeeApi 里面换成 fetch 这几个网址就行。
//
// 现在还没有登录，所以谁都能调这些接口；做登录时会加上「只有店长能增删改」。
// =====================================================================

package com.goenkon.schedule.employee;

// List：返回员工列表时用
import java.util.List;

// HttpStatus：HTTP 状态码（201 CREATED、204 NO_CONTENT）
import org.springframework.http.HttpStatus;
// 下面都是 Spring Web MVC 的注解
// DeleteMapping / GetMapping / PostMapping / PutMapping：把方法绑定到 DELETE / GET / POST / PUT 请求上
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
// PathVariable：从网址的路径里取值（/api/employees/3 里的 3）
import org.springframework.web.bind.annotation.PathVariable;
// RequestBody：把请求体的 JSON 变成一个 Java 对象
import org.springframework.web.bind.annotation.RequestBody;
// RequestMapping：整个类的网址前缀
import org.springframework.web.bind.annotation.RequestMapping;
// ResponseStatus：指定这个接口成功时返回什么状态码（不写默认是 200 OK）
import org.springframework.web.bind.annotation.ResponseStatus;
// RestController：这个类负责接 HTTP 请求，返回值自动转成 JSON
import org.springframework.web.bind.annotation.RestController;

// Valid：让 Spring 按 EmployeeRequest 字段上的注解（@NotBlank、@Pattern……）检查请求数据
import jakarta.validation.Valid;

// @RestController：Spring 启动时自动 new 这个类，把下面的方法登记进路由表
@RestController
// 这个类所有接口的网址都以 /api/employees 开头（名词用复数：「员工们」这个资源）
@RequestMapping("/api/employees")
public class EmployeeController {

	// 要用到的业务层
	private final EmployeeService employeeService;

	// 构造方法注入：Spring 创建 Controller 时，把容器里的 EmployeeService 传进来
	// （Spring 会先创建 Repository → 再创建 Service → 最后创建 Controller，按依赖关系排好顺序）
	public EmployeeController(EmployeeService employeeService) {
		this.employeeService = employeeService;
	}

	// GET /api/employees → 所有在职员工
	// 返回 List<EmployeeResponse>，Jackson 会把它转成 JSON 数组：[{...}, {...}, ...]
	@GetMapping
	public List<EmployeeResponse> list() {
		return employeeService.list();
	}

	// GET /api/employees/3 → id 为 3 的员工
	// "/{id}"：路径里的「变量」，{id} 那一段是什么都行
	// @PathVariable Long id：把那一段取出来，转成 Long 交给参数 id（"3" → 3）
	@GetMapping("/{id}")
	public EmployeeResponse get(@PathVariable Long id) {
		return employeeService.get(id);
	}

	// POST /api/employees → 添加员工
	// @ResponseStatus(HttpStatus.CREATED)：成功时返回 201 Created（表示「新建成功」），而不是默认的 200
	// @RequestBody：把请求体里的 JSON 变成 EmployeeRequest 对象
	// @Valid：变成对象以后，先按字段上的注解检查一遍；不通过就抛异常 → GlobalExceptionHandler 返回 400，
	//         根本不会进到这个方法里
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public EmployeeResponse create(@Valid @RequestBody EmployeeRequest request) {
		return employeeService.create(request);
	}

	// PUT /api/employees/3 → 修改 id 为 3 的员工（PUT = 用请求里的数据整个替换）
	// 同时用到了路径里的 id 和请求体里的数据
	@PutMapping("/{id}")
	public EmployeeResponse update(@PathVariable Long id, @Valid @RequestBody EmployeeRequest request) {
		return employeeService.update(id, request);
	}

	// DELETE /api/employees/3 → 删除 id 为 3 的员工
	// @ResponseStatus(HttpStatus.NO_CONTENT)：成功时返回 204 No Content（成功了，但没有内容要返回）
	// void：没有返回值，响应体是空的
	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		employeeService.delete(id);
	}
}
