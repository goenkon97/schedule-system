// =====================================================================
// EmploymentType.java：雇佣类型
// fullTime 正社员：参加自动排班，每周 4 天全天班
// partTime 兼职：不参加自动排班，由店长手动安排
// （这里用小写开头，是为了和前端的 "fullTime" / "partTime" 完全一样）
// =====================================================================
package com.goenkon.schedule.employee;

public enum EmploymentType {
	// 正社员
	fullTime,
	// 兼职（只有服务员部门有）
	partTime
}
