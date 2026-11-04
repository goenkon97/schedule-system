// =====================================================================
// AccountRepository.java：accounts 表的「仓库管理员」（和 EmployeeRepository 一个道理）
//
// 只写接口、不写实现：Spring Data JPA 启动时按方法名自动生成 SQL，
// 并 new 好一个实现了这个接口的对象放进 Spring 容器，Service 里注入就能用。
// 继承来的 save、findById、count 等方法也都能直接用。
// =====================================================================

package com.goenkon.schedule.auth;

// Optional：「可能有、也可能没有」的盒子。
// 按邮箱找账号时，这个邮箱可能根本没注册过，所以返回 Optional<Account> 而不是 Account：
//   有 → 盒子里装着那个账号；没有 → 一个空盒子（而不是 null）。
// 调用的人被「逼着」处理找不到的情况（orElseThrow 等），不会因为忘了判断 null 而报 NullPointerException。
import java.util.Optional;

// JpaRepository：提供常用增删改查方法的接口
import org.springframework.data.jpa.repository.JpaRepository;

// <Account, Long>：管理的是 Account 表，主键是 Long 类型
public interface AccountRepository extends JpaRepository<Account, Long> {

	// 登录时用：按邮箱找账号
	//   findBy + Email → SELECT ... FROM accounts WHERE email = ?
	// email 列有唯一约束（自带索引），所以这个查询很快，而且最多只会找到一个
	Optional<Account> findByEmail(String email);

	// 开账号时用：这个邮箱是不是已经被用了 → SELECT 有没有 ... WHERE email = ?
	boolean existsByEmail(String email);

	// 「我是谁」/ 员工页显示账号信息时用：按员工 id 找他的账号
	//   findBy + Employee + Id：Spring 会顺着 Account 的 employee 字段，再找到 Employee 的 id
	//   → SELECT ... FROM accounts WHERE employee_id = ?
	//   （不用 JOIN employees 表：employee_id 这一列就在 accounts 表里）
	Optional<Account> findByEmployeeId(Long employeeId);
}
