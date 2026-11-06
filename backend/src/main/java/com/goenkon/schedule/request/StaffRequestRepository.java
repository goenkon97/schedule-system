// =====================================================================
// StaffRequestRepository.java：staff_requests 表的「仓库管理员」
//
// 和 EmployeeRepository、AccountRepository 一样：只写接口、不写实现。
// Spring Data JPA 启动时看方法名，自动生成 SQL，并造好一个实现了这个接口的对象，
// 放进 Spring 容器；Service 的构造方法里要一个 StaffRequestRepository，Spring 就把它塞进去。
//
// 继承来就能直接用的方法（不用写）：
//   save(申请)     → 新增（INSERT）
//   findById(id)   → 按编号找一条（撤回、改状态时用）
//   delete(申请)   → 删除（员工撤回时用）
//
// 我们自己加的只有两个「查列表」的方法，而且都要「顺便把员工一起查出来」，原因见下面。
// =====================================================================

package com.goenkon.schedule.request;

// List：列表（有顺序、可以有很多个）。查出来的申请可能有 0 条、1 条、很多条，所以用 List 装
import java.util.List;

// 【新】EntityGraph：告诉 Spring Data「这次查询，把某个关联字段也一起查出来」
import org.springframework.data.jpa.repository.EntityGraph;
// JpaRepository：提供常用增删改查方法的接口
import org.springframework.data.jpa.repository.JpaRepository;

// <StaffRequest, Long>：管理的是 StaffRequest（staff_requests 表），主键 id 是 Long 类型
public interface StaffRequestRepository extends JpaRepository<StaffRequest, Long> {

	// ---------- 员工看「我的申请」----------
	// 方法名拆开读（Spring Data 就是这样读的）：
	//   findBy          → 查询（SELECT ... FROM staff_requests）
	//   EmployeeId      → WHERE 条件：employee 字段的 id 等于参数。
	//                     StaffRequest 里没有叫 employeeId 的字段，Spring 会拆成 employee + Id，
	//                     也就是 employee.id，对应表里的 employee_id 列
	//   OrderBy...Desc  → ORDER BY created_at DESC：按提交时间倒序，最新的排最前面
	//
	// @EntityGraph(attributePaths = "employee")：
	//   employee 字段是 LAZY（默认只留一个 id 的替身）。
	//   这个注解的意思是「这一次查询，把 employee 也一起查出来」：
	//   Spring 会生成一条带 JOIN 的 SQL，申请和员工一次查完，
	//   后面要显示员工名字时，不用再一条一条去查（避免 N+1）。
	//   LAZY 是「平时不查」，@EntityGraph 是「这次需要，一起查」—— 两个配合着用
	@EntityGraph(attributePaths = "employee")
	List<StaffRequest> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);

	// ---------- 店长看「所有人的申请」----------
	//   findAll        → 查全部，没有 WHERE 条件
	//   By             → 这里后面没有条件，只是为了接上 OrderBy（Spring Data 的写法要求）
	//   OrderBy...Desc → 按提交时间倒序
	//
	// 这里 @EntityGraph 最重要：店长的列表里每一条都要显示「是谁提交的」。
	// 如果不一起查：查 50 条申请 = 1 次查申请 + 50 次查员工（每个替身各跑一趟）
	// 一起查以后：   1 次（申请 JOIN 员工）
	@EntityGraph(attributePaths = "employee")
	List<StaffRequest> findAllByOrderByCreatedAtDesc();
}
