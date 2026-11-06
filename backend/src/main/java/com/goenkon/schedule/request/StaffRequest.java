// =====================================================================
// StaffRequest.java：员工申请的 Entity —— 对应数据库里的 staff_requests 表
//
// 一行 = 一条申请：谁提交的、什么类型、哪几天、备注、处理到哪一步了、什么时候提交的。
//
// 和员工表的关系：「多对一」
//   一个员工可以提交很多条申请，每条申请只属于一个员工。
//   所以外键 employee_id 放在申请表这边（「多」的那一边）：
//
//   staff_requests                                employees
//   ┌────┬───────┬─────────────┐                ┌────┬────────────┐
//   │ id │ type  │ employee_id │ ─────────────▶ │ id │ name       │
//   │  1 │ leave │      2      │ ──┐            │  2 │ Alice Chen │
//   │  2 │ swap  │      2      │ ──┘ 都指向 2    │  3 │ Jack Wang  │
//   │  3 │ other │      3      │ ─────────────▶ │    │            │
//   └────┴───────┴─────────────┘                └────┴────────────┘
//
// 为什么类名叫 StaffRequest，不叫 Request？
//   Request 这个名字太常见了：HTTP 的请求（HttpServletRequest）、我们的 LoginRequest……
//   叫 StaffRequest（员工的申请）不容易和它们搞混。
// =====================================================================

package com.goenkon.schedule.request;

// Instant：时间点（某一瞬间，和时区无关），记提交时间、修改时间
import java.time.Instant;
// LocalDate：只有日期、没有时间，比如 2026-12-05。
//   请假、换班说的是「哪一天」，不是「哪一瞬间」：12 月 5 日请假，在哪个时区都是 12 月 5 日，
//   所以用 LocalDate 最合适。存进 MySQL 会变成 date 类型的列。
import java.time.LocalDate;

// 员工 Entity：申请要关联到「谁提交的」
import com.goenkon.schedule.employee.Employee;

// 下面是 JPA 的注解（Employee.java、Account.java 里都用过，新出现的会详细说）
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
// FetchType.LAZY：关联的员工「用到时才去查」
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
// JoinColumn：设置外键那一列（列名、能不能为空）
import jakarta.persistence.JoinColumn;
// 【新】ManyToOne：多对一 —— 很多条申请，指向同一个员工
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

// @Entity：这个类对应一张表。下次启动时 Hibernate 发现没有这张表，会自动 CREATE TABLE
@Entity
// 表名：staff_requests（复数，下划线连接 —— 数据库表名的习惯写法）
@Table(name = "staff_requests")
public class StaffRequest {

	// ---------- 主键：申请编号 ----------
	// 数据库自增：1、2、3……新建时是 null，INSERT 以后才有值
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// ---------- 谁提交的（外键 → employees 表）----------
	// @ManyToOne：多对一。很多条申请可以指向同一个员工。
	//   fetch = FetchType.LAZY（懒加载）：查申请时先不查员工表，等代码第一次用到员工的信息时才去查。
	//     @ManyToOne 默认是 EAGER（每次都顺便查员工），工作中一般都改成 LAZY，避免查很多没用的数据。
	//     代价：用到员工信息的代码，必须在事务里（Service 的方法里）执行。
	//   optional = false：每条申请一定有一个提交人，不能是 null
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	// @JoinColumn：外键这一列叫 employee_id，不能为空。
	//   这里没有 unique = true（Account 那里有）：一个员工可以有很多条申请，employee_id 当然会重复。
	//   Hibernate 建表时还会加一条外键约束：employee_id 只能填 employees 表里真的存在的 id
	@JoinColumn(name = "employee_id", nullable = false)
	private Employee employee;

	// ---------- 申请类型：请假 / 换班 / 其他 ----------
	// EnumType.STRING：存名字（"leave"），不存序号（0）—— 原因见 Employee.java
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private RequestType type;

	// ---------- 日期：可以为空 ----------
	// 没有写 nullable = false，所以这两列允许是 NULL：「其他」类型没有日期，两个都存 NULL。
	// 请假一天、换班：开始 = 结束；请假多天：开始 < 结束。
	// 「哪种类型必须有日期」这条规则放在 Service 里检查（要同时看 type 和日期两个字段）。
	private LocalDate startDate;

	private LocalDate endDate;

	// ---------- 备注：必填，最长 300 个字符 ----------
	// 300 和前端输入框的 maxLength 一样。
	// 「必填」在两个地方保证：DTO 上的 @NotBlank（请求进来时检查），这里的 nullable = false（数据库最后一道保险）
	@Column(nullable = false, length = 300)
	private String note;

	// ---------- 处理状态：等待处理 / 已沟通 ----------
	// = RequestStatus.pending：字段的默认值。new 一条新申请时，状态自动就是「等待处理」，
	// 构造方法里不用传，调用的人也没机会传错（比如员工提交时偷偷传一个 done）
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private RequestStatus status = RequestStatus.pending;

	// ---------- 提交时间 / 修改时间（和 Employee 一样，自动填）----------
	// createdAt 就是前端列表里「x 月 x 日 发送」显示的那个时间
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;

	// ---------- 构造方法 ----------
	// JPA 要求的无参构造方法：Hibernate 从数据库读出一行时，先 new 一个空对象，再把每一列填进去。
	// protected：提醒业务代码不要用它造「空申请」
	protected StaffRequest() {
	}

	// 提交申请时用：一次传进所有员工能填的内容。
	// 不传的：id（数据库给）、status（默认 pending）、createdAt / updatedAt（onCreate 自动填）
	public StaffRequest(Employee employee, RequestType type, LocalDate startDate, LocalDate endDate, String note) {
		this.employee = employee;
		this.type = type;
		this.startDate = startDate;
		this.endDate = endDate;
		this.note = note;
	}

	// ---------- 自动填时间 ----------
	// @PrePersist：第一次 INSERT 之前，Hibernate 自动调用
	@PrePersist
	void onCreate() {
		Instant now = Instant.now();
		this.createdAt = now;
		this.updatedAt = now;
	}

	// @PreUpdate：每次 UPDATE 之前，Hibernate 自动调用
	@PreUpdate
	void onUpdate() {
		this.updatedAt = Instant.now();
	}

	// ---------- 业务方法 ----------
	// 店长改状态：「标记为已沟通」或者「改回未处理」（点错了可以改回去）。
	// 只改这一个字段，不调用 save：方法在 Service 的事务里执行，结束时 Hibernate 发现状态变了，自动 UPDATE
	// （就是之前说的「拍照对比」）
	public void changeStatus(RequestStatus newStatus) {
		this.status = newStatus;
	}

	// 是不是还在等待处理？—— 员工撤回之前要检查：店长已经处理过的不能撤回
	public boolean isPending() {
		return this.status == RequestStatus.pending;
	}

	// ---------- getter：外面只能读，不能随便改 ----------
	// 没有 setter：员工提交以后，类型、日期、备注都不能再改（想改就撤回重新提交），
	// 唯一能变的只有状态，而且只能通过上面的 changeStatus 改
	public Long getId() {
		return id;
	}

	// 懒加载：返回的可能是一个「替身」，第一次调用它的方法（比如 getName()）时才去查 employees 表
	public Employee getEmployee() {
		return employee;
	}

	public RequestType getType() {
		return type;
	}

	public LocalDate getStartDate() {
		return startDate;
	}

	public LocalDate getEndDate() {
		return endDate;
	}

	public String getNote() {
		return note;
	}

	public RequestStatus getStatus() {
		return status;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
