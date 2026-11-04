// =====================================================================
// EmployeeSeeder.java：第一次启动时，往空的 employees 表里放进 24 个初始员工
//
// 「seed（种子）数据」：开发和演示用的初始数据。
// 这里的 24 个人和前端 src/data/employees.ts 里的假数据完全一样，
// 而且按原来的 id 顺序（1 → 24）插入，所以 MySQL 自动分配的 id 也是 1 ~ 24，和前端对得上。
//
// 只在表是空的时候才放：已经有数据了（比如你加过、删过员工）就什么都不做，
// 所以每次重启不会重复插入。想重新来一遍：清空 employees 表再启动就行。
// =====================================================================

package com.goenkon.schedule.employee;

// 「静态导入」：import static 类名.*;
//   把 Department、Position、EmploymentType、EmployeeStatus 这四个枚举里的值直接导入进来，
//   下面就可以写 Kitchen、Chef、fullTime，而不用每次都写 Department.Kitchen、Position.Chef……
//   （24 行数据，每行少写很多字，更好读）
//   .* 的意思是「这个枚举里所有的值」。四个枚举里的值没有重名，所以不会冲突。
import static com.goenkon.schedule.employee.Department.*;
import static com.goenkon.schedule.employee.EmployeeStatus.*;
import static com.goenkon.schedule.employee.EmploymentType.*;
import static com.goenkon.schedule.employee.Position.*;

// List：用来装 24 个员工，一次全部存进去
import java.util.List;

// CommandLineRunner：Spring Boot 提供的接口。实现了它的类，会在程序启动完成之后自动执行一次 run 方法。
//   用来做「启动后马上要做的事」，比如放初始数据。
import org.springframework.boot.CommandLineRunner;
// Order：多个 CommandLineRunner 时，规定「谁先执行」（数字小的先执行）
import org.springframework.core.annotation.Order;
// Component：最普通的「交给 Spring 管理」的注解（@Service、@RestController 本质上都是它的特殊版本）
import org.springframework.stereotype.Component;

// @Component：让 Spring 扫描到它、new 一个对象放进容器。
//   Spring 发现它实现了 CommandLineRunner，启动完成后就会调用它的 run 方法。
@Component
// @Order(1)：第一个执行。
//   因为 AccountSeeder（@Order(2)）要给员工开账号，必须等员工先存进数据库。
//   不写 @Order 的话，两个 Seeder 谁先执行是不确定的：
//   如果账号先执行，那时员工表还是空的，就一个账号都开不出来。
@Order(1)
// implements CommandLineRunner：实现这个接口 = 承诺「我有一个 run 方法」
public class EmployeeSeeder implements CommandLineRunner {

	// 要用到的仓库管理员（构造方法注入）
	private final EmployeeRepository employeeRepository;

	public EmployeeSeeder(EmployeeRepository employeeRepository) {
		this.employeeRepository = employeeRepository;
	}

	// @Override：表示这个方法是「实现接口里的方法」。
	//   不写也能运行，但写了以后，如果方法名或参数写错了（没对上接口），编译器会提醒你。
	// String... args：「可变参数」，可以传 0 个或很多个字符串（启动时的命令行参数，这里用不到）
	@Override
	public void run(String... args) {
		// count()：SELECT COUNT(*) FROM employees，表里已经有几行（包括软删除的）
		// 已经有数据就直接结束，不重复插入
		if (employeeRepository.count() > 0) {
			return;
		}

		// List.of(...)：一次创建一个装着 24 个员工的列表（顺序就是插入的顺序 → id 1 ~ 24）
		List<Employee> employees = List.of(
				//                    姓名             电话            部门      职位        雇佣类型   状态
				new Employee("Tom Lee",       "555-123-4567", Kitchen, Chef,       fullTime, active),   // 1
				new Employee("Alice Chen",    "555-234-5678", Hall,    Server,     fullTime, active),   // 2（员工演示账号）
				new Employee("Jack Wang",     "555-345-6789", Kitchen, Cook,       fullTime, active),   // 3
				new Employee("Emily Zhang",   "555-456-7890", Hall,    Server,     partTime, onLeave),  // 4
				new Employee("Mike Chen",     "555-567-8901", Kitchen, Dishwasher, fullTime, active),   // 5
				new Employee("Lisa Sun",      "555-678-9012", Hall,    Host,       partTime, active),   // 6
				new Employee("David Kim",     "555-789-0123", Kitchen, Cook,       fullTime, active),   // 7
				new Employee("Sophia Liu",    "555-890-1234", Hall,    Manager,    fullTime, active),   // 8（店长演示账号）
				new Employee("Daniel Ho",     "555-901-2345", Hall,    Host,       partTime, onLeave),  // 9
				new Employee("Charlotte Tan", "555-012-3456", Kitchen, Cook,       fullTime, active),   // 10
				new Employee("Benjamin Wong", "555-111-2233", Hall,    Server,     partTime, active),   // 11
				new Employee("Aiden Lee",     "555-222-3344", Hall,    Server,     fullTime, active),   // 12
				new Employee("Grace Park",    "555-333-4455", Kitchen, Chef,       fullTime, active),   // 13
				new Employee("Ryan Zhao",     "555-444-5566", Hall,    Server,     partTime, active),   // 14
				new Employee("Olivia Huang",  "555-555-6677", Hall,    Host,       partTime, active),   // 15
				new Employee("Kevin Lin",     "555-666-7788", Hall,    Server,     partTime, active),   // 16
				new Employee("Hannah Xu",     "555-777-8899", Hall,    Server,     partTime, active),   // 17
				new Employee("Lucas Yang",    "555-888-9900", Kitchen, Cook,       fullTime, active),   // 18
				new Employee("Mia Wu",        "555-999-0011", Hall,    Host,       partTime, active),   // 19
				new Employee("Ethan Guo",     "555-101-2020", Hall,    Server,     partTime, active),   // 20
				new Employee("Chloe Ma",      "555-202-3030", Hall,    Manager,    fullTime, active),   // 21
				new Employee("Nathan Shi",    "555-303-4040", Hall,    Server,     partTime, active),   // 22
				new Employee("Zoe He",        "555-404-5050", Kitchen, Dishwasher, fullTime, onLeave),  // 23
				new Employee("Leo Feng",      "555-505-6060", Hall,    Server,     partTime, active));  // 24

		// saveAll：一次存进去（Hibernate 会按顺序执行 24 条 INSERT），自带事务：中途失败就全部撤销
		employeeRepository.saveAll(employees);
	}
}
