// =====================================================================
// StaffRequestResponse.java：后端「返回给前端」的一条申请长什么样（DTO）
//
// 返回的 JSON 例子：
//   {"id": 1, "employeeId": 2, "employeeName": "Alice Chen", "type": "leave",
//    "startDate": "2026-12-05", "endDate": "2026-12-06", "note": "回老家",
//    "status": "pending", "createdAt": "2026-11-06T11:52:00Z"}
//
// 为什么不直接把 StaffRequest（Entity）返回给前端？
//   1. Entity 里的 employee 是一个完整的 Employee 对象（还可能是懒加载的替身）。
//      直接转成 JSON，会把员工的电话等所有信息都带出去，替身还可能直接报错。
//      前端只需要员工的 id 和名字，所以这里只挑这两样。
//   2. 「数据库长什么样」和「给前端看什么」分开：以后表里加了内部用的字段，不会被意外返回出去。
//
// 和前端 src/data/requests.ts 里的 StaffRequest 类型对应（多了 employeeName，前端可以直接显示）。
// =====================================================================

package com.goenkon.schedule.request;

// Instant：时间点。Jackson 转 JSON 时会变成 "2026-11-06T11:52:00Z" 这种标准格式的文字
import java.time.Instant;
// LocalDate：日期。转 JSON 时变成 "2026-12-05"
import java.time.LocalDate;

public record StaffRequestResponse(
		Long id,
		// 谁提交的：员工 id + 名字（从关联的 Employee 里读出来）
		Long employeeId,
		String employeeName,
		RequestType type,
		// 「其他」类型时是 null，JSON 里就是 "startDate": null
		LocalDate startDate,
		LocalDate endDate,
		String note,
		RequestStatus status,
		Instant createdAt) {

	// 把一个 Entity 变成一个 Response（和 EmployeeResponse.from 一样的写法）。
	// static：直接 StaffRequestResponse.from(request) 调用，不用先 new。
	// 这个方法要在 Service 的事务里调用：getEmployee().getName() 可能会让替身去查员工表
	// （列表查询用了 @EntityGraph，员工已经一起查出来了，就不会再查）
	public static StaffRequestResponse from(StaffRequest request) {
		return new StaffRequestResponse(
				request.getId(),
				// getId()：替身本来就知道 id，不会查数据库
				request.getEmployee().getId(),
				// getName()：要名字了 —— 如果是替身，这一刻才去员工表查
				request.getEmployee().getName(),
				request.getType(),
				request.getStartDate(),
				request.getEndDate(),
				request.getNote(),
				request.getStatus(),
				request.getCreatedAt());
	}
}
