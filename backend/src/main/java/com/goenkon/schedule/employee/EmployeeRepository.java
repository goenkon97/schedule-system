// =====================================================================
// EmployeeRepository.java：员工表的「仓库管理员」，只负责读写数据库
//
// 神奇的地方：这是一个 interface（接口），只有方法的名字，没有任何实现代码。
// Spring Data JPA 启动时会自动帮我们生成一个实现这个接口的类，并 new 好一个对象放进 Spring 容器，
// 我们在 Service 里直接拿来用就行（启动日志里的 "Found 1 JPA repository interface" 说的就是它）。
//
// 它从哪里知道每个方法要执行什么 SQL？两个来源：
//   1. 继承来的方法：JpaRepository 已经提供了 save、findById、findAll、deleteById、count……
//   2. 我们自己写的方法：Spring 按方法名「翻译」成 SQL（下面有例子）
// =====================================================================

package com.goenkon.schedule.employee;

// List：Java 的「列表」，相当于 JS 的数组。查询多行数据时返回它。
import java.util.List;

// JpaRepository：Spring Data JPA 提供的接口，里面已经定义好了常用的增删改查方法
import org.springframework.data.jpa.repository.JpaRepository;

// interface ... extends JpaRepository<Employee, Long>
//   <Employee, Long> 是泛型参数：
//     Employee → 这个仓库管理的是 Employee 这张表
//     Long     → 这张表的主键（id）是 Long 类型
//   继承以后，这个接口就自动拥有了：
//     save(employee)      → 新对象执行 INSERT，已有 id 的对象执行 UPDATE
//     findById(id)        → SELECT ... WHERE id = ?，返回 Optional（可能找不到）
//     findAll()           → SELECT * FROM employees
//     ……等等
// 不用写 @Repository 注解：继承了 JpaRepository，Spring 就认得它。
public interface EmployeeRepository extends JpaRepository<Employee, Long> {

	// 方法名就是查询条件，Spring 会按单词拆开翻译成 SQL：
	//   findAll              → SELECT ... FROM employees
	//   By DeletedFalse      → WHERE deleted = false        （只要没被删除的）
	//   OrderBy Id Asc       → ORDER BY id ASC              （按 id 从小到大排）
	// 名字拼错（比如写成 DeletdFalse），启动时就会报错，不会等到运行时才发现。
	List<Employee> findAllByDeletedFalseOrderByIdAsc();

	// exists + By + PhoneAndDeletedFalse
	//   → SELECT 有没有 ... WHERE phone = ? AND deleted = false
	//   返回 true / false：有没有在职员工已经在用这个电话（添加员工时检查用）
	// 参数 phone 会按顺序填进 SQL 里的 ?（参数化查询，自动防止 SQL 注入）
	boolean existsByPhoneAndDeletedFalse(String phone);

	// 编辑员工时检查电话：除了自己以外（IdNot），还有没有别的在职员工在用这个电话
	//   → WHERE phone = ? AND deleted = false AND id <> ?
	boolean existsByPhoneAndDeletedFalseAndIdNot(String phone, Long id);
}
