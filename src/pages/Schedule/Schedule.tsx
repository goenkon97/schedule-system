import { useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import CreateScheduleDialog from "../../components/CreateScheduleDialog/CreateScheduleDialog";
import "./Schedule.css";
import { useLanguage } from "../../i18n/LanguageContext";

interface Shift {
  type: "morning" | "afternoon" | "evening" | "night";
  name: string;
  time: string;
  staff: number;
}

interface ScheduleDay {
  date: number;
  shifts: Shift[];
  leave?: number;
}

interface GenerateScheduleData {
  year: number;
  month: number;
  excludedEmployees: number[];
}


// ======================================================
// 员工 Mock 数据
// 以后这里直接换成后端 API 数据
// ======================================================

const employees = [
  { id: 1, name: "Tom Johnson", department: "Kitchen" },
  { id: 2, name: "Alice Brown", department: "Service" },
  { id: 3, name: "Jack Williams", department: "Kitchen" },
  { id: 4, name: "Emily Davis", department: "Hall" },
  { id: 5, name: "David Miller", department: "Service" },
  { id: 6, name: "Mike Wilson", department: "Kitchen" },
  { id: 7, name: "Aiden Lee", department: "Hall" },
  { id: 8, name: "Benjamin Wong", department: "Service" },
  { id: 9, name: "Charlotte Tan", department: "Kitchen" },
  { id: 10, name: "Daniel Ho", department: "Hall" },
];


// ======================================================
// Schedule 页面
// ======================================================

function Schedule() {

  // t：当前语言的翻译；locale：格式化日期用（如 "ja-JP"）
  const { t, locale } = useLanguage();

  // 当前 Calendar 显示的月份
  // 这里没有写死年月
  const [currentDate, setCurrentDate] = useState(new Date());

  // Create Schedule Dialog
  const [showDialog, setDialogOpen] = useState(false);

  // 当前鼠标悬停的日期
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);


  // ======================================================
  // 根据 currentDate 自动计算年月
  // ======================================================

  const year = currentDate.getFullYear();

  // JS Month 从 0 开始
  // 0 = January
  // 7 = August
  const month = currentDate.getMonth();


  // ======================================================
  // 当前月份有多少天
  // ======================================================

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();


  // ======================================================
  // 当前月份 1 号是星期几
  //
  // Sunday = 0
  // Monday = 1
  // ...
  // Saturday = 6
  // ======================================================

  const firstDayOfMonth = new Date(
    year,
    month,
    1
  ).getDay();


  // ======================================================
  // Mock 班次数据
  //
  // 注意：
  // date 是业务数据，可以暂时 Mock
  //
  // weekday 不写进数据
  // 因为 weekday 是可以计算出来的
  // ======================================================

  const scheduleDays = useMemo<ScheduleDay[]>(() => {

    return Array.from(
      { length: daysInMonth },
      (_, index) => {

        const date = index + 1;

        // 根据日期生成一些 Mock 数据
        const morningStaff = 6 + (date % 4);
        const afternoonStaff = 4 + (date % 3);
        const eveningStaff = 2 + (date % 3);
        const nightStaff = date % 3;

        return {
          date,

          shifts: [
            {
              type: "morning",
              name: "Morning",
              time: "09:00 - 17:00",
              staff: morningStaff,
            },
            {
              type: "afternoon",
              name: "Afternoon",
              time: "13:00 - 21:00",
              staff: afternoonStaff,
            },
            {
              type: "evening",
              name: "Evening",
              time: "17:00 - 01:00",
              staff: eveningStaff,
            },
            {
              type: "night",
              name: "Night",
              time: "21:00 - 09:00",
              staff: nightStaff,
            },
          ],

          // 只是为了模拟某些日期有人请假
          leave: date % 7 === 0 ? 1 : undefined,
        };
      }
    );

  }, [daysInMonth]);


  // ======================================================
  // Calendar 前面的空白格
  //
  // 比如：
  //
  // 1号是星期三
  //
  // Sun Mon Tue Wed Thu Fri Sat
  //              1
  //
  // 那么这里就自动生成 3 个空格
  // ======================================================

  const emptyDays = Array.from(
    { length: firstDayOfMonth },
    (_, index) => index
  );


  // ======================================================
  // 月份显示
  // ======================================================

  // 例：en → "November 2026"，zh / ja → "2026年11月"
  // 年月顺序各语言不同，所以不自己拼字符串，交给 toLocaleString
  const monthTitle = currentDate.toLocaleString(locale, {
    year: "numeric",
    month: "long",
  });


  // ======================================================
  // Generate Schedule
  // ======================================================

  const handleGenerateSchedule = (
    data: GenerateScheduleData
  ) => {

    // 用户选择哪个年月
    // Calendar 就显示哪个年月
    setCurrentDate(
      new Date(
        data.year,
        data.month - 1,
        1
      )
    );

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

          <p>
            {t.schedule.subtitle}
          </p>

        </div>


        {/* ==================================================
            Create Schedule 按钮
            点击以后打开 Dialog
        ================================================== */}

        <button
          className="createScheduleButton"
          onClick={() => setDialogOpen(true)}
        >

          <AddIcon />

          {t.schedule.create}

        </button>

      </div>


      {/* ==================================================
          工具栏
      ================================================== */}

      <div className="scheduleToolbar">

        <div className="currentMonth">

          {monthTitle}

        </div>


        <select className="scheduleFilter">

          <option value="all">{t.allDepartments}</option>

          <option value="Kitchen">{t.departments.Kitchen}</option>

          <option value="Hall">{t.departments.Hall}</option>

          <option value="Service">{t.departments.Service}</option>

        </select>

      </div>


      {/* ==================================================
          班次图例
      ================================================== */}

      <div className="scheduleLegend">

        <div className="legendItem">

          <span className="legendColor green" />

          <div>
            <strong>09:00 - 17:00</strong>
            <span>{t.shifts.morning}</span>
          </div>

        </div>


        <div className="legendItem">

          <span className="legendColor yellow" />

          <div>
            <strong>13:00 - 21:00</strong>
            <span>{t.shifts.afternoon}</span>
          </div>

        </div>


        <div className="legendItem">

          <span className="legendColor purple" />

          <div>
            <strong>17:00 - 01:00</strong>
            <span>{t.shifts.evening}</span>
          </div>

        </div>


        <div className="legendItem">

          <span className="legendColor blue" />

          <div>
            <strong>21:00 - 09:00</strong>
            <span>{t.shifts.night}</span>
          </div>

        </div>


        <div className="legendItem">

          <span className="legendColor red" />

          <div>
            <strong>{t.leave}</strong>
            <span>{t.onLeave}</span>
          </div>

        </div>

      </div>


      {/* ==================================================
          Calendar
      ================================================== */}

      <div className="calendar">


        {/* 星期 */}

        <div className="calendarHeader">

          {/* 星期名从翻译里取，index 0 = 周日，6 = 周六 */}
          {t.schedule.weekdays.map((name, index) => (
            <div
              key={index}
              className={index === 0 || index === 6 ? "weekend" : undefined}
            >
              {name}
            </div>
          ))}

        </div>


        {/* ==================================================
            日期
        ================================================== */}

        <div className="calendarBody">


          {/* 前面的空白格 */}

          {emptyDays.map((_, index) => (

            <div
              className="calendarDay outside"
              key={`empty-${index}`}
            />

          ))}


          {/* ==================================================
              真正的日期
          ================================================== */}

          {scheduleDays.map((day) => {

            const totalStaff = day.shifts.reduce(
              (total, shift) =>
                total + shift.staff,
              0
            );


            // 当前日期是星期几
            const weekday = new Date(
              year,
              month,
              day.date
            ).getDay();


            return (

              <div
                className={`calendarDay ${
                  weekday === 0 || weekday === 6
                    ? "weekendDay"
                    : ""
                }`}
                key={day.date}

                onMouseEnter={() =>
                  setHoveredDay(day.date)
                }

                onMouseLeave={() =>
                  setHoveredDay(null)
                }
              >


                {/* 日期 */}

                <div className="dayNumber">

                  {day.date}

                </div>


                {/* 班次 */}

                <div className="daySchedule">

                  <div className="shiftDots">

                    {day.shifts.map((shift) => (

                      <span
                        key={shift.type}
                        className={`scheduleDot ${shift.type}`}
                      />

                    ))}

                  </div>


                  <div className="staffCount">

                    {t.staffCount(totalStaff)}

                  </div>


                  {day.leave && (

                    <div className="leaveCount">

                      <span className="leaveDot" />

                      {t.leaveCount(day.leave)}

                    </div>

                  )}

                </div>


                {/* ==================================================
                    Hover Tooltip
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

                        <span>
                          {t.schedule.scheduled(totalStaff)}
                        </span>

                      </div>

                      <span className="tooltipClose">
                        ×
                      </span>

                    </div>


                    <div className="tooltipContent">

                      {day.shifts.map((shift) => (

                        <div
                          className="tooltipShift"
                          key={shift.type}
                        >

                          <span
                            className={`tooltipColor ${shift.type}`}
                          />

                          <div>

                            <strong>
                              {shift.time}
                            </strong>

                            <span>
                              {t.shifts[shift.type]}
                            </span>

                          </div>

                          <span className="tooltipStaff">
                            {t.staffCount(shift.staff)}
                          </span>

                        </div>

                      ))}


                      {day.leave && (

                        <div className="tooltipShift">

                          <span className="tooltipColor red" />

                          <div>

                            <strong>{t.leave}</strong>

                            <span>{t.onLeave}</span>

                          </div>

                          <span className="tooltipStaff">
                            {t.staffCount(day.leave)}
                          </span>

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

      {showDialog && <CreateScheduleDialog onShow={setDialogOpen} />}

    </div>
  );
}


export default Schedule;