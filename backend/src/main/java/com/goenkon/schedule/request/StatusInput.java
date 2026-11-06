// =====================================================================
// StatusInput.java：店长「改处理状态」时，前端发过来的 JSON 长什么样（DTO）
//
// 前端发来的 JSON 例子：{"status": "done"}
// 改哪一条申请，写在网址里（PATCH /api/requests/5/status 的 5），不在 JSON 里。
//
// 为什么只有一个字段也要单独做一个类？
//   Spring 接收 JSON 时需要一个「表格」来对照。只有一个栏目也是一张表格，
//   而且以后想加栏目（比如店长写一句处理说明），只改这里就行。
// =====================================================================

package com.goenkon.schedule.request;

// NotNull：不能是 null —— 不传 status，或者传 "status": null，都会被挡下来 → 400
import jakarta.validation.constraints.NotNull;

public record StatusInput(

		// 新状态：只能是 pending / done
		@NotNull(message = "请选择处理状态。")
		RequestStatus status) {
}
