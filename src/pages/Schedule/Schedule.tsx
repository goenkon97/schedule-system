import { useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import CreateScheduleDialog from "../../components/CreateScheduleDialog/CreateScheduleDialog";
import "./Schedule.css";
import { useLanguage } from "../../i18n/LanguageContext";
import type { Department } from "../../i18n/translations";

// 业务数据：班次定义（白班 / 晚班 + 需要人数）、员工、排班记录
import { shiftDefinitions, shiftTimeLabel, departments, requiredStaff } from "../../data/shifts";
import { employees } from "../../data/employees";
import { scheduleWithLeaves, mockLeaves, toDateKey } from "../../data/mockSchedule";

// 从「新建排班」弹窗传回来的数据
export interface GenerateScheduleData {
  year: number;
  month: number;                 // 1 ~ 12（给人看的月份）
  excludedEmployees: number[];   // 不参加排班的员工 id
}

// 部门筛选：全部，或某一个部门
type DeptFilter = Department | "all";

// ======================================================
// Schedule 页面
// ======================================================

function Schedule() {

  // t：当前语言的翻译；locale：格式化日期用（如 "ja-JP"）
  const { t, locale } = useLanguage();

  // 当前 Calendar 显示的月份
  const [currentDate, setCurrentDate] = useState(new Date());

  // Create Schedule Dialog 是否打开
  const [showDialog, setDialogOpen] = useState(false);

  // 当前鼠标悬停的日期
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // 部门筛选（现在真的会生效了：月历上的人数和需要人数都按部门算）
  const [dept, setDept] = useState<DeptFilter>("all");

  // ======================================================
  // 根据 currentDate 自动计算年月
  // ======================================================

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();          // JS 的月份从 0 开始：0 = 1 月

  // 当前月份有多少天（下个月的第 0 天 = 这个月的最后一天）
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 当前月份 1 号是星期几（Sunday = 0 … Saturday = 6）
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // ======================================================
  // 排班记录和请假记录（Mock，以后换成接口）
  // 月份变了才重新生成
  // ======================================================

  // 先按规则排好整个月，再把请假那天的班改成休息（所以请假多的日子会显示缺人）
  const assignments = useMemo(() => scheduleWithLeaves(year, month), [year, month]);
  const leaves = useMemo(() => mockLeaves(year, month), [year, month]);

  // 员工 id → 部门，筛选请假时要用
  const deptOf = useMemo(() => new Map(employees.map((e) => [e.id, e.department])), []);

  // ======================================================
  // 每一天的统计：每个班次排了几个人、需要几个人、有几人请假
  // ======================================================

  const scheduleDays = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, index) => {
      const date = index + 1;
      const key = toDateKey(new Date(year, month, date));

      const shifts = shiftDefinitions.map((s) => {
        // 这一天、这个班次、（按筛选的部门）排了几个人
        const assigned = assignments.filter(
          (a) => a.date === key && a.shift === s.type && (dept === "all" || a.department === dept)
        ).length;
        const required = requiredStaff(s, dept);
        return { def: s, assigned, required, short: Math.max(0, required - assigned) };
      });

      // 每个部门的明细（tooltip 里显示「厨房 2/2 · 服务员 2/2」）
      const byDept = (type: string) =>
        departments
          .filter((d) => dept === "all" || d === dept)
          .map((d) => ({
            dept: d,
            assigned: assignments.filter((a) => a.date === key && a.shift === type && a.department === d).length,
            required: requiredStaff(shiftDefinitions.find((s) => s.type === type)!, d),
          }));

      const leave = leaves.filter(
        (l) => l.date === key && (dept === "all" || deptOf.get(l.employeeId) === dept)
      ).length;

      return { date, shifts, byDept, leave };
    });
  }, [daysInMonth, year, month, assignments, leaves, dept, deptOf]);

  // ======================================================
  // Calendar 前面的空白格（1 号是星期三 → 前面空 3 格）
  // ======================================================

  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, index) => index);

  // 例：en → "November 2026"，zh / ja → "2026年11月"
  const monthTitle = currentDate.toLocaleString(locale, { year: "numeric", month: "long" });

  // ======================================================
  // Generate Schedule：弹窗点「生成」后，月历切到选中的月份
  // （真正的生成以后由后端接口完成：POST /api/schedules/generate）
  // ======================================================

  const handleGenerateSchedule = (data: GenerateScheduleData) => {
    setCurrentDate(new Date(data.year, data.month - 1, 1));
    setDialogOpen(false);
    console.log("Generate Schedule:", data);
  };

  return (
    <div className="Schedule">

      {/* ==================================================
          页面顶部
      ================================================== */}

      <div className="scheduleTop">

        <div>
          <h1>{t.schedule.title}</h1>
          <p>{t.schedule.subtitle}</p>
        </div>

        <button
          className="createScheduleButton"
          onClick={() => setDialogOpen(true)}
        >
          <AddIcon />
          {t.schedule.create}
        </button>

      </div>


      {/* ==================================================
          工具栏：当前月份 + 部门筛选
      ================================================== */}

      <div className="scheduleToolbar">

        <div className="currentMonth">
          {monthTitle}
        </div>

        {/* value 用英文固定值（以后传给后端），显示文字翻译 */}
        <select
          className="scheduleFilter"
          value={dept}
          onChange={(e) => setDept(e.target.value as DeptFilter)}
        >
          <option value="all">{t.allDepartments}</option>
          {departments.map((d) => (
            <option key={d} value={d}>{t.departments[d]}</option>
          ))}
        </select>

      </div>


      {/* ==================================================
          班次图例：由 shiftDefinitions 生成（白班 / 晚班）
      ================================================== */}

      <div className="scheduleLegend">

        {shiftDefinitions.map((s) => (
          <div className="legendItem" key={s.type}>
            <span className={`legendColor ${s.type}`} />
            <div>
              <strong>{shiftTimeLabel(s)}</strong>
              <span>
                {t.shifts[s.type]} · {departments.map((d) => `${t.departments[d]} ${s.required[d]}`).join(" / ")}
              </span>
            </div>
          </div>
        ))}

        <div className="legendItem">
          <span className="legendColor red" />
          <div>
            <strong>{t.leave}</strong>
            <span>{t.onLeave}</span>
          </div>
        </div>

        <div className="legendItem">
          <span className="legendColor short" />
          <div>
            <strong>{t.schedule.shortLegend}</strong>
            <span>{t.schedule.shortLegendDesc}</span>
          </div>
        </div>

      </div>


      {/* ==================================================
          Calendar
      ================================================== */}

      <div className="calendar">

        {/* 星期名从翻译里取，index 0 = 周日，6 = 周六 */}
        <div className="calendarHeader">
          {t.schedule.weekdays.map((name, index) => (
            <div
              key={index}
              className={index === 0 || index === 6 ? "weekend" : undefined}
            >
              {name}
            </div>
          ))}
        </div>

        <div className="calendarBody">

          {/* 前面的空白格 */}
          {emptyDays.map((_, index) => (
            <div className="calendarDay outside" key={`empty-${index}`} />
          ))}

          {/* 真正的日期 */}
          {scheduleDays.map((day) => {

            // 当前日期是星期几
            const weekday = new Date(year, month, day.date).getDay();

            // 这一天所有班次一共排了几个人
            const totalStaff = day.shifts.reduce((sum, s) => sum + s.assigned, 0);

            return (

              <div
                className={`calendarDay ${weekday === 0 || weekday === 6 ? "weekendDay" : ""}`}
                key={day.date}
                onMouseEnter={() => setHoveredDay(day.date)}
                onMouseLeave={() => setHoveredDay(null)}
              >

                <div className="dayNumber">{day.date}</div>

                {/* 每个班次一行：色点 + 班次名 + 排了几个/需要几个；缺人时变红 */}
                <div className="daySchedule">

                  {day.shifts.map((s) => (
                    <div className={`shiftRow ${s.short ? "isShort" : ""}`} key={s.def.type}>
                      <span className={`scheduleDot ${s.def.type}`} />
                      <span className="shiftRowName">{t.shifts[s.def.type]}</span>
                      <span className="shiftRowCount">{t.coverage(s.assigned, s.required)}</span>
                    </div>
                  ))}

                  {day.leave > 0 && (
                    <div className="leaveCount">
                      <span className="leaveDot" />
                      {t.leaveCount(day.leave)}
                    </div>
                  )}

                </div>

                {/* ==================================================
                    Hover Tooltip：每个班次的时间 + 各部门人数
                ================================================== */}

                {hoveredDay === day.date && (

                  <div className="scheduleTooltip">

                    <div className="tooltipHeader">
                      <div>
                        <strong>
                          {/* 例：en → "November 1, 2026"，zh / ja → "2026年11月1日" */}
                          {new Date(year, month, day.date).toLocaleDateString(locale, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </strong>
                        <span>{t.schedule.scheduled(totalStaff)}</span>
                      </div>
                    </div>

                    <div className="tooltipContent">

                      {day.shifts.map((s) => (
                        <div className="tooltipShift" key={s.def.type}>
                          <span className={`tooltipColor ${s.def.type}`} />
                          <div>
                            <strong>{shiftTimeLabel(s.def)}</strong>
                            <span>
                              {t.shifts[s.def.type]} ·{" "}
                              {day.byDept(s.def.type)
                                .map((d) => `${t.departments[d.dept]} ${t.coverage(d.assigned, d.required)}`)
                                .join(" / ")}
                            </span>
                          </div>
                          <span className={`tooltipStaff ${s.short ? "isShort" : ""}`}>
                            {s.short ? t.shortBy(s.short) : t.coverage(s.assigned, s.required)}
                          </span>
                        </div>
                      ))}

                      {day.leave > 0 && (
                        <div className="tooltipShift">
                          <span className="tooltipColor red" />
                          <div>
                            <strong>{t.leave}</strong>
                            <span>{t.onLeave}</span>
                          </div>
                          <span className="tooltipStaff">{t.staffCount(day.leave)}</span>
                        </div>
                      )}

                    </div>

                    <div className="tooltipFooter">
                      {t.schedule.viewDetails}
                    </div>

                  </div>

                )}

              </div>

            );

          })}

        </div>

      </div>


      {/* ==================================================
          Create Schedule Dialog
      ================================================== */}

      {showDialog && (
        <CreateScheduleDialog
          onShow={setDialogOpen}
          onGenerate={handleGenerateSchedule}
        />
      )}

    </div>
  );
}


export default Schedule;
