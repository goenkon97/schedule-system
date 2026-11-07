// =====================================================================
// ScheduleInput.java：店长「提交班表」时，前端发过来的 JSON（PUT /api/schedules/2026-12）
//
// JSON 例子（days 一般有 28 ~ 31 天，这里只写一天）：
//   {"name": "2026年12月 班表", "note": "24 号年末聚餐",
//    "settings": {"kitchenPerDay": 3, "hallPerDay": 2},
//    "days": [ {"date": "2026-12-01", "kitchen": {...}, "hall": {...}, "partTime": [...]}, ... ]}
//
// 整个结构是 record 套 record（一棵树），和前端的 MonthSchedule 一模一样：
//   ScheduleInput → List<DayEntryDto> → ShiftStaffDto / List<PartTimeDto>
//
// 注意这里【没有】的字段：
//   id / year / month：是哪个月，看网址里的 /2026-12，不看 JSON（两个地方都写，万一不一样就麻烦了）
//   status：数据库里的班表一定是「已提交」，不用传
//   updatedAt：后端自己记
// =====================================================================

package com.goenkon.schedule.schedule;

// List：列表
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ScheduleInput(

		// 名字：前端自动生成，最多 40 个字（和数据库的列一样长）
		@NotBlank(message = "班表名字不能为空。")
		@Size(max = 40, message = "班表名字最多 40 个字。")
		String name,

		// 备注：可以是空字符串 ""，但不能不传；最多 200 字
		@NotNull(message = "班表数据不完整（缺少备注）。")
		@Size(max = 200, message = "备注最多 200 个字。")
		String note,

		// 人数设置：@Valid → 进去检查 0 ~ 20
		@NotNull(message = "班表数据不完整（缺少人数设置）。")
		@Valid
		ScheduleSettingsDto settings,

		// 每一天：@Valid 一路往下检查到最里面
		//   「天数对不对、日期是不是这个月的」这些要和网址里的月份一起看，放在 Service 里检查
		@NotNull(message = "班表数据不完整（缺少每天的安排）。")
		List<@NotNull @Valid DayEntryDto> days) {
}
