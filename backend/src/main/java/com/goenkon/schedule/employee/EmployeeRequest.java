// =====================================================================
// EmployeeRequest.java：添加 / 修改员工时，前端发过来的数据长什么样
//
// 这种「只用来装请求或响应数据」的类叫 DTO（Data Transfer Object，数据传输对象）。
// 为什么不直接用 Employee（Entity）来接收前端的数据？
//   1. 前端不应该能决定 id、deleted、createdAt 这些字段。如果直接用 Entity 接收，
//      别人在 JSON 里多传一个 "deleted": true，就可能把员工改成已删除。
//   2. 「前端发来的格式」和「数据库的表结构」是两回事，分开以后改一边不会影响另一边。
//
// 前端发来的 JSON：
//   {"name": "Ken Sato", "phone": "090-1234-5678", "department": "Hall",
//    "position": "Server", "employment": "partTime", "status": "active"}
// Spring 会用 Jackson 把这段 JSON 自动变成一个 EmployeeRequest 对象（JSON 的 key 对应字段名）。
// 和前端 src/data/employees.ts 里的 EmployeeInput 类型一模一样。
// =====================================================================

package com.goenkon.schedule.employee;

// 下面这些都是 Jakarta Validation（数据校验规范）的注解，来自 pom.xml 里的 spring-boot-starter-validation。
// 贴在字段上，写好规则；Controller 的参数前面加 @Valid 时，Spring 会自动按这些规则检查，
// 不通过就抛出异常（由 GlobalExceptionHandler 变成 400 错误），根本不会进到 Service 里。
// NotBlank：字符串不能是 null，也不能是空字符串或只有空格
import jakarta.validation.constraints.NotBlank;
// NotNull：不能是 null（用在枚举这种不是字符串的字段上）
import jakarta.validation.constraints.NotNull;
// Pattern：字符串必须符合某个正则表达式
import jakarta.validation.constraints.Pattern;
// Size：字符串的长度范围
import jakarta.validation.constraints.Size;

// record：Java 的「数据类」，括号里的每一项都会自动生成 private final 字段、构造方法和读取方法
//   （读取方法的名字就是字段名本身：request.name()、request.phone()，不是 getName()）
// 一个 record 对象创建以后就不能再改了，正适合「收到的请求数据」这种只读的东西。
public record EmployeeRequest(

		// 姓名：必填，最多 40 个字（和数据库的 VARCHAR(40)、前端表单的 maxLength 一致）
		// message = "..."：校验不通过时的错误信息，会原样返回给前端显示
		@NotBlank(message = "请输入姓名。")
		@Size(max = 40, message = "姓名最多 40 个字。")
		String name,

		// 电话：必填，只能是数字和「-」，6 ~ 20 位
		// regexp = "^[0-9-]{6,20}$" 是正则表达式：
		//   ^ 开头、$ 结尾 → 整个字符串都要符合
		//   [0-9-]         → 一个字符只能是 0~9 的数字或者 -
		//   {6,20}         → 这样的字符有 6 到 20 个
		// （和前端 EmployeeFormDialog 里的 PHONE_PATTERN 是同一个规则：前端检查是为了用户体验，
		//   后端再检查一次是为了安全 —— 别人可以绕过前端，直接用 curl 发请求）
		@NotBlank(message = "请输入电话。")
		@Pattern(regexp = "^[0-9-]{6,20}$", message = "电话只能是数字和「-」，例如 090-1234-5678。")
		String phone,

		// 部门：必须有。枚举类型，JSON 里只能是 "Kitchen" 或 "Hall"，
		// 传了别的值 Jackson 转换时就会失败（变成 400 错误）
		@NotNull(message = "请选择部门。")
		Department department,

		// 职位：必须有（职位和部门对不对得上，在 EmployeeService 里检查）
		@NotNull(message = "请选择职位。")
		Position position,

		// 雇佣类型：必须有
		@NotNull(message = "请选择雇佣类型。")
		EmploymentType employment,

		// 状态：必须有
		@NotNull(message = "请选择状态。")
		EmployeeStatus status) {
}
