// =====================================================================
// Account.java：登录账号的 Entity —— 对应数据库里的 accounts 表
//
// 为什么账号和员工分成两张表（而不是在 employees 表里加 email、密码两列）？
//   员工（employees）= 店里有这个人：名字、电话、部门、职位……    → 排班要用
//   账号（accounts） = 这个人能登录系统：邮箱、密码、角色……       → 登录要用
//   分开的好处：
//     1. 不是每个员工都需要账号（比如刚来的兼职，先排班，以后再开账号）
//     2. 密码这种敏感数据单独放，查员工列表时根本不会碰到它，不会不小心返回给前端
//     3. 「员工管理」和「登录权限」两块代码互不影响，各改各的
//
// 两张表怎么连起来？—— accounts 表里有一列 employee_id，存的是 employees 表的 id：
//
//   accounts                                   employees
//   ┌────┬──────────────────┬─────────────┐     ┌────┬────────────┐
//   │ id │ email            │ employee_id │ ──▶ │ id │ name       │
//   │  1 │ manager@demo.com │      8      │ ──▶ │  8 │ Sophia Liu │
//   │  2 │ staff@demo.com   │      2      │ ──▶ │  2 │ Alice Chen │
//   └────┴──────────────────┴─────────────┘     └────┴────────────┘
//
//   这种「存别的表的主键」的列叫做「外键」（foreign key）。
//   数据库会帮我们把关：employee_id 只能填 employees 表里真的存在的 id，填 999 会被拒绝。
//   一个员工最多一个账号，一个账号只属于一个员工 → 「一对一」关系。
// =====================================================================

package com.goenkon.schedule.auth;

// Instant：时间点类型（和 Employee 里的 createdAt 一样），记创建、修改时间
import java.time.Instant;

// Employee：员工 Entity，在另一个包（employee）里，所以要 import
// （同一个项目里的类也要 import，只有同一个包里的类才不用）
import com.goenkon.schedule.employee.Employee;

// 下面都是 JPA 的注解（Employee.java 里已经讲过的这里简单说，新出现的详细说）
// Column：设置字段对应的列
import jakarta.persistence.Column;
// Entity：这个类是一张表
import jakarta.persistence.Entity;
// EnumType / Enumerated：枚举存名字（"manager"），不存序号
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
// 【新】FetchType：关联的另一张表的数据「什么时候查」—— 马上查（EAGER）还是用到时再查（LAZY）
import jakarta.persistence.FetchType;
// GeneratedValue / GenerationType：主键由数据库自增
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
// Id：主键
import jakarta.persistence.Id;
// 【新】JoinColumn：设置「外键那一列」叫什么名字、能不能为空、要不要唯一
import jakarta.persistence.JoinColumn;
// 【新】OneToOne：标记「这个字段和另一个 Entity 是一对一的关系」
import jakarta.persistence.OneToOne;
// PrePersist / PreUpdate：INSERT / UPDATE 之前自动调用的方法
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
// Table：表名
import jakarta.persistence.Table;

// @Entity：这个类对应一张表。下次启动时，Hibernate 发现数据库里没有这张表，
// 就会按 ddl-auto=update 自动执行 CREATE TABLE accounts (...)，启动日志里能看到这句 SQL
@Entity
// 表名 accounts（复数：装的是很多个账号）
@Table(name = "accounts")
public class Account {

	// ---------- 主键 ----------
	// 账号自己的编号（和员工 id 是两套编号，互不相干：Sophia 的员工 id 是 8，账号 id 可能是 1）
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// ---------- 登录用的邮箱 ----------
	// unique = true：建表时加「唯一约束」（UNIQUE），数据库层面保证不会有两个账号用同一个邮箱。
	//   和员工的电话不同：账号不做软删除（不需要保留历史），所以可以放心加唯一约束。
	//   数据库会为唯一约束自动建一个「索引」—— 相当于书后面的目录：
	//   登录时按邮箱找账号，不用一行行翻整张表，而是直接按目录跳到那一行（数据多了也很快）。
	// length = 100：VARCHAR(100)，邮箱最长 100 个字符
	// 存的时候统一转成小写（在构造方法里做），这样 Manager@Demo.com 和 manager@demo.com 算同一个
	@Column(nullable = false, unique = true, length = 100)
	private String email;

	// ---------- 密码的「哈希值」（不是密码本身！）----------
	// 数据库里永远不存密码原文。存的是密码经过 BCrypt 算出来的一串字符，比如：
	//   $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
	// 这个计算是「单向」的：从密码能算出这串字符，但从这串字符算不回密码。
	// 登录时：把用户输入的密码再算一次，看结果对不对得上（下一步讲 BCrypt 时详细说）。
	// BCrypt 的结果固定是 60 个字符，这里留到 100，以后换更强的算法也放得下。
	// Java 字段名 passwordHash → 列名自动变成 password_hash（驼峰转下划线）
	@Column(nullable = false, length = 100)
	private String passwordHash;

	// ---------- 角色（权限）----------
	// manager / staff，存名字。MySQL 上和员工表一样，会建成 enum('manager','staff') 类型的列
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Role role;

	// ---------- 是不是临时密码 ----------
	// 店长给新员工开账号时，会设一个临时密码（当面告诉他）。
	// true → 前端登录后显示「请修改密码」的提醒；员工自己改过密码后变成 false。
	// （我们选的是「提醒但不强制」：不改也能正常使用）
	@Column(nullable = false)
	private boolean passwordTemporary;

	// ---------- 属于哪个员工（外键）----------
	// 这是这一篇里最新的东西：字段的类型不是 Long，而是 Employee（另一个 Entity）。
	//   数据库里：accounts 表存的只是一个数字 employee_id
	//   Java 里：我们直接拿到一个 Employee 对象，account.getEmployee().getName() 就能拿到名字，
	//           「拿 employee_id 再去 employees 表查一次」这件事由 Hibernate 替我们做。
	//
	// @OneToOne：一对一关系（一个账号 ↔ 一个员工）
	//   fetch = FetchType.LAZY（懒加载）：
	//     查账号的时候，先不去查员工表；等代码第一次真的调用 getEmployee().getName() 时，
	//     Hibernate 才去执行 SELECT ... FROM employees WHERE id = ?。
	//     好处：登录时只需要比对密码，大多数时候根本用不到员工信息，就省了一次查询。
	//     代价：「用到时再查」必须发生在数据库连接还开着的时候 —— 也就是 @Transactional 的方法里面。
	//           如果在事务外面才第一次用（比如 Controller 里），会报 LazyInitializationException。
	//           所以我们的规矩是：在 Service 里把需要的信息都取出来，装进 DTO，再交给 Controller。
	//     （不写的话，@OneToOne 默认是 EAGER：每次查账号都顺便 JOIN 查员工）
	//   optional = false：账号一定属于某个员工，不能是 null
	@OneToOne(fetch = FetchType.LAZY, optional = false)
	// @JoinColumn：设置外键这一列
	//   name = "employee_id" → 列名（不写也会自动叫 employee_id，写出来一眼看清楚）
	//   nullable = false     → NOT NULL
	//   unique = true        → 唯一：同一个员工不能有两个账号（这才真正保证了「一对一」）
	// 建表时 Hibernate 还会加一条外键约束：FOREIGN KEY (employee_id) REFERENCES employees (id)
	@JoinColumn(name = "employee_id", nullable = false, unique = true)
	private Employee employee;

	// ---------- 创建 / 修改时间（和 Employee 一样）----------
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;

	// ---------- 构造方法 ----------
	// JPA 要求的无参构造方法：Hibernate 从数据库读出一行时，先 new 一个空对象，再一列列填字段
	protected Account() {
	}

	// 新建账号时用。注意第二个参数是「已经算好的哈希」，不是密码原文：
	// 把密码变成哈希这件事放在 Service 里做，Entity 只负责存，永远碰不到密码原文。
	public Account(String email, String passwordHash, Role role, boolean passwordTemporary, Employee employee) {
		// trim()：去掉前后的空格；toLowerCase()：全部转小写。统一格式以后再存，查的时候也按同样规则转
		this.email = email.trim().toLowerCase();
		this.passwordHash = passwordHash;
		this.role = role;
		this.passwordTemporary = passwordTemporary;
		this.employee = employee;
	}

	// ---------- 自动填时间 ----------
	// @PrePersist：第一次 INSERT 之前，Hibernate 自动调用 —— 创建时间和修改时间都设成现在
	@PrePersist
	void onCreate() {
		// Instant.now()：读电脑当前的时间（操作系统时钟），得到一个 UTC 时间点
		this.createdAt = Instant.now();
		this.updatedAt = this.createdAt;
	}

	// @PreUpdate：每次 UPDATE 之前，Hibernate 自动调用 —— 修改时间更新成现在
	@PreUpdate
	void onUpdate() {
		this.updatedAt = Instant.now();
	}

	// ---------- 业务方法 ----------
	// 修改密码：换成新的哈希，并且不再是临时密码（前端的「请修改密码」提醒就消失了）。
	// 不提供 setPasswordHash() 这种随便改的方法，而是只提供「改密码」这一个有意义的动作，
	// 这样「改了密码却忘了把 passwordTemporary 改成 false」这种错误就不可能发生。
	public void changePassword(String newPasswordHash) {
		this.passwordHash = newPasswordHash;
		this.passwordTemporary = false;
	}

	// ---------- getter：外面只能读，不能直接改 ----------
	public Long getId() {
		return id;
	}

	public String getEmail() {
		return email;
	}

	// 只在 Service 里比对密码时用。绝对不要把它放进返回给前端的 DTO 里。
	public String getPasswordHash() {
		return passwordHash;
	}

	public Role getRole() {
		return role;
	}

	// boolean 类型的 getter 习惯写成 isXxx()，而不是 getXxx()
	public boolean isPasswordTemporary() {
		return passwordTemporary;
	}

	// 懒加载：返回的可能是 Hibernate 造的「代理对象」（一个替身，长得和 Employee 一样），
	// 第一次调用它的方法（比如 getName()）时，才真正去数据库查。必须在事务里调用。
	public Employee getEmployee() {
		return employee;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
