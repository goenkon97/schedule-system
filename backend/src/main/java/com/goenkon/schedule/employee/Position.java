// =====================================================================
// Position.java：职位
// 职位和部门要对得上（厨房：Chef / Cook / Dishwasher；服务员：Server / Host / Manager），
// 这个规则不写在这里，而是在 EmployeeService 里检查 —— 枚举只负责「有哪些值」，业务规则放在 Service 层。
// 值和前端 src/data/employees.ts 里的 Position 类型一模一样。
// =====================================================================
package com.goenkon.schedule.employee;

public enum Position {
	// 主厨（厨房）
	Chef,
	// 厨师（厨房）
	Cook,
	// 洗碗工（厨房）
	Dishwasher,
	// 服务员（大厅）
	Server,
	// 接待（大厅）
	Host,
	// 店长（大厅；店长必须是正社员）
	Manager
}
