// =====================================================================
// PartTimeDto.java：一条兼职安排（前端 PartTimeEntry）
//
// JSON 例子：{"employeeId": 12, "shift": "evening"}
//   兼职一天只上一个班，所以每个人自己带着「上哪个班」。
// =====================================================================

package com.goenkon.schedule.schedule;

// NotNull：不能是 null
import jakarta.validation.constraints.NotNull;

public record PartTimeDto(

		// 哪个兼职员工
		@NotNull(message = "兼职安排缺少员工。")
		Long employeeId,

		// 上哪个班：只能是 day / evening（传别的值 Jackson 转换失败 → 400）
		@NotNull(message = "兼职安排缺少班次。")
		ShiftType shift) {
}
