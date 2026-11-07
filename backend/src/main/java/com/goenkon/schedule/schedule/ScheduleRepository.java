// =====================================================================
// ScheduleRepository.java：schedules 表的「仓库管理员」
//
// 和其他 Repository 一样只写接口，Spring Data 按方法名自动生成 SQL。
// 继承来就能直接用的：
//   findById("2026-12") → 按年月找一个月（提交、删除时用）
//   save(班表)           → 新增或更新（cascade：下面的安排跟着一起存）
//   delete(班表)         → 删除（cascade：下面的安排跟着一起删）
//
// schedule_assignments 表不需要自己的 Repository：
//   安排永远跟着班表一起存、一起删、一起查（都通过 Schedule 的 assignments 列表），
//   不会单独去操作某一条安排。
// =====================================================================

package com.goenkon.schedule.schedule;

// List：列表
import java.util.List;

// EntityGraph：这次查询把关联的东西一起查出来（避免 N+1）
import org.springframework.data.jpa.repository.EntityGraph;
// JpaRepository：常用增删改查
import org.springframework.data.jpa.repository.JpaRepository;

// <Schedule, String>：管理 Schedule，主键是 String（"2026-12"），不是之前的 Long
public interface ScheduleRepository extends JpaRepository<Schedule, String> {

	// ---------- 查某几个月的班表（排班页、首页用）----------
	// 方法名拆开读：
	//   findBy           → 查询
	//   IdBetween        → WHERE id BETWEEN ? AND ?（包括两头）
	//                      "2026-11"、"2026-12"、"2027-01" 这种字符串按字典顺序比大小，
	//                      正好和时间顺序一样（年份在前、月份补 0），所以可以直接用 BETWEEN
	//   OrderByIdAsc     → 按年月从早到晚排
	//
	// @EntityGraph(attributePaths = "assignments")：
	//   assignments 是一对多，默认 LAZY。不一起查的话：查 3 个月 = 1 次查班表 + 3 次查各自的安排（N+1）。
	//   一起查以后：1 条带 JOIN 的 SQL 就拿到 3 个月和它们所有的安排。
	//   （员工不用一起查：组装时只用 getEmployee().getId()，替身本来就知道 id，不会查员工表）
	@EntityGraph(attributePaths = "assignments")
	List<Schedule> findByIdBetweenOrderByIdAsc(String from, String to);
}
