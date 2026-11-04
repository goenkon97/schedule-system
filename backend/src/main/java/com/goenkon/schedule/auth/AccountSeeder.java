// =====================================================================
// AccountSeeder.java：第一次启动时，给每个在职员工开一个演示账号
//
// 和 EmployeeSeeder 一样是「种子数据」，只在 accounts 表是空的时候执行一次。
// 开出来的账号（密码全部是 demo1234）：
//   Sophia Liu（id 8，店长）→ manager@demo.com   ← 招聘方试用「店长视角」
//   Alice Chen（id 2，员工）→ staff@demo.com     ← 招聘方试用「员工视角」
//   其他人                  → 名.姓@demo.com，比如 Tom Lee → tom.lee@demo.com
// 角色：职位是 Manager 的人 → manager（店长），其他人 → staff（员工）
//
// 跑完以后去数据库看 password_hash 这一列，会发现：
//   24 个人的密码明明都是 demo1234，存下来的 24 个哈希却全都不一样 —— 这就是「加盐」，下面详细说。
// =====================================================================

package com.goenkon.schedule.auth;

// ArrayList：可以一个个往里加元素的列表（List.of 造出来的列表不能再加，所以这里用 ArrayList）
import java.util.ArrayList;
// List：列表接口
import java.util.List;

// CommandLineRunner：程序启动完成后，自动执行一次 run 方法
import org.springframework.boot.CommandLineRunner;
// Order：多个 CommandLineRunner 的执行顺序（数字小的先执行）
import org.springframework.core.annotation.Order;
// PasswordEncoder：密码哈希工具（PasswordConfig 里放进容器的那个 BCryptPasswordEncoder）
import org.springframework.security.crypto.password.PasswordEncoder;
// Component：交给 Spring 管理
import org.springframework.stereotype.Component;

// 要用到员工的 Entity、仓库和职位枚举（在 employee 包里，所以要 import）
import com.goenkon.schedule.employee.Employee;
import com.goenkon.schedule.employee.EmployeeRepository;
import com.goenkon.schedule.employee.Position;

@Component
// @Order(2)：在 EmployeeSeeder（@Order(1)）之后执行 —— 先有员工，才能给员工开账号
@Order(2)
public class AccountSeeder implements CommandLineRunner {

	// 所有演示账号共用的密码（只是演示用。真实系统里每个人的临时密码是随机生成的，而且绝不会写在代码里）
	private static final String DEMO_PASSWORD = "demo1234";

	// 三个依赖：账号仓库、员工仓库、密码工具。Spring 启动时按类型找到它们，通过构造方法传进来
	private final AccountRepository accountRepository;
	private final EmployeeRepository employeeRepository;
	private final PasswordEncoder passwordEncoder;

	public AccountSeeder(AccountRepository accountRepository, EmployeeRepository employeeRepository,
			PasswordEncoder passwordEncoder) {
		this.accountRepository = accountRepository;
		this.employeeRepository = employeeRepository;
		this.passwordEncoder = passwordEncoder;
	}

	@Override
	public void run(String... args) {
		// 已经有账号了（之前启动过），就什么都不做，不重复开
		if (accountRepository.count() > 0) {
			return;
		}

		// 只给「在职」（没被软删除）的员工开账号。你测试时加过又删掉的 Test Taro 不会有账号
		List<Employee> employees = employeeRepository.findAllByDeletedFalseOrderByIdAsc();

		// 先把 24 个账号都造好放进列表，最后一次存进去
		List<Account> accounts = new ArrayList<>();
		// for (类型 变量 : 列表)：「增强 for 循环」，依次取出列表里的每一个员工（相当于 JS 的 for...of）
		for (Employee employee : employees) {
			// 角色：职位是店长 → manager，其他 → staff
			//   条件 ? 值1 : 值2 —— 三元运算符，和 JS 一样
			//   枚举用 == 比较就行：每个枚举值在内存里只有一个对象，比较的是「是不是同一个对象」
			Role role = employee.getPosition() == Position.Manager ? Role.manager : Role.staff;

			// passwordEncoder.encode(...)：把密码原文变成 BCrypt 哈希。每次调用都会：
			//   1. 随机生成一个「盐」（salt）：16 个字节的随机数
			//   2. 把「盐 + 密码」一起反复计算 1024 轮（强度 10），得到结果
			//   3. 把「算法版本 + 强度 + 盐 + 结果」拼成一个 60 个字符的字符串返回：
			//        $2a$10$N9qo8uLOickgx2ZMRZoMye IjZAgcfl7p92ldGxad68LJZdL17lhWy
			//        └┬┘└┬┘└────────┬─────────┘ └──────────────┬──────────────┘
			//        版本 强度    盐（22 个字符）            计算结果（31 个字符）
			//   盐是公开存在哈希里的，它的作用不是保密，而是让「同样的密码 → 每次不同的哈希」：
			//     攻击者没法提前算好一张「常见密码 → 哈希」的对照表（彩虹表）来直接查，
			//     也看不出「哪些人用了同一个密码」，只能对每个账号单独一个个去猜，而每猜一次都很慢。
			//   这里故意每个人单独 encode 一次（24 次，启动时大概多花一两秒），
			//   就是为了让你在数据库里亲眼看到「同一个密码，24 个不同的哈希」。
			String passwordHash = passwordEncoder.encode(DEMO_PASSWORD);

			// new Account(邮箱, 哈希, 角色, 是不是临时密码, 属于哪个员工)
			//   临时密码设成 false：演示账号不需要「请修改密码」的提醒，招聘方打开就能直接用
			accounts.add(new Account(emailFor(employee), passwordHash, role, false, employee));
		}

		// saveAll：一次存进去（执行 24 条 INSERT INTO accounts ...），自带事务：中途失败就全部撤销
		accountRepository.saveAll(accounts);
	}

	// 按员工算出他的演示邮箱。private：只在这个类里面用
	private String emailFor(Employee employee) {
		// 两个演示账号用好记的固定邮箱（和前端登录页上写的一样）
		// getId() 返回的是 Long（大写，包装类型，是一个对象），所以用 equals 比较「值」：
		//   如果写 == 去比较两个 Long 对象，比的是「是不是内存里同一个对象」，值一样也可能是 false，很容易出 bug。
		//   8L：L 表示这是 long 类型的数字；传给 equals 时 Java 会自动把它包装成 Long 对象（自动装箱），再比较值。
		if (employee.getId().equals(8L)) {
			return "manager@demo.com";
		}
		if (employee.getId().equals(2L)) {
			return "staff@demo.com";
		}
		// 其他人：名字转小写，空格换成点，比如 "Charlotte Tan" → "charlotte.tan@demo.com"
		return employee.getName().toLowerCase().replace(" ", ".") + "@demo.com";
	}
}
