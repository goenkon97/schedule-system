// =====================================================================
// ScheduleController.java：排班的 3 个接口
//
//   GET    /api/schedules?from=2026-11&to=2027-01   查几个月的班表        登录了就能看（员工也要看班表）
//   PUT    /api/schedules/2026-12                   提交（整月覆盖）       @ManagerOnly
//   DELETE /api/schedules/2026-12                   删除这个月的班表       @ManagerOnly
//
// 为什么查询是「一段月份」，而不是 GET /api/schedules/2026-12 一个月一个月地查？
//   排班页一打开就要看「这个月、下个月、下下个月」三个月，一次查完只要一个请求；
//   而且没提交过的月份不会报 404 错误，只是不在结果里。
// 为什么提交用 PUT 不用 POST？
//   PUT = 「把这个地址上的东西整个换成我给的」，同一个月提交几次，结果都一样（覆盖）；
//   POST 一般是「新建一个」。我们是「这个月的班表就是这样」，所以用 PUT。
// =====================================================================

package com.goenkon.schedule.schedule;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
// PutMapping：把方法绑定到 PUT 请求
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
// 【新】RequestParam：从网址的「?」后面取值（?from=2026-11&to=2027-01 里的 from、to）
//   对比 PathVariable：取的是路径里的一段（/api/schedules/2026-12 里的 2026-12）
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.goenkon.schedule.auth.ManagerOnly;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/schedules")
public class ScheduleController {

	private final ScheduleService scheduleService;

	public ScheduleController(ScheduleService scheduleService) {
		this.scheduleService = scheduleService;
	}

	// ---------- GET /api/schedules?from=2026-11&to=2027-01 ----------
	// 两个参数都必须传；不传 Spring 会直接返回 400
	@GetMapping
	public List<ScheduleResponse> list(@RequestParam String from, @RequestParam String to) {
		return scheduleService.list(from, to);
	}

	// ---------- PUT /api/schedules/2026-12：提交 ----------
	// @Valid：按 ScheduleInput 里的注解，一层层检查到最里面（DayEntryDto、ShiftStaffDto……）
	@PutMapping("/{id}")
	@ManagerOnly
	public ScheduleResponse save(@PathVariable String id, @Valid @RequestBody ScheduleInput input) {
		return scheduleService.save(id, input);
	}

	// ---------- DELETE /api/schedules/2026-12：删除 ----------
	@DeleteMapping("/{id}")
	@ManagerOnly
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable String id) {
		scheduleService.delete(id);
	}
}
