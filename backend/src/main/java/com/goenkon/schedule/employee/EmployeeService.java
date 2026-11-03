// =====================================================================
// EmployeeService.java：员工的业务逻辑（三层里的第二层）
//
// 三层分工：
//   Controller（接待员）：收 HTTP 请求、取参数、返回 JSON —— 不写业务规则
//   Service（业务经理）  ：这里。检查业务规则、决定做什么 —— 不管 HTTP，也不写 SQL
//   Repository（仓库管理员）：只负责读写数据库
//
// 这里检查的业务规则（和 docs/business-rules.md 6.6 一致）：
//   1. 职位要和部门对得上（厨房：主厨 / 厨师 / 洗碗工；服务员：服务员 / 接待 / 店长）
//   2. 厨房的员工、店长，必须是正社员
//   3. 在职员工之间电话不能重复
//   4. 删除是软删除（只打标记，不真删）
// =====================================================================

package com.goenkon.schedule.employee;

// List：列表；Map：键值对（像 JS 的对象 / Map）；Set：不重复的集合（像 JS 的 Set）
import java.util.List;
import java.util.Map;
import java.util.Set;

// Service：标记「这个类是业务层」，Spring 启动时会自动 new 一个 EmployeeService 放进容器
import org.springframework.stereotype.Service;
// Transactional：事务（下面详细解释）
import org.springframework.transaction.annotation.Transactional;

// ApiException：我们自己写的业务错误（在 common 包里，不同的包所以要 import）
import com.goenkon.schedule.common.ApiException;

// @Service：告诉 Spring「这是业务层的类」。
//   作用和 @Component 一样（让 Spring 扫描到它、帮它 new 对象），只是名字更清楚地说明了它是哪一层。
//   Spring 容器里只会有一个 EmployeeService 对象（单例），所有请求共用它，
//   所以这个类里不能用字段保存「某一个请求」的数据（比如当前正在添加的员工），只能放 Repository 这种共用的东西。
@Service
// @Transactional(readOnly = true)：写在类上 = 这个类的每个方法默认都在一个「只读事务」里执行。
//   事务：把一个方法里的所有数据库操作当成「一件事」，要么全部成功，要么全部撤销（回滚）。
//     比如一个方法里先改了 A、再改 B，改 B 时出错了 → A 的修改也自动撤销，数据不会只改了一半。
//   readOnly = true：告诉数据库「这里只读不写」，可以做一些优化。
//   下面会改数据的方法（create / update / delete），再单独写 @Transactional（不带 readOnly），覆盖这个默认值。
@Transactional(readOnly = true)
public class EmployeeService {

	// ---------- 规则：每个部门可以选哪些职位 ----------
	// static final：所有对象共用、而且不会变的常量（常量的名字习惯全大写）
	// Map<Department, Set<Position>>：key 是部门，value 是这个部门允许的职位集合
	// Map.of(k1, v1, k2, v2)：创建一个「不能修改」的 Map；Set.of(...) 创建一个「不能修改」的 Set
	// 和前端 src/data/employees.ts 里的 positionsByDepartment 是同一份规则
	private static final Map<Department, Set<Position>> POSITIONS_BY_DEPARTMENT = Map.of(
			Department.Kitchen, Set.of(Position.Chef, Position.Cook, Position.Dishwasher),
			Department.Hall, Set.of(Position.Server, Position.Host, Position.Manager));

	// ---------- 依赖：要用到的仓库管理员 ----------
	// private final：只能在构造方法里赋值一次，以后不会被换掉
	private final EmployeeRepository employeeRepository;

	// 构造方法注入（依赖注入）：
	//   我们没有写 new EmployeeService(...)，是 Spring 启动时创建它的。
	//   Spring 看到构造方法需要一个 EmployeeRepository，就从容器里拿出它自动生成的那个 Repository 对象传进来。
	//   这样 Service 只依赖「EmployeeRepository 这个接口」，不关心它是怎么实现的（面向接口编程）。
	//   （类里只有一个构造方法时，不用写 @Autowired，Spring 自动用它）
	public EmployeeService(EmployeeRepository employeeRepository) {
		this.employeeRepository = employeeRepository;
	}

	// =================================================================
	// 查：所有在职员工（对应 GET /api/employees）
	// =================================================================
	public List<EmployeeResponse> list() {
		// 1. 让 Repository 查出所有没被删除的员工 → List<Employee>
		// 2. .stream()：变成「流」，可以像 JS 数组那样 map、filter
		// 3. .map(EmployeeResponse::from)：每个 Employee 变成一个 EmployeeResponse
		//    （等于 JS 的 list.map(e => EmployeeResponse.from(e))）
		// 4. .toList()：再收集回一个 List
		return employeeRepository.findAllByDeletedFalseOrderByIdAsc().stream()
				.map(EmployeeResponse::from)
				.toList();
	}

	// =================================================================
	// 查：某一个员工（对应 GET /api/employees/{id}）
	// =================================================================
	public EmployeeResponse get(Long id) {
		// findActive 找不到会直接 throw 404，找到了就转成响应返回
		return EmployeeResponse.from(findActive(id));
	}

	// =================================================================
	// 增：添加员工（对应 POST /api/employees）
	// =================================================================
	// @Transactional（不带 readOnly）：这个方法要写数据库，覆盖类上的「只读」
	@Transactional
	public EmployeeResponse create(EmployeeRequest request) {
		// 1. 检查部门、职位、雇佣类型的组合对不对（不对就 throw，下面的代码都不会执行）
		checkRules(request);

		// 2. 检查电话：去掉前后空格以后，有没有在职员工已经在用
		String phone = request.phone().trim();
		if (employeeRepository.existsByPhoneAndDeletedFalse(phone)) {
			throw ApiException.conflict("这个电话号码已经有其他员工在用了。");
		}

		// 3. 用 Entity 的构造方法造一个新员工对象（这时还只在内存里，id 是 null）
		Employee employee = new Employee(
				request.name().trim(),
				phone,
				request.department(),
				request.position(),
				request.employment(),
				request.status());

		// 4. save：交给 Repository 存进数据库 → Hibernate 执行 INSERT INTO employees ...
		//    （存之前会自动调用 Employee 里的 @PrePersist 方法，填好创建时间）
		//    返回的 saved 是同一个员工，但这时已经有 MySQL 分配的 id 了
		Employee saved = employeeRepository.save(employee);

		// 5. 转成响应返回（Controller 会把它变成 JSON，前端拿到新员工的 id）
		return EmployeeResponse.from(saved);
	}

	// =================================================================
	// 改：修改员工（对应 PUT /api/employees/{id}）
	// =================================================================
	@Transactional
	public EmployeeResponse update(Long id, EmployeeRequest request) {
		// 1. 先找到这个员工（找不到 → 404）
		Employee employee = findActive(id);

		// 2. 检查组合规则
		checkRules(request);

		// 3. 检查电话：除了自己以外，有没有别的在职员工在用
		//    （不排除自己的话，「电话没改、只改了名字」也会被当成重复）
		String phone = request.phone().trim();
		if (employeeRepository.existsByPhoneAndDeletedFalseAndIdNot(phone, id)) {
			throw ApiException.conflict("这个电话号码已经有其他员工在用了。");
		}

		// 4. 改内存里这个对象的字段
		employee.update(
				request.name().trim(),
				phone,
				request.department(),
				request.position(),
				request.employment(),
				request.status());

		// 5. 注意：这里没有调用 save！
		//    在事务里，从数据库查出来的对象会被 Hibernate「盯着」。
		//    方法结束、事务提交时，Hibernate 发现这个对象的字段变了，就自动执行 UPDATE。
		//    这叫「脏检查」（dirty checking）：「脏」= 改过了、和数据库里的不一样了。
		return EmployeeResponse.from(employee);
	}

	// =================================================================
	// 删：删除员工（对应 DELETE /api/employees/{id}）
	// =================================================================
	@Transactional
	public void delete(Long id) {
		// 找到员工 → 打上「已删除」标记；事务提交时同样会自动 UPDATE（deleted = true）
		// void：这个方法不返回任何东西（删除成功就行，没有数据要给前端）
		findActive(id).markDeleted();
	}

	// =================================================================
	// 下面是只在这个类里用的小工具（private：外面调用不到）
	// =================================================================

	// 按 id 找一个「没被删除」的员工，找不到就抛出 404
	private Employee findActive(Long id) {
		// findById(id) 返回 Optional<Employee>：一个「可能有、也可能没有」的盒子
		//   （Java 用它代替 null，提醒你一定要处理「找不到」的情况）
		// .filter(e -> !e.isDeleted())：盒子里的员工如果已经被删除了，就当作没有
		//   （e -> ... 是 Java 的 lambda，等于 JS 的箭头函数 (e) => ...）
		// .orElseThrow(() -> ...)：盒子是空的 → 抛出括号里的异常；不是空的 → 取出里面的员工
		return employeeRepository.findById(id)
				.filter(e -> !e.isDeleted())
				.orElseThrow(() -> ApiException.notFound("找不到这个员工（id = " + id + "）。"));
	}

	// 检查部门、职位、雇佣类型的组合
	private void checkRules(EmployeeRequest request) {
		// 规则 1：职位要在这个部门允许的职位里
		//   POSITIONS_BY_DEPARTMENT.get(部门) → 这个部门允许的职位集合
		//   .contains(职位)                    → 集合里有没有这个职位
		if (!POSITIONS_BY_DEPARTMENT.get(request.department()).contains(request.position())) {
			throw ApiException.badRequest("这个职位不属于所选的部门。");
		}

		// 规则 2：厨房的人、店长，必须是正社员
		//   枚举可以直接用 == 比较（每个枚举值在内存里只有一个对象，比较地址就行）
		//   || 是「或者」，!= 是「不等于」
		boolean mustBeFullTime = request.department() == Department.Kitchen
				|| request.position() == Position.Manager;
		if (mustBeFullTime && request.employment() != EmploymentType.fullTime) {
			throw ApiException.badRequest("厨房员工和店长必须是正社员。");
		}
	}
}
