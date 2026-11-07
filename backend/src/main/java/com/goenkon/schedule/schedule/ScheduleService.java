// =====================================================================
// ScheduleService.java：排班的业务逻辑 —— 检查、拍平、组装
//
// 三个方法对应三个接口：
//   list   → GET    /api/schedules?from=2026-11&to=2027-01   查几个月（组装：一行一行 → 树）
//   save   → PUT    /api/schedules/2026-12                   提交一个月（检查 → 拍平：树 → 一行一行）
//   delete → DELETE /api/schedules/2026-12                   删掉一个月
//
// 排班算法不在这里：前端（fullTimeScheduler.ts）排好、店长调整完，把整个月发过来。
// 后端负责「把关」和「保管」：
//   把关：检查日期、员工、分组对不对（不对就 400，一行都不存）
//   保管：拍平存进 schedule_assignments；要的时候再组装回前端的样子
//
// 关于「每人每周最多 4 天」：
//   这是自动排班的规则（前端算法遵守）。但店长手动调班时，页面只「提示」这周上了几天，
//   允许店长根据实际情况超过（比如有人临时请假，需要别人多上一天）。
//   所以后端不把它当成硬性规定，不然店长手动调好的班表会被拒绝。
//   后端只检查「无论如何都不能错」的规则。
// =====================================================================

package com.goenkon.schedule.schedule;

// LocalDate：日期
import java.time.LocalDate;
// 【新】YearMonth：「年 + 月」这种类型，比如 2026-12。
//   能直接告诉我们这个月有几天（lengthOfMonth）、第几天是哪个日期（atDay），2 月和闰年都不用自己算
import java.time.YearMonth;
// DateTimeParseException：把文字转成日期失败时抛出的异常（比如 "2026-13"）
import java.time.format.DateTimeParseException;
// ArrayList / HashMap / HashSet / LinkedHashMap：几种常用的「容器」
//   ArrayList     → 有顺序的列表
//   HashMap       → 键 → 值 的表（这里是 员工 id → 员工），按 key 查得很快
//   HashSet       → 不重复的集合（用来发现「同一个人出现了两次」）
//   LinkedHashMap → 和 HashMap 一样，但会记住放进去的顺序（组装时 1 号、2 号……按顺序排好）
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.goenkon.schedule.common.ApiException;
// 员工相关：检查「这个人是不是厨房的正社员」要用到部门、雇佣类型
import com.goenkon.schedule.employee.Department;
import com.goenkon.schedule.employee.Employee;
import com.goenkon.schedule.employee.EmployeeRepository;
import com.goenkon.schedule.employee.EmploymentType;

@Service
// 默认只读事务；save / delete 单独标成可以写
@Transactional(readOnly = true)
public class ScheduleService {

	// 数据库里的班表都是「已提交」的，返回时状态一律写这个
	private static final String SUBMITTED = "submitted";

	private final ScheduleRepository scheduleRepository;
	private final EmployeeRepository employeeRepository;

	public ScheduleService(ScheduleRepository scheduleRepository, EmployeeRepository employeeRepository) {
		this.scheduleRepository = scheduleRepository;
		this.employeeRepository = employeeRepository;
	}

	// =================================================================
	// 查：from ~ to 这几个月的班表（没提交过的月份不在结果里）
	// =================================================================
	public List<ScheduleResponse> list(String from, String to) {
		YearMonth start = parseMonth(from);
		YearMonth end = parseMonth(to);
		if (end.isBefore(start)) {
			throw ApiException.badRequest("结束月份不能早于开始月份。");
		}
		// start.toString()：YearMonth 变回 "2026-11" 这种文字（正好和主键的格式一样）
		// 查出来是 List<Schedule>（Entity），每一个都组装成 ScheduleResponse（前端要的树）
		return scheduleRepository.findByIdBetweenOrderByIdAsc(start.toString(), end.toString()).stream()
				.map(this::toResponse)
				.toList();
	}

	// =================================================================
	// 存：提交一个月（整月覆盖）
	// =================================================================
	@Transactional
	public ScheduleResponse save(String id, ScheduleInput input) {
		// ---------- 1. 检查（任何一项不对就抛 400，后面都不执行，数据库一行都不会动）----------
		YearMonth month = parseMonth(id);
		// 1-1. 天数对不对、每一天的日期对不对
		checkDates(month, input.days());
		// 1-2. 用到的员工都存在、没被删除（顺便一次查出来，后面拍平时直接用）
		Map<Long, Employee> employeesById = loadEmployees(input.days());
		// 1-3. 每个人放的格子对不对、同一个班有没有重复
		checkPeople(input.days(), employeesById);

		// ---------- 2. 找到这个月的班表；以前没提交过就新建一个 ----------
		// orElseGet(() -> ...)：找不到时才执行括号里的代码（new 一个新的）
		Schedule schedule = scheduleRepository.findById(month.toString())
				.orElseGet(() -> new Schedule(month.toString(), month.getYear(), month.getMonthValue()));

		// ---------- 3. 更新这个月自己的信息 ----------
		schedule.updateInfo(
				input.name().trim(),
				input.note().trim(),
				input.settings().kitchenPerDay(),
				input.settings().hallPerDay());

		// ---------- 4. 拍平：先清空旧的安排，再把树上的每一个人变成一条安排 ----------
		// 清空：orphanRemoval → 事务结束时，旧的几百行会被 DELETE
		schedule.clearAssignments();
		// 第 1 层循环：每一天
		for (DayEntryDto day : input.days()) {
			LocalDate date = day.date();
			// 第 2、3 层：每个格子 × 每个班 → addAll 里是第 4 层：名单里的每个人
			addAll(schedule, date, Slot.kitchen, ShiftType.day, day.kitchen().day(), employeesById);
			addAll(schedule, date, Slot.kitchen, ShiftType.evening, day.kitchen().evening(), employeesById);
			addAll(schedule, date, Slot.hall, ShiftType.day, day.hall().day(), employeesById);
			addAll(schedule, date, Slot.hall, ShiftType.evening, day.hall().evening(), employeesById);
			// 兼职：每条记录自己带着班次
			for (PartTimeDto p : day.partTime()) {
				schedule.addAssignment(date, Slot.partTime, p.shift(), employeesById.get(p.employeeId()));
			}
		}

		// ---------- 5. 保存 ----------
		// 新的班表（version 是 null）→ INSERT；已有的 → UPDATE。
		// cascade = ALL：列表里新加的几百条安排跟着一起 INSERT。
		// （底层是一条一条 INSERT 的：一个月三四百条，对我们来说完全够快；
		//   数据量大的系统会开「批量插入」，把很多条打包成一次发给数据库）
		Schedule saved = scheduleRepository.save(schedule);

		// ---------- 6. 返回存好的样子（组装回树）----------
		return toResponse(saved);
	}

	// =================================================================
	// 删：删掉一个月（下面的安排 cascade 一起删）
	// =================================================================
	@Transactional
	public void delete(String id) {
		YearMonth month = parseMonth(id);
		Schedule schedule = scheduleRepository.findById(month.toString())
				.orElseThrow(() -> ApiException.notFound(month + " 还没有提交过班表。"));
		scheduleRepository.delete(schedule);
	}

	// =================================================================
	// 下面是这个类自己用的小方法（private）
	// =================================================================

	// ---------- "2026-12" → YearMonth；格式不对就 400 ----------
	private YearMonth parseMonth(String value) {
		try {
			// YearMonth.parse：只认「4 位年-2 位月」，"2026-13"、"2026-1"、"abc" 都会失败
			return YearMonth.parse(value);
		} catch (DateTimeParseException e) {
			throw ApiException.badRequest("月份格式不对，应该像 2026-12 这样。");
		}
	}

	// ---------- 检查 1：这个月有几天，就要有几天；第 i 天的日期必须是这个月的 i 号 ----------
	private void checkDates(YearMonth month, List<DayEntryDto> days) {
		// lengthOfMonth()：这个月有几天（2 月、闰年都会算对）
		int length = month.lengthOfMonth();
		if (days.size() != length) {
			throw ApiException.badRequest(month + " 有 " + length + " 天，提交的班表却有 " + days.size() + " 天。");
		}
		for (int i = 0; i < length; i++) {
			// atDay(1) → 2026-12-01；列表从 0 开始数，所以第 i 个应该是 (i + 1) 号
			LocalDate expected = month.atDay(i + 1);
			if (!expected.equals(days.get(i).date())) {
				throw ApiException.badRequest("班表第 " + (i + 1) + " 天的日期应该是 " + expected + "。");
			}
		}
	}

	// ---------- 检查 2：用到的员工都存在、没被删除 ----------
	// 先把整个月出现过的员工 id 收集起来（Set 自动去重），再「一次」查出来。
	// 为什么不一个一个查？一个月几百个 id，一个一个查就是几百次数据库往返（又是 N+1）；
	// findAllById 只发一条：SELECT ... FROM employees WHERE id IN (2, 3, 5, ...)
	private Map<Long, Employee> loadEmployees(List<DayEntryDto> days) {
		Set<Long> ids = new HashSet<>();
		for (DayEntryDto day : days) {
			// addAll：把一个列表里的元素全部放进集合
			ids.addAll(day.kitchen().day());
			ids.addAll(day.kitchen().evening());
			ids.addAll(day.hall().day());
			ids.addAll(day.hall().evening());
			for (PartTimeDto p : day.partTime()) {
				ids.add(p.employeeId());
			}
		}

		// 查出来的员工放进 Map：员工 id → 员工对象。后面拍平时用 id 直接取，不用再查数据库
		Map<Long, Employee> map = new HashMap<>();
		for (Employee e : employeeRepository.findAllById(ids)) {
			map.put(e.getId(), e);
		}

		// 每个 id 都要找得到，而且没被删除
		for (Long id : ids) {
			Employee e = map.get(id);
			if (e == null || e.isDeleted()) {
				throw ApiException.badRequest("班表里有不存在或已删除的员工（id = " + id + "），请调整后再提交。");
			}
		}
		return map;
	}

	// ---------- 检查 3：每个人放的格子对不对、同一个班有没有重复 ----------
	private void checkPeople(List<DayEntryDto> days, Map<Long, Employee> employeesById) {
		for (DayEntryDto day : days) {
			// 兼职一天只能上一个班：这一天出现过的兼职
			Set<Long> partTimersToday = new HashSet<>();
			for (PartTimeDto p : day.partTime()) {
				if (!partTimersToday.add(p.employeeId())) {
					throw ApiException.badRequest(day.date() + "：" + employeesById.get(p.employeeId()).getName()
							+ " 是兼职，一天只能安排一个班。");
				}
			}

			// 白班、晚班分别检查：ShiftType.values() = [day, evening]，按顺序各走一遍
			for (ShiftType shift : ShiftType.values()) {
				// seen：这一天这个班已经出现过的人。Set.add 返回 false = 已经有了 = 重复
				Set<Long> seen = new HashSet<>();

				// 厨房格子里的人：必须是厨房的正社员
				for (Long id : pick(day.kitchen(), shift)) {
					requireFullTime(employeesById.get(id), Department.Kitchen, day.date());
					addOnce(seen, employeesById.get(id), day.date(), shift);
				}
				// 服务员格子里的人：必须是服务员的正社员
				for (Long id : pick(day.hall(), shift)) {
					requireFullTime(employeesById.get(id), Department.Hall, day.date());
					addOnce(seen, employeesById.get(id), day.date(), shift);
				}
				// 兼职格子里、上这个班的人：必须是兼职
				for (PartTimeDto p : day.partTime()) {
					if (p.shift() == shift) {
						Employee e = employeesById.get(p.employeeId());
						if (e.getEmployment() != EmploymentType.partTime) {
							throw ApiException.badRequest(day.date() + "：" + e.getName() + " 不是兼职，不能排在兼职里。");
						}
						addOnce(seen, e, day.date(), shift);
					}
				}
			}
		}
	}

	// 某个部门的名单里，取出某个班的那一份
	private List<Long> pick(ShiftStaffDto staff, ShiftType shift) {
		return shift == ShiftType.day ? staff.day() : staff.evening();
	}

	// 必须是某个部门的正社员（厨房的格子里不能放服务员、也不能放兼职）
	private void requireFullTime(Employee e, Department department, LocalDate date) {
		if (e.getEmployment() != EmploymentType.fullTime || e.getDepartment() != department) {
			String group = department == Department.Kitchen ? "厨房" : "服务员";
			throw ApiException.badRequest(date + "：" + e.getName() + " 不是" + group + "的正社员，不能排在" + group + "里。");
		}
	}

	// 同一天同一个班，一个人只能出现一次
	private void addOnce(Set<Long> seen, Employee e, LocalDate date, ShiftType shift) {
		if (!seen.add(e.getId())) {
			String shiftName = shift == ShiftType.day ? "白班" : "晚班";
			throw ApiException.badRequest(date + " 的" + shiftName + "里，" + e.getName() + " 被安排了两次。");
		}
	}

	// 拍平用：名单里的每个人 → 一条安排
	private void addAll(Schedule schedule, LocalDate date, Slot slot, ShiftType shift, List<Long> ids,
			Map<Long, Employee> employeesById) {
		for (Long id : ids) {
			schedule.addAssignment(date, slot, shift, employeesById.get(id));
		}
	}

	// =================================================================
	// 组装：Entity（一个月 + 一行一行的安排）→ ScheduleResponse（前端要的树）
	// =================================================================
	private ScheduleResponse toResponse(Schedule schedule) {
		YearMonth month = YearMonth.of(schedule.getYear(), schedule.getMonth());

		// 1. 先搭好空架子：这个月的每一天都有一个空的 DayBuilder（三个格子都是空名单）
		//    LinkedHashMap：记住放进去的顺序，最后取出来就是 1 号、2 号……按顺序
		Map<LocalDate, DayBuilder> byDate = new LinkedHashMap<>();
		for (int d = 1; d <= month.lengthOfMonth(); d++) {
			byDate.put(month.atDay(d), new DayBuilder());
		}

		// 2. 把每一行安排放回它原来的位置：先按日期找到那一天，再按 slot 找格子、按 shift 找名单
		for (ScheduleAssignment a : schedule.getAssignments()) {
			DayBuilder day = byDate.get(a.getWorkDate());
			// 正常不会是 null（存的时候检查过日期），保险起见跳过
			if (day == null) {
				continue;
			}
			// getEmployee().getId()：员工是懒加载的替身，但替身本来就知道 id，不会去查员工表
			Long employeeId = a.getEmployee().getId();
			// switch 的「箭头」写法（Java 14+）：匹配到哪个就执行哪一句，不会往下掉到下一个 case
			switch (a.getSlot()) {
				case kitchen -> day.kitchen(a.getShift()).add(employeeId);
				case hall -> day.hall(a.getShift()).add(employeeId);
				case partTime -> day.partTime.add(new PartTimeDto(employeeId, a.getShift()));
			}
		}

		// 3. 每个架子变成一个 DayEntryDto（record）
		List<DayEntryDto> days = new ArrayList<>();
		// forEach((key, value) -> ...)：依次取出 Map 里的每一对
		byDate.forEach((date, builder) -> days.add(builder.build(date)));

		return new ScheduleResponse(
				schedule.getId(),
				schedule.getName(),
				schedule.getYear(),
				schedule.getMonth(),
				schedule.getNote(),
				new ScheduleSettingsDto(schedule.getKitchenPerDay(), schedule.getHallPerDay()),
				days,
				SUBMITTED,
				schedule.getUpdatedAt());
	}

	// ---------- 组装时用的「一天的空架子」----------
	// 为什么不直接用 DayEntryDto？record 创建以后不能修改，没法一个一个往里加人。
	// 所以先用这个可以往里加的小类收集，全部放好以后再一次性变成 record。
	// private static final class：只有这个文件能用的「内部类」；static = 不需要依附某个 ScheduleService 对象
	private static final class DayBuilder {
		final List<Long> kitchenDay = new ArrayList<>();
		final List<Long> kitchenEvening = new ArrayList<>();
		final List<Long> hallDay = new ArrayList<>();
		final List<Long> hallEvening = new ArrayList<>();
		final List<PartTimeDto> partTime = new ArrayList<>();

		// 厨房某个班的名单
		List<Long> kitchen(ShiftType shift) {
			return shift == ShiftType.day ? kitchenDay : kitchenEvening;
		}

		// 服务员某个班的名单
		List<Long> hall(ShiftType shift) {
			return shift == ShiftType.day ? hallDay : hallEvening;
		}

		// 收集好了 → 变成 record
		DayEntryDto build(LocalDate date) {
			return new DayEntryDto(
					date,
					new ShiftStaffDto(kitchenDay, kitchenEvening),
					new ShiftStaffDto(hallDay, hallEvening),
					partTime);
		}
	}
}
