// =====================================================================
// EmployeeResponse.java：返回给前端的员工数据长什么样
//
// 为什么不直接返回 Employee（Entity）？
//   1. Entity 里有 deleted、createdAt、updatedAt，前端不需要；以后加了密码字段，更不能返回给前端。
//      用一个专门的「响应类」，返回什么字段由我们自己明确决定，不会不小心把不该给的数据发出去。
//   2. 表结构以后改了（比如字段改名），只要这里的字段不变，前端就不受影响。
//
// 返回给前端的 JSON（和前端 src/data/employees.ts 里的 Employee 类型完全一样）：
//   {"id": 1, "name": "Tom Lee", "phone": "555-123-4567", "department": "Kitchen",
//    "position": "Chef", "employment": "fullTime", "status": "active"}
// =====================================================================

package com.goenkon.schedule.employee;

// record：自动生成字段、构造方法和读取方法；Jackson 会用字段名当 JSON 的 key
public record EmployeeResponse(
		// 员工编号（数据库自动生成的主键）
		Long id,
		String name,
		String phone,
		// 枚举转 JSON 时，Jackson 会用枚举的名字："Kitchen"、"fullTime"
		Department department,
		Position position,
		EmploymentType employment,
		EmployeeStatus status) {

	// 「从 Entity 变成响应」的工具方法
	// static：直接 EmployeeResponse.from(employee) 调用，不用先 new
	// 把这段转换写在这里，Service 里需要返回员工的地方都调用它，不用每次都写一遍七个字段
	public static EmployeeResponse from(Employee employee) {
		// 用 Entity 的 getter 一个个读出字段，按顺序传给 record 的构造方法
		return new EmployeeResponse(
				employee.getId(),
				employee.getName(),
				employee.getPhone(),
				employee.getDepartment(),
				employee.getPosition(),
				employee.getEmployment(),
				employee.getStatus());
	}
}
