// =====================================================================
// ShiftStaffDto.java：某个部门这一天的正社员名单，按班次分开（前端 ShiftStaff）
//
// JSON 例子：{"day": [2, 5, 7], "evening": [2, 5, 7]}
//   默认白班、晚班是同一批人（全天班）；店长可以只把某人的白班或晚班换给别人。
// =====================================================================

package com.goenkon.schedule.schedule;

// List：列表 —— JSON 里的数组 [2, 5, 7] 会变成 List<Long>
import java.util.List;

// NotNull：不能是 null
import jakarta.validation.constraints.NotNull;

public record ShiftStaffDto(

		// 白班的员工 id 列表。可以是空列表 []，但不能不传（null）。
		// List<@NotNull Long>：注解写在 < > 里面 = 检查列表里的「每一个元素」都不能是 null
		//   （防止 JSON 里出现 [2, null, 5] 这种）
		@NotNull(message = "班表数据不完整（缺少白班名单）。")
		List<@NotNull Long> day,

		// 晚班的员工 id 列表
		@NotNull(message = "班表数据不完整（缺少晚班名单）。")
		List<@NotNull Long> evening) {
}
