// =====================================================================
// ScheduleAssignment.java：一条排班安排 —— 对应 schedule_assignments 表
//
// 一行 = 「哪个月的班表、哪一天、哪一组、哪个班、谁」。
// 前端那棵嵌套的树（一天 → 厨房 / 服务员 / 兼职 → 白班 / 晚班 → 员工 id），
// 拍平以后，树最底下的每一个员工 id 就变成这里的一行。
//
// 它有两个「多对一」：
//   很多条安排 → 属于同一个月的班表（schedule_id → schedules.id）
//   很多条安排 → 是同一个员工（employee_id → employees.id）
// 两个都是只存编号、用到时再查（和申请表的 employee 是同一个写法）。
// =====================================================================

package com.goenkon.schedule.schedule;

// LocalDate：只有日期（哪一天上班）
import java.time.LocalDate;

// 员工 Entity
import com.goenkon.schedule.employee.Employee;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
// 【新】Index：给某几列建「索引」（像书后面的目录，查得快）
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "schedule_assignments",
		// indexes：建表时顺便建一个索引，名字叫 idx_assignment_employee_date，按「员工 + 日期」排好。
		// 以后查「Alice 这个月上了哪几天」（WHERE employee_id = 2 AND work_date BETWEEN ...），
		// MySQL 不用把几千行从头翻到尾，直接按目录翻到 Alice 那一段。
		// （schedule_id 是外键，MySQL 会自动给外键建索引，所以不用再写）
		indexes = @Index(name = "idx_assignment_employee_date", columnList = "employee_id, work_date"))
public class ScheduleAssignment {

	// ---------- 主键：自增编号 ----------
	// 这一行本身没有什么「天然的」编号，用自增数字就行
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// ---------- 属于哪个月的班表（外键 → schedules）----------
	// @ManyToOne：很多条安排 → 一个班表；LAZY：用到才查
	// 这一边才是「真正管外键」的一边（Schedule 那边的 mappedBy 就是指向这个字段）
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "schedule_id", nullable = false)
	private Schedule schedule;

	// ---------- 哪一天 ----------
	// 列名 work_date（不叫 date：date 是 SQL 里的类型名，容易混）
	@Column(name = "work_date", nullable = false)
	private LocalDate workDate;

	// ---------- 哪一组：厨房正社员 / 服务员正社员 / 兼职 ----------
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Slot slot;

	// ---------- 哪个班：白班 / 晚班 ----------
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private ShiftType shift;

	// ---------- 谁（外键 → employees）----------
	// 只存编号；数据库的外键约束会保证这个员工真的存在（JSON 方案做不到这一点）
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "employee_id", nullable = false)
	private Employee employee;

	// ---------- 构造方法 ----------
	protected ScheduleAssignment() {
	}

	// 只给同一个包里的 Schedule.addAssignment 用（没写 public / private = 「包内可见」），
	// 这样外面的代码没法绕过 addAssignment 自己 new，保证两头的关系一定设对
	ScheduleAssignment(Schedule schedule, LocalDate workDate, Slot slot, ShiftType shift, Employee employee) {
		this.schedule = schedule;
		this.workDate = workDate;
		this.slot = slot;
		this.shift = shift;
		this.employee = employee;
	}

	// ---------- getter（安排一旦生成就不改：重新提交是整月删掉重来，所以没有 setter）----------
	public Long getId() {
		return id;
	}

	public Schedule getSchedule() {
		return schedule;
	}

	public LocalDate getWorkDate() {
		return workDate;
	}

	public Slot getSlot() {
		return slot;
	}

	public ShiftType getShift() {
		return shift;
	}

	// 懒加载替身：getEmployee().getId() 不查数据库；getName() 才会去查
	public Employee getEmployee() {
		return employee;
	}
}
