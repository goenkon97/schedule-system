// =====================================================================
// Schedule.java：一个月的班表 —— 对应数据库里的 schedules 表（一个月一行）
//
// 这张表只放「整个月只有一份」的信息：名字、备注、生成时的人数设置、修改时间。
// 「谁哪天上哪个班」有几百条，放在另一张表 schedule_assignments（ScheduleAssignment.java），
// 每一条用 schedule_id 指回这里：
//
//   schedules（1 行）                schedule_assignments（几百行）
//   ┌─────────┬──────────┐          ┌────┬─────────────┬────────────┬─────────┬─────────┬─────────────┐
//   │ id      │ note     │          │ id │ schedule_id │ work_date  │ slot    │ shift   │ employee_id │
//   │ 2026-12 │ 年末聚餐 │ ◀─────── │  1 │   2026-12   │ 2026-12-05 │ kitchen │ day     │      2      │
//   └─────────┴──────────┘ ◀─────── │  2 │   2026-12   │ 2026-12-05 │ kitchen │ day     │      5      │
//                                   └────┴─────────────┴────────────┴─────────┴─────────┴─────────────┘
//
// 和前端 MonthSchedule 的对照：
//   id / name / year / month / note → 这里的同名字段
//   settings.kitchenPerDay / hallPerDay → 这里拆成两个普通字段（两列）
//   days[]   → 不在这张表，拍平存进 schedule_assignments
//   status   → 不存：只有「提交」才会存进数据库，草稿一直留在浏览器里，
//              所以数据库里的班表一定是 submitted，返回时直接写死就行
//   updatedAt → 这里的 updatedAt
// =====================================================================

package com.goenkon.schedule.schedule;

// Instant：时间点（记创建、修改时间）
import java.time.Instant;
// LocalDate：只有日期（addAssignment 的参数：哪一天）
import java.time.LocalDate;
// ArrayList：可以往里加、往外删的列表（assignments 的初始值）
import java.util.ArrayList;
// List：列表接口
import java.util.List;

// 员工 Entity：addAssignment 时要传「哪个员工」
import com.goenkon.schedule.employee.Employee;

// 新出现的注解会在用到的地方详细说
// 【新】CascadeType：级联 —— 对班表做的操作（存、删）要不要「顺带」做到它下面的安排上
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
// 【新】OneToMany：一对多 —— 一个月的班表，下面有很多条安排
import jakarta.persistence.OneToMany;
// 【新】OrderBy：从数据库取出这个列表时，按什么顺序排
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
// 表名：schedules
@Table(name = "schedules")
public class Schedule {

	// ---------- 主键：年月，例如 "2026-12" ----------
	// 这次没有用自增数字（@GeneratedValue），而是直接用 "2026-12" 当主键：
	//   一个月只有一份班表，年月本身就是独一无二的；
	//   接口地址也是 /api/schedules/2026-12，拿着网址里的这一段就能直接 findById，不用再查一次
	// length = 7："2026-12" 正好 7 个字符
	@Id
	@Column(length = 7)
	private String id;

	// 年、月：其实能从 id 里拆出来，但单独存成数字列，以后按年查（WHERE year = 2026）更方便
	// int（小写）：基本类型，不能是 null，正适合「一定有值」的字段
	// （year、month 在 MySQL 里是关键字，但不是「保留字」，可以直接当列名用）
	@Column(nullable = false)
	private int year;

	@Column(nullable = false)
	private int month;

	// 名字：前端自动生成的「2026年12月 班表」
	@Column(nullable = false, length = 40)
	private String name;

	// 月备注：可以是空字符串，最长 200 字
	@Column(nullable = false, length = 200)
	private String note = "";

	// 生成班表时用的人数设置（前端 settings 里的两个数字），拆成两列
	@Column(nullable = false)
	private int kitchenPerDay;

	@Column(nullable = false)
	private int hallPerDay;

	// ---------- 这个月的所有安排（一对多）----------
	// @OneToMany：一个班表 → 很多条安排。和申请那里的 @ManyToOne 正好是同一段关系的两头：
	//   ScheduleAssignment 那边写 @ManyToOne Schedule schedule（很多条安排 → 属于一个月）
	//   这边写 @OneToMany List<ScheduleAssignment>（一个月 → 很多条安排）
	//
	// mappedBy = "schedule"：
	//   外键 schedule_id 这一列在对方的表里，由对方的 schedule 字段管。
	//   这里只是「反过来看」的一个列表，schedules 表里不会多出任何列。
	//
	// cascade = CascadeType.ALL（级联）：
	//   对班表 save，列表里的新安排也一起 INSERT；对班表 delete，它下面的安排也一起 DELETE。
	//   就像删一个文件夹，里面的文件跟着一起删，不用一个个去删。
	//
	// orphanRemoval = true（删除孤儿）：
	//   从这个列表里移除的安排（不属于任何班表了，像「孤儿」），Hibernate 会自动去数据库里 DELETE 掉。
	//   重新提交一个月时，我们先 clear() 清空列表，旧的几百行就会被自动删掉。
	//
	// 默认就是 LAZY（一对多的默认值本来就是「用到才查」，不用像 @ManyToOne 那样手动改）
	@OneToMany(mappedBy = "schedule", cascade = CascadeType.ALL, orphanRemoval = true)
	// @OrderBy：查出来时按日期、再按 id 排好（id 是插入的顺序），组装成每一天时顺序就是对的
	@OrderBy("workDate ASC, id ASC")
	// = new ArrayList<>()：一开始就是一个空列表，不是 null，后面直接 add 不会报 NullPointerException
	private List<ScheduleAssignment> assignments = new ArrayList<>();

	// ---------- 创建时间 / 修改时间 ----------
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;

	// ---------- 构造方法 ----------
	// JPA 要求的无参构造方法（Hibernate 从数据库读出一行时先 new 一个空对象再填值）
	protected Schedule() {
	}

	// 第一次提交某个月时用：先确定是哪个月，其他内容由 updateInfo 填
	public Schedule(String id, int year, int month) {
		this.id = id;
		this.year = year;
		this.month = month;
	}

	// 第一次 INSERT 之前，Hibernate 自动调用：填创建时间
	@PrePersist
	void onCreate() {
		Instant now = Instant.now();
		this.createdAt = now;
		this.updatedAt = now;
	}

	// ---------- 业务方法 ----------

	// 更新这个月自己的信息（名字、备注、人数设置），同时把修改时间改成现在。
	// 为什么不像 Employee 那样用 @PreUpdate 自动改修改时间？
	//   重新提交时，很可能只有「安排」变了，这张表自己的字段一个都没变，
	//   Hibernate 觉得这一行没变，就不会 UPDATE，@PreUpdate 也就不会被调用。
	//   所以这里每次都手动把 updatedAt 设成现在，保证「提交了 = 修改时间变了」
	public void updateInfo(String name, String note, int kitchenPerDay, int hallPerDay) {
		this.name = name;
		this.note = note;
		this.kitchenPerDay = kitchenPerDay;
		this.hallPerDay = hallPerDay;
		this.updatedAt = Instant.now();
	}

	// 清空这个月所有的安排（重新提交时先调用它）。
	// 因为有 orphanRemoval = true，事务结束时 Hibernate 会把这些旧行从数据库里 DELETE 掉
	public void clearAssignments() {
		assignments.clear();
	}

	// 加一条安排：「date 这一天，slot 这一组，shift 这个班，employee 上班」
	// 为什么不让外面直接 new ScheduleAssignment 再 add 进列表？
	//   一段关系有两头（这边的列表、那边的 schedule 字段），两头都要设对。
	//   只往列表里 add、忘了设对方的 schedule 字段，存的时候 schedule_id 就是空的。
	//   所以统一从这里加：new 的时候把 this（这个班表）传进去，两头一次设好
	public void addAssignment(LocalDate date, Slot slot, ShiftType shift, Employee employee) {
		assignments.add(new ScheduleAssignment(this, date, slot, shift, employee));
	}

	// ---------- getter ----------
	public String getId() {
		return id;
	}

	public int getYear() {
		return year;
	}

	public int getMonth() {
		return month;
	}

	public String getName() {
		return name;
	}

	public String getNote() {
		return note;
	}

	public int getKitchenPerDay() {
		return kitchenPerDay;
	}

	public int getHallPerDay() {
		return hallPerDay;
	}

	// 返回安排列表（懒加载：第一次用到时才去查 schedule_assignments 表，除非查询时用 @EntityGraph 一起查了）
	public List<ScheduleAssignment> getAssignments() {
		return assignments;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
