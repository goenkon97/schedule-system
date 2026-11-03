// =====================================================================
// EmployeeStatus.java：员工状态
// active 在职；onLeave 长期休假中（自动排班时会跳过）
// =====================================================================
package com.goenkon.schedule.employee;

public enum EmployeeStatus {
	// 在职
	active,
	// 休假中
	onLeave
}
