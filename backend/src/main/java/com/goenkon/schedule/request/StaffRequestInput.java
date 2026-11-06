// =====================================================================
// StaffRequestInput.java：员工「提交申请」时，前端发过来的 JSON 长什么样（DTO）
//
// DTO = Data Transfer Object（数据传输对象）= 专门用来「装进出的数据」的类，像一张表格：
//   前端填好表格寄过来（JSON），后端按这张表格的格式接收；表格上没有的栏目，填了也没用。
//
// 前端发来的 JSON 例子：
//   请假：{"type": "leave", "startDate": "2026-12-05", "endDate": "2026-12-06", "note": "回老家"}
//   其他：{"type": "other", "startDate": null, "endDate": null, "note": "想多排周末的班"}
// Spring 用 Jackson 按名字一一对上：JSON 的 "type" → 字段 type，"note" → 字段 note ……
//
// 注意这里【没有】的字段 —— 这才是用 DTO 的重点：
//   - 没有 employeeId：「谁提交的」不听前端的，从通行证（token）里拿。
//     否则员工 A 在 JSON 里写别人的 id，就能冒充别人提交申请。
//   - 没有 status：新申请一律是 pending，员工不能自己写 done。
//   - 没有 id、createdAt：由数据库和 Entity 自动生成。
// 就算前端在 JSON 里多塞了这些字段，Jackson 找不到对应的栏目，直接忽略。
// =====================================================================

package com.goenkon.schedule.request;

// LocalDate：只有日期的类型。JSON 里的 "2026-12-05" 这种文字，Jackson 会自动变成 LocalDate 对象
import java.time.LocalDate;

// 校验注解（来自 spring-boot-starter-validation），Controller 参数前加 @Valid 时自动检查：
// NotBlank：字符串不能是 null、空字符串、或者只有空格
import jakarta.validation.constraints.NotBlank;
// NotNull：不能是 null（用在枚举这种不是字符串的字段上）
import jakarta.validation.constraints.NotNull;
// Size：字符串长度范围
import jakarta.validation.constraints.Size;

// record：数据类。括号里每一项自动生成字段、构造方法、读取方法（input.type()、input.note()）。
// 创建后不能修改，正适合「收到的数据」这种只读的东西
public record StaffRequestInput(

		// 类型：必须有。只能是 leave / swap / other，传了别的值 Jackson 转换失败 → 400
		@NotNull(message = "请选择申请类型。")
		RequestType type,

		// 开始日期、结束日期：这里不贴注解，允许是 null（「其他」类型就没有日期）。
		// 「请假、换班必须有日期」「结束不能早于开始」这些规则要同时看好几个字段，
		// 一个字段上的注解管不了，所以放到 StaffRequestService 里检查
		LocalDate startDate,

		LocalDate endDate,

		// 备注：所有类型都必填，最多 300 字（和数据库 VARCHAR(300)、前端输入框的 maxLength 一样）
		@NotBlank(message = "请填写备注。")
		@Size(max = 300, message = "备注最多 300 个字。")
		String note) {
}
