// =====================================================================
// StaffRequestService.java：员工申请的「业务规则」都在这里
//
// 分工回顾（从外到里，一层只管一类事）：
//   门卫 AuthInterceptor  → 你是谁？有没有权限？（@ManagerOnly 在那里检查）
//   DTO 上的注解          → 单个栏目填得对不对（type 必须有、备注必填、最多 300 字）
//   这里 Service          → 要同时看好几个栏目、或者要查数据库才能判断的规则：
//       1. 请假 / 换班必须有日期，「其他」不能有日期
//       2. 换班只能选一天；结束日期不能早于开始日期
//       3. 只能撤回自己的申请（要查数据库：这条申请是谁的）
//       4. 店长已经处理过的申请不能撤回
//
// 方法和 Controller 的 5 个接口一一对应：
//   listMine     → GET    /api/requests/mine
//   listAll      → GET    /api/requests
//   create       → POST   /api/requests
//   changeStatus → PATCH  /api/requests/{id}/status
//   cancel       → DELETE /api/requests/{id}
// =====================================================================

package com.goenkon.schedule.request;

// List：列表
import java.util.List;
// Objects：Java 自带的小工具类，这里用 Objects.equals 安全地比较两个 Long（原因见 cancel 方法）
import java.util.Objects;

// Service：告诉 Spring「这是业务层的类，帮我 new 一个放进容器」
import org.springframework.stereotype.Service;
// Transactional：事务 —— 方法里对数据库的所有操作，要么全部成功，要么全部撤销；
// 同时也是懒加载替身能去查数据库的「营业时间」
import org.springframework.transaction.annotation.Transactional;

// 统一的错误：notFound(404) / badRequest(400) / forbidden(403) / conflict(409)
import com.goenkon.schedule.common.ApiException;
// 员工的 Entity 和仓库：提交申请时要找到「提交人」这个员工
import com.goenkon.schedule.employee.Employee;
import com.goenkon.schedule.employee.EmployeeRepository;

@Service
// 整个类默认是「只读事务」：查询方法不用一个个写。
// 下面要改数据的方法（create / changeStatus / cancel）单独贴 @Transactional，覆盖成「可以写」
@Transactional(readOnly = true)
public class StaffRequestService {

	// 两个依赖：申请仓库、员工仓库。Spring 启动时按类型找到它们，通过构造方法传进来
	private final StaffRequestRepository requestRepository;
	private final EmployeeRepository employeeRepository;

	public StaffRequestService(StaffRequestRepository requestRepository, EmployeeRepository employeeRepository) {
		this.requestRepository = requestRepository;
		this.employeeRepository = employeeRepository;
	}

	// ---------- 员工：看自己的申请 ----------
	// employeeId 从通行证里来（Controller 传进来），不是前端随便传的 → 只能看到自己的
	public List<StaffRequestResponse> listMine(Long employeeId) {
		// 查出来是 List<StaffRequest>（Entity），一个个转成 StaffRequestResponse（DTO）再返回
		//   .stream()                         → 变成「流水线」，可以一个个加工
		//   .map(StaffRequestResponse::from)  → 每一个都交给 from 方法加工（和 JS 的 list.map(r => from(r)) 一样）
		//   .toList()                         → 加工完再装回列表
		// 这一步在事务里执行，而且 Repository 用了 @EntityGraph，员工名字已经一起查出来了
		return requestRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId).stream()
				.map(StaffRequestResponse::from)
				.toList();
	}

	// ---------- 店长：看所有人的申请 ----------
	// 「只有店长能调」已经由 Controller 上的 @ManagerOnly + 门卫保证了，这里不用再检查
	public List<StaffRequestResponse> listAll() {
		return requestRepository.findAllByOrderByCreatedAtDesc().stream()
				.map(StaffRequestResponse::from)
				.toList();
	}

	// ---------- 员工：提交申请 ----------
	// @Transactional（不带 readOnly）：这个方法要往数据库里写
	@Transactional
	public StaffRequestResponse create(Long employeeId, StaffRequestInput input) {
		// 1. 先检查日期规则（不对就直接抛 400，后面都不执行）
		checkDates(input);

		// 2. 找到提交人。为什么还要查一次？通行证有效期 12 小时，
		//    这期间店长可能已经把这个员工删了（软删除），被删的人不应该还能提交申请
		Employee employee = employeeRepository.findById(employeeId)
				.filter(e -> !e.isDeleted())
				.orElseThrow(() -> ApiException.forbidden("你的员工资料已经不存在，不能提交申请。"));

		// 3. 造一条新申请。状态不用传，Entity 里默认就是 pending；
		//    备注去掉首尾空格再存（"  回老家  " → "回老家"）
		StaffRequest request = new StaffRequest(
				employee,
				input.type(),
				input.startDate(),
				input.endDate(),
				input.note().trim());

		// 4. save → INSERT。返回的对象带着数据库给的 id 和自动填的 createdAt
		StaffRequest saved = requestRepository.save(request);
		return StaffRequestResponse.from(saved);
	}

	// ---------- 店长：改处理状态（标记为已沟通 / 改回未处理）----------
	@Transactional
	public StaffRequestResponse changeStatus(Long id, RequestStatus status) {
		StaffRequest request = findById(id);
		// 只改对象的字段，不用调用 save：
		// 方法结束、事务提交时，Hibernate 把对象和刚查出来时的「照片」对比，发现 status 变了，自动 UPDATE
		request.changeStatus(status);
		// from 里会调用 getEmployee().getName()：findById 没用 @EntityGraph，员工是替身，
		// 这里会多查一次员工表 —— 只有一条，没关系（N+1 只在列表里才是问题）
		return StaffRequestResponse.from(request);
	}

	// ---------- 员工：撤回申请 ----------
	// employeeId = 通行证上的「我是谁」
	@Transactional
	public void cancel(Long id, Long employeeId) {
		StaffRequest request = findById(id);

		// 规则 3：只能撤回自己的。门卫只知道「你是员工」，不知道这条申请是谁的，所以要在这里比较
		//   为什么用 Objects.equals，不用 ==？
		//   Long 是对象，== 比的是「是不是同一个对象」（地址），不是「数字是不是一样」。
		//   Java 只会把 -128 ~ 127 的 Long 缓存成同一个对象，超过 127 的两个 Long(200) 用 == 比会得到 false！
		//   所以比较 Long、String 这种对象的「值」，一律用 equals。
		//   （getId() 是替身本来就知道的，不会查员工表）
		if (!Objects.equals(request.getEmployee().getId(), employeeId)) {
			// 403：不是你的，不准撤回
			throw ApiException.forbidden("只能撤回自己的申请。");
		}

		// 规则 4：店长已经处理过的不能撤回 → 409（冲突：和数据现在的状态冲突）
		if (!request.isPending()) {
			throw ApiException.conflict("店长已经处理过这条申请，不能撤回了。");
		}

		// 真的删掉这一行（DELETE）。申请撤回就是「当作没发过」，不需要像员工那样软删除
		requestRepository.delete(request);
	}

	// ---------- 下面是这个类自己用的小方法（private：外面调用不到）----------

	// 按编号找申请，找不到就 404
	private StaffRequest findById(Long id) {
		return requestRepository.findById(id)
				.orElseThrow(() -> ApiException.notFound("找不到这条申请（id = " + id + "）。"));
	}

	// 日期规则（规则 1、2）。和前端 MyProfile.tsx 里的 dateMode 是同一套规则：
	//   前端检查是为了用户体验（按钮变灰），后端再检查是为了安全（别人可以用 curl 绕过前端）
	private void checkDates(StaffRequestInput input) {
		// 先取出来放进变量，下面读起来短一点
		var start = input.startDate();
		var end = input.endDate();
		// var：让 Java 自己推断类型（这里推断出来是 LocalDate），和 JS 的 let 有点像，但类型一旦定了就不能变

		// 「其他」：不能有日期
		if (input.type() == RequestType.other) {
			if (start != null || end != null) {
				throw ApiException.badRequest("「其他」类型不用填日期。");
			}
			// 其他类型检查到这里就结束了
			return;
		}

		// 请假、换班：开始和结束都要有（只请一天时，前端会把开始 = 结束一起传过来）
		if (start == null || end == null) {
			throw ApiException.badRequest("请选择日期。");
		}

		// 换班：只能是一天
		//   LocalDate 也是对象，比较「是不是同一天」用 equals
		if (input.type() == RequestType.swap && !start.equals(end)) {
			throw ApiException.badRequest("换班只能选一天。");
		}

		// 结束不能早于开始。isBefore：「end 在 start 之前吗？」
		if (end.isBefore(start)) {
			throw ApiException.badRequest("结束日期不能早于开始日期。");
		}
	}
}
