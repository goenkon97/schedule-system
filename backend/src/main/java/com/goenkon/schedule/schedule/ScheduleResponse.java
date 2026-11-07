// =====================================================================
// ScheduleResponse.java：后端返回给前端的一个月的班表 —— 和前端 MonthSchedule 一模一样
//
// 数据库里是两张表、一行一行的；返回之前由 ScheduleService 组装回这棵树，前端拿到直接用，不用改显示代码。
// =====================================================================

package com.goenkon.schedule.schedule;

// Instant：时间点 → JSON 里是 "2026-11-07T01:23:45Z"
import java.time.Instant;
// List：列表
import java.util.List;

public record ScheduleResponse(
		String id,                     // "2026-12"
		String name,                   // "2026年12月 班表"
		int year,
		int month,                     // 1 ~ 12
		String note,
		ScheduleSettingsDto settings,  // 和提交时同一个 record（进出共用）
		List<DayEntryDto> days,        // 组装回来的每一天（同样和提交时共用）
		String status,                 // 永远是 "submitted"（数据库里只有已提交的）
		Instant updatedAt) {
}
