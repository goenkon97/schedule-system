// =====================================================================
// ScheduleSeeder.java：第一次启动时，自动放一份「本月班表」
//
// 为什么要它：
//   上线用的是「演示模式」，数据库开在内存里（H2），后端每次重启（Render 免费版闲置会睡着、每次部署都会重启）
//   数据都会清空，再由各个 Seeder 重新放演示数据。
//   员工、账号、申请都有 Seeder，只有班表以前是「店长打开排班页时，由前端生成再提交」。
//   这样有两个问题：
//     ① 招聘方如果先用员工账号登录，看到的本月班表是空的；
//     ② 前端在浏览器里记了一个「这个月已经自动生成过」的标记，后端重启清空后，这个浏览器就不会再生成了。
//   所以改成由后端在启动时自己放一份，谁先登录都能马上看到。
//
// 排法：和前端「自动生成」的默认设置一样 —— 每天厨房 3 人、服务员 2 人，都是全天班（白班、晚班同一批人），
//       兼职先不排（和前端生成的结果一致，兼职由店长手动加）。
//   用最简单的「轮流」：把在职的正社员排成一队，每天从上次停下的地方往后数几个人。
//
// 只在 schedules 表是空的时候执行一次：本地 MySQL 里已经有班表的话，什么都不会发生。
// =====================================================================

package com.goenkon.schedule.schedule;

// LocalDate：日期（年月日，没有时间）
import java.time.LocalDate;
// YearMonth：「某年某月」，能直接告诉我们这个月有几天（28 / 29 / 30 / 31）
import java.time.YearMonth;
// ZoneId：时区。服务器（Render）的时钟是 UTC，比东京晚 9 小时；
//   不指定时区的话，东京时间每月 1 号早上 9 点前，服务器还以为是上个月
import java.time.ZoneId;
// List：可以变长的列表（像 JS 的数组）
import java.util.List;

// CommandLineRunner：程序启动完成后，Spring 自动调用一次 run 方法
import org.springframework.boot.CommandLineRunner;
// Order：多个 CommandLineRunner 的先后顺序（数字小的先执行）
import org.springframework.core.annotation.Order;
// Component：交给 Spring 管理。不加的话 Spring 不知道有这个类，run 永远不会被调用
import org.springframework.stereotype.Component;

// 下面四个来自员工包：要查员工、判断部门 / 正社员还是兼职 / 在职还是休假
import com.goenkon.schedule.employee.Department;
import com.goenkon.schedule.employee.Employee;
import com.goenkon.schedule.employee.EmployeeRepository;
import com.goenkon.schedule.employee.EmployeeStatus;
import com.goenkon.schedule.employee.EmploymentType;

@Component
// @Order(4)：在 EmployeeSeeder(1)、AccountSeeder(2)、RequestSeeder(3) 之后 —— 先有员工，才能排班
@Order(4)
public class ScheduleSeeder implements CommandLineRunner {

	// 每天厨房几个人、服务员几个人：和前端 DEFAULT_SETTINGS（kitchenPerDay: 3, hallPerDay: 2）保持一致
	//   static final：属于这个类本身、永远不变的常量（像 JS 文件顶部的 const）
	private static final int KITCHEN_PER_DAY = 3;
	private static final int HALL_PER_DAY = 2;

	// 店在东京：「今天是几号」按东京时间算
	private static final ZoneId TOKYO = ZoneId.of("Asia/Tokyo");

	// 要用到的两个仓库：由 Spring 在创建这个类时通过构造函数塞进来（依赖注入）
	private final ScheduleRepository scheduleRepository;
	private final EmployeeRepository employeeRepository;

	public ScheduleSeeder(ScheduleRepository scheduleRepository, EmployeeRepository employeeRepository) {
		this.scheduleRepository = scheduleRepository;
		this.employeeRepository = employeeRepository;
	}

	@Override
	public void run(String... args) {
		// 已经有任何一个月的班表了（之前启动过，或者店长提交过），就什么都不做
		if (scheduleRepository.count() > 0) {
			return;
		}

		// ---------- 1. 找出能排的人 ----------
		// 只要「没被删除」的员工（和员工列表页一样），按编号从小到大
		List<Employee> all = employeeRepository.findAllByDeletedFalseOrderByIdAsc();
		// 厨房的在职正社员。stream().filter(...).toList()：像 JS 的 all.filter(...)，留下符合条件的
		List<Employee> kitchen = all.stream().filter(e -> canWork(e, Department.Kitchen)).toList();
		// 服务员的在职正社员
		List<Employee> hall = all.stream().filter(e -> canWork(e, Department.Hall)).toList();
		// 人数不够一天的量，就不排了（防止下面取人时绕圈取到同一个人两次，违反「一个班不能排两次」的规则）
		if (kitchen.size() < KITCHEN_PER_DAY || hall.size() < HALL_PER_DAY) {
			return;
		}

		// ---------- 2. 建好这个月的「班表」这一行 ----------
		// YearMonth.now(TOKYO)：东京现在是哪年哪月
		YearMonth ym = YearMonth.now(TOKYO);
		// 主键是 "2026-11" 这种字符串：%d 填数字，%02d 填数字且不足两位前面补 0（11 → "11"，3 → "03"）
		String id = String.format("%d-%02d", ym.getYear(), ym.getMonthValue());
		Schedule schedule = new Schedule(id, ym.getYear(), ym.getMonthValue());
		// 名字和前端生成的格式一样：「2026年11月 班表」；备注留空；每天人数照上面的常量
		schedule.updateInfo(ym.getYear() + "年" + ym.getMonthValue() + "月 班表", "", KITCHEN_PER_DAY, HALL_PER_DAY);

		// ---------- 3. 每天排人（轮流） ----------
		// lengthOfMonth()：这个月有几天
		for (int day = 1; day <= ym.lengthOfMonth(); day++) {
			// atDay(day)：这个月的第 day 天，变成 LocalDate
			LocalDate date = ym.atDay(day);
			// 第 day 天，厨房从队伍的第 (day-1)*3 个人开始数 3 个；数到队尾就绕回队头（% 取余数）
			//   7 个厨房正社员、每天 3 个：第 1 天 0,1,2 号，第 2 天 3,4,5 号，第 3 天 6,0,1 号……每人大约每周 3 天
			for (int k = 0; k < KITCHEN_PER_DAY; k++) {
				Employee e = kitchen.get(((day - 1) * KITCHEN_PER_DAY + k) % kitchen.size());
				// 全天班：白班、晚班各加一条，同一个人
				schedule.addAssignment(date, Slot.kitchen, ShiftType.day, e);
				schedule.addAssignment(date, Slot.kitchen, ShiftType.evening, e);
			}
			// 服务员同样的办法，每天 2 人
			for (int k = 0; k < HALL_PER_DAY; k++) {
				Employee e = hall.get(((day - 1) * HALL_PER_DAY + k) % hall.size());
				schedule.addAssignment(date, Slot.hall, ShiftType.day, e);
				schedule.addAssignment(date, Slot.hall, ShiftType.evening, e);
			}
		}

		// ---------- 4. 存进数据库 ----------
		// save 一次：先 INSERT 班表这一行，再因为 cascade = ALL，把上面加的所有排班明细一起 INSERT
		scheduleRepository.save(schedule);
	}

	// 能不能排在某个部门：必须是这个部门的、正社员、在职（休假中的不排）
	//   private：只在这个类里面用
	private boolean canWork(Employee e, Department department) {
		return e.getDepartment() == department
				&& e.getEmployment() == EmploymentType.fullTime
				&& e.getStatus() == EmployeeStatus.active;
	}
}
