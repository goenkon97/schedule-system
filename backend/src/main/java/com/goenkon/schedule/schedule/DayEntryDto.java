// =====================================================================
// DayEntryDto.java：一天的安排（前端 DayEntry）
//
// JSON 例子：
//   {"date": "2026-12-05",
//    "kitchen":  {"day": [2, 5], "evening": [2, 5]},
//    "hall":     {"day": [3, 8], "evening": [3, 8]},
//    "partTime": [{"employeeId": 12, "shift": "evening"}]}
//
// 这就是那棵「树」里的一层：一天 → 三个格子 → 名单。
// Jackson 会按名字一层一层往下填：date → LocalDate，kitchen → ShiftStaffDto，partTime → List<PartTimeDto>
// =====================================================================

package com.goenkon.schedule.schedule;

// LocalDate：日期，"2026-12-05" 会自动变成 LocalDate
import java.time.LocalDate;
// List：列表
import java.util.List;

// NotNull：不能是 null
import jakarta.validation.constraints.NotNull;
// 【新】Valid 写在字段上：「这个字段本身也是一个 DTO，请进去按它里面的注解继续检查」
//   不写的话，Spring 只检查这一层（kitchen 是不是 null），不会进到 ShiftStaffDto 里面去检查 day / evening
import jakarta.validation.Valid;

public record DayEntryDto(

		// 哪一天
		@NotNull(message = "班表数据不完整（缺少日期）。")
		LocalDate date,

		// 厨房正社员：@Valid → 继续检查 ShiftStaffDto 里的规则
		@NotNull(message = "班表数据不完整（缺少厨房名单）。")
		@Valid
		ShiftStaffDto kitchen,

		// 服务员正社员
		@NotNull(message = "班表数据不完整（缺少服务员名单）。")
		@Valid
		ShiftStaffDto hall,

		// 兼职：可以是空列表 []
		// List<@NotNull @Valid PartTimeDto>：列表里每一条都不能是 null，而且每一条都要进去检查
		@NotNull(message = "班表数据不完整（缺少兼职名单）。")
		List<@NotNull @Valid PartTimeDto> partTime) {
}
