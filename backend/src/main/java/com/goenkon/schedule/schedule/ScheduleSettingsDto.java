// =====================================================================
// ScheduleSettingsDto.java：生成班表时用的人数设置（前端 MonthSchedule.settings）
//
// JSON 例子：{"kitchenPerDay": 3, "hallPerDay": 2}
// 进来（提交）、出去（返回）都用它。
// =====================================================================

package com.goenkon.schedule.schedule;

// Max / Min：数字的范围（不能小于 / 不能大于）
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record ScheduleSettingsDto(

		// 厨房每天几名正社员：0 ~ 20（店里一共才二十几个人，超过 20 肯定是传错了）
		@Min(value = 0, message = "人数设置不能是负数。")
		@Max(value = 20, message = "人数设置最多 20 人。")
		int kitchenPerDay,

		// 服务员每天几名正社员
		@Min(value = 0, message = "人数设置不能是负数。")
		@Max(value = 20, message = "人数设置最多 20 人。")
		int hallPerDay) {
}
