// =====================================================================
// RequestSeeder.java：第一次启动时放两条示例申请（和以前前端 localStorage 里的示例一样）
//
// 招聘方用店长账号登录，马上就能在「员工申请」和首页通知里看到效果，不用自己先提交。
// 只在 staff_requests 表是空的时候执行一次，之后重启不会重复添加。
// =====================================================================

package com.goenkon.schedule.request;

// LocalDate：日期。示例申请的日期按「今天往后几天」算，这样什么时候打开都是将来的日期
import java.time.LocalDate;

// CommandLineRunner：程序启动完成后，自动执行一次 run 方法
import org.springframework.boot.CommandLineRunner;
// Order：多个 CommandLineRunner 的执行顺序（数字小的先执行）
import org.springframework.core.annotation.Order;
// Component：交给 Spring 管理（不加的话 Spring 不知道有这个类，run 永远不会执行）
import org.springframework.stereotype.Component;

// 员工仓库：要找到「提交人」
import com.goenkon.schedule.employee.EmployeeRepository;

@Component
// @Order(3)：在 EmployeeSeeder(1)、AccountSeeder(2) 之后 —— 先有员工，才能有员工的申请
@Order(3)
public class RequestSeeder implements CommandLineRunner {

	private final StaffRequestRepository requestRepository;
	private final EmployeeRepository employeeRepository;

	public RequestSeeder(StaffRequestRepository requestRepository, EmployeeRepository employeeRepository) {
		this.requestRepository = requestRepository;
		this.employeeRepository = employeeRepository;
	}

	@Override
	public void run(String... args) {
		// 已经有申请了（之前启动过，或者有人提交过），就什么都不做
		if (requestRepository.count() > 0) {
			return;
		}

		LocalDate today = LocalDate.now();

		// 示例 1：员工 3 请假两天，还没处理
		//   findById 返回 Optional（可能没有这个员工）；ifPresent：有才执行括号里的代码，没有就跳过
		employeeRepository.findById(3L).ifPresent(employee -> requestRepository.save(new StaffRequest(
				employee,
				RequestType.leave,
				// plusDays(10)：今天往后 10 天
				today.plusDays(10),
				today.plusDays(11),
				"Attending a family wedding back home.")));

		// 示例 2：员工 6 的「其他」申请（没有日期），店长已经处理过
		employeeRepository.findById(6L).ifPresent(employee -> {
			StaffRequest request = new StaffRequest(
					employee,
					RequestType.other,
					null,
					null,
					"I have school exams next month, so I can only work evening shifts.");
			// 新建时默认是 pending，这里改成 done，演示「已沟通」的样子
			request.changeStatus(RequestStatus.done);
			requestRepository.save(request);
		});
	}
}
