// =====================================================================
// ShiftType.java：班次 —— 白班 / 晚班
//
//   day     → 白班 10:00 - 15:00
//   evening → 晚班 17:00 - 23:00
//
// 名字和前端 i18n/translations.ts 里的 ShiftType（"day" | "evening"）一模一样，
// 前端发来的 JSON、存进数据库的文字、返回给前端的 JSON 都是同一个字符串，不用转换。
// （几点到几点只在前端 data/shifts.ts 里定义；后端只需要知道「是哪个班」）
// =====================================================================

// schedule 包：放「排班」这个功能的所有代码（和 employee、auth、request 平级）
package com.goenkon.schedule.schedule;

public enum ShiftType {
	// 白班
	day,
	// 晚班
	evening
}
