// src/pages/Schedule/Schedule.tsx
// =====================================================
// 排班页：显示「已经生成的班表」（一个月 = 一个 MonthSchedule 对象，见 src/data/scheduleStore.ts）
//
// - 左右箭头切换月份：只能看 当前月 / 下个月 / 下下个月 三个月
// - 月历每一格：橙色圆点 = 厨房正社员，蓝色 = 服务员正社员，灰色 = 兼职；缺人的格子标红
// - 点某一天：店长可以修改这天的人员（DayEditorDialog），其他人只能看
// - 备注：店长可以给每个月的班表写备注
// - 改过之后班表变成「草稿」，店长点「提交班表」把整个月的数据提交到后台（后端完成前先在前端模拟）
// - 「新建排班」只有店长能用，而且只能选下个月和下下个月
//
// 数据怎么流动：
//   schedules（state，所有月份的班表）
//     → 一改就自动存进 localStorage（saveSchedules）
//     → current = schedules["2026-12"]，月历只画 current
//   弹窗（新建 / 某一天）只负责编辑，改完通过 onGenerate / onSave 把结果交回这里，
//   由这个页面统一更新 schedules —— 数据只有一个地方管，不会乱
// =====================================================

import { useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import Dialog from "@mui/material/Dialog";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import CreateScheduleDialog from "../../components/CreateScheduleDialog/CreateScheduleDialog";
import DayEditorDialog from "../../components/DayEditorDialog/DayEditorDialog";
import "./Schedule.css";
import { useLanguage } from "../../i18n/LanguageContext";
import { useAuth } from "../../auth/AuthContext";
import type { Department } from "../../i18n/translations";

import { employeeName } from "../../data/employees";
import type { FullTimeSettings, ScheduleResult } from "../../data/fullTimeScheduler";
import {
  buildMonthSchedule,
  loadSchedules,
  mockApi,
  monthFromToday,
  monthKey,
  saveSchedules,
  workingIds,
  type DayEntry,
  type ShiftStaff,
  type ScheduleMap,
} from "../../data/scheduleStore";

// 从「新建排班」弹窗传回来的数据
export interface GenerateScheduleData extends FullTimeSettings {
  year: number;
  month: number;                 // 1 ~ 12（给人看的月份）
  excludedEmployees: number[];   // 不参加排班的员工 id
  result: ScheduleResult;        // 前端算法算好的整月班表
}

// 部门筛选：全部，或某一个部门
type DeptFilter = Department | "all";

// 取名字首字母作头像："Tom Lee" → "TL"
const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// 某个部门这一天：缺几人（白班、晚班里缺得多的那个）
const shortOf = (s: ShiftStaff, need: number) => Math.max(0, need - s.day.length, need - s.evening.length);

// 只上了半天的人（只在白班或只在晚班）
const halfShift = (s: ShiftStaff, id: number): "day" | "evening" | null =>
  s.day.includes(id) && !s.evening.includes(id) ? "day" : s.evening.includes(id) && !s.day.includes(id) ? "evening" : null;

// 最多能看几个月：当前月 + 后面 2 个月
const MAX_OFFSET = 2;

function Schedule() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();

  // 只有店长能新建、修改、提交
  const canEdit = user?.role === "manager";

  // ---------- 所有月份的班表（现在存在浏览器里，以后从后端拉）----------
  const [schedules, setSchedules] = useState<ScheduleMap>(loadSchedules);
  // useEffect(做什么, [依赖])：依赖 schedules 每变一次，就执行一次保存 → 一改就存
  useEffect(() => saveSchedules(schedules), [schedules]);   // 一改就存

  // 现在看的是第几个月：0 = 当前月，1 = 下个月，2 = 下下个月
  const [offset, setOffset] = useState(0);
  const { year, month } = monthFromToday(offset);           // month 是 1 ~ 12
  const key = monthKey(year, month);
  const current = schedules[key];                           // 这个月的班表（可能还没有）

  // ---------- 页面上其他的小状态 ----------
  const [showDialog, setDialogOpen] = useState(false);                 // 「新建排班」弹窗开没开
  const [editingDay, setEditingDay] = useState<number | null>(null);   // 正在看 / 改第几天
  const [dept, setDept] = useState<DeptFilter>("all");                 // 部门筛选
  const [toast, setToast] = useState("");                              // 底部提示条的文字（空 = 不显示）
  const [confirmClear, setConfirmClear] = useState(false);   // 「清除班表」的确认框

  // 月份标题：en → "December 2026"，zh / ja → "2026年12月"
  const monthTitle = new Date(year, month - 1, 1).toLocaleString(locale, { year: "numeric", month: "long" });

  // 1 号是星期几 → 前面空几格
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();

  // ---------- 修改班表的几个动作（都会把班表变成「草稿」，等店长提交）----------
  // patch：一个函数，接收旧班表、返回新班表；这里统一把状态改成 draft、更新修改时间
  // NonNullable<typeof current>：current 的类型去掉 undefined（传进来时一定有班表）
  const updateCurrent = (patch: (s: NonNullable<typeof current>) => NonNullable<typeof current>) =>
    setSchedules((prev) => {
      const s = prev[key];
      if (!s) return prev;
      return { ...prev, [key]: { ...patch(s), status: "draft", updatedAt: new Date().toISOString() } };
    });

  // 保存某一天的修改
  // days.map：第 index 天换成新的，其他天原样保留
  const saveDay = (index: number, day: DayEntry) => {
    updateCurrent((s) => ({ ...s, days: s.days.map((d, i) => (i === index ? day : d)) }));
    setEditingDay(null);
  };

  // 修改备注
  const changeNote = (note: string) => updateCurrent((s) => ({ ...s, note }));

  // 提交班表：以后这里换成 fetch("/api/schedules", { method: "POST", body: JSON.stringify(current) })
  const submit = () => {
    if (!current) return;
    // as const：让 TypeScript 把 "submitted" 当成字面量类型，而不是普通 string
    const payload = { ...current, status: "submitted" as const, updatedAt: new Date().toISOString() };
    console.log("Submit schedule →", payload);              // 提交给后端的就是这个对象
    mockApi.submit(payload);                                 // 模拟接口：存进「后台」
    setSchedules((prev) => ({ ...prev, [key]: payload }));
    setToast(t.schedule.submittedToast);
  };

  // 清除班表：
  //   - 草稿（没提交）：只清除本地的修改。后台有提交过的版本 → 恢复成那个版本；没有 → 这个月变成空的
  //   - 已提交：调用删除接口，把后台里这个月的班表删掉，本地也一起删掉
  const serverCopy = current ? mockApi.get(key) : undefined;
  const clearSchedule = () => {
    if (!current) return;
    if (current.status === "draft") {
      setSchedules((prev) => {
        const next = { ...prev };
        if (serverCopy) next[key] = serverCopy;               // 恢复成上次提交的版本
        else delete next[key];                                // 从没提交过：直接删掉
        return next;
      });
      setToast(t.schedule.clearedLocal);
    } else {
      mockApi.remove(key);                                    // 以后换成 DELETE /api/schedules/2026-11
      setSchedules((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setToast(t.schedule.clearedServer);
    }
    setConfirmClear(false);
  };

  // 新建排班：弹窗确认后，把算好的结果变成一个月的班表对象，并切换到那个月
  const handleGenerate = (data: GenerateScheduleData) => {
    const s = buildMonthSchedule(data.year, data.month, { kitchenPerDay: data.kitchenPerDay, hallPerDay: data.hallPerDay }, data.result);
    setSchedules((prev) => ({ ...prev, [s.id]: s }));
    // 算出这个月是从今天往后第几个月，切过去
    const now = monthFromToday(0);
    setOffset((data.year - now.year) * 12 + (data.month - now.month));
    setDialogOpen(false);
  };

  // 弹窗里可以选的两个月（下个月、下下个月），以及哪些已经有班表
  // [1, 2] → 从今天往后第 1 个月、第 2 个月
  const creatable = [1, 2].map((o) => monthFromToday(o));
  const existingKeys = useMemo(() => Object.keys(schedules), [schedules]);

  // 部门筛选：选「全部」两个都显示，选某个部门只显示那个
  const showKitchen = dept === "all" || dept === "Kitchen";
  const showHall = dept === "all" || dept === "Hall";

  return (
    <div className="Schedule">

      {/* ================= 页面顶部 ================= */}
      <div className="scheduleTop">
        <div>
          <h1>{t.schedule.title}</h1>
          <p>{t.schedule.subtitle}</p>
        </div>

        {/* 只有店长能新建；其他人按钮变灰，鼠标移上去说明原因 */}
        <Tooltip title={canEdit ? "" : t.schedule.managerOnly} arrow>
          <span>
            <button className="createScheduleButton" disabled={!canEdit} onClick={() => setDialogOpen(true)}>
              <AddIcon />
              {t.schedule.create}
            </button>
          </span>
        </Tooltip>
      </div>

      {/* ================= 工具栏：月份切换 + 状态 + 部门筛选 + 提交 ================= */}
      <div className="scheduleToolbar">
        <div className="monthNav">
          <button className="navBtn" aria-label={t.schedule.prevMonth} disabled={offset === 0} onClick={() => setOffset((o) => o - 1)}>
            <ChevronLeftIcon />
          </button>
          <div className="currentMonth">{monthTitle}</div>
          <button className="navBtn" aria-label={t.schedule.nextMonth} disabled={offset === MAX_OFFSET} onClick={() => setOffset((o) => o + 1)}>
            <ChevronRightIcon />
          </button>

          {current && (
            <span className={`statusBadge ${current.status}`}>
              {current.status === "draft" ? t.schedule.statusDraft : t.schedule.statusSubmitted}
            </span>
          )}
        </div>

        <div className="toolbarRight">
          <select className="scheduleFilter" value={dept} onChange={(e) => setDept(e.target.value as DeptFilter)}>
            <option value="all">{t.allDepartments}</option>
            <option value="Kitchen">{t.departments.Kitchen}</option>
            <option value="Hall">{t.departments.Hall}</option>
          </select>

          {/* 提交按钮：店长 + 有改过还没提交的草稿 才出现 */}
          {canEdit && current?.status === "draft" && (
            <button className="submitButton" onClick={submit}>
              <CloudUploadOutlinedIcon fontSize="small" />
              {t.schedule.submit}
            </button>
          )}

          {/* 清除班表：有班表时店长才看得到；点了先弹确认框 */}
          {canEdit && current && (
            <button className="clearButton" onClick={() => setConfirmClear(true)}>
              <DeleteOutlineIcon fontSize="small" />
              {t.schedule.clear}
            </button>
          )}
        </div>
      </div>

      {/* ================= 备注 ================= */}
      {current && (
        <div className="noteBox">
          <span className="noteLabel">{t.schedule.note}</span>
          {/* 店长：可以直接输入（每打一个字就更新班表、变成草稿）；员工：只显示文字 */}
          {canEdit ? (
            <input
              className="noteInput"
              value={current.note}
              placeholder={t.schedule.notePlaceholder}
              onChange={(e) => changeNote(e.target.value)}
            />
          ) : (
            <span className={`noteText ${current.note ? "" : "empty"}`}>{current.note || t.schedule.noNote}</span>
          )}
        </div>
      )}

      {/* ================= 图例 + 操作提示 ================= */}
      <div className="calLegend">
        <span><i className="calDot Kitchen" /> {t.departments.Kitchen}</span>
        <span><i className="calDot Hall" /> {t.departments.Hall}</span>
        <span><i className="calDot partTime" /> {t.schedule.partTime}</span>
        <span><i className="calDot empty" /> {t.schedule.shortLegend}</span>
        {current && <span className="calHint">{canEdit ? t.schedule.clickToEdit : t.schedule.clickToView}</span>}
      </div>

      {/* ================= 月历 ================= */}
      <div className="calendar">
        <div className="calendarHeader">
          {t.schedule.weekdays.map((name, index) => (
            <div key={index} className={index === 0 || index === 6 ? "weekend" : undefined}>{name}</div>
          ))}
        </div>

        {!current ? (
          /* 这个月还没有班表 */
          <div className="emptyState">
            <strong>{t.schedule.noSchedule}</strong>
            <span>{canEdit ? t.schedule.noScheduleManager : t.schedule.noScheduleStaff}</span>
          </div>
        ) : (
          <div className="calendarBody">
            {/* 1 号前面的空格：1 号是星期几就空几格（周日 = 0 格） */}
            {Array.from({ length: firstWeekday }, (_, i) => (
              <div className="calendarDay outside" key={`empty-${i}`} />
            ))}

            {/* 每一天一个格子：i 是第几天（0 = 1 号） */}
            {current.days.slice(0, daysInMonth).map((d, i) => {
              const weekday = (firstWeekday + i) % 7;                // 这一天是星期几
              const kShort = showKitchen ? shortOf(d.kitchen, current.settings.kitchenPerDay) : 0;
              const hShort = showHall ? shortOf(d.hall, current.settings.hallPerDay) : 0;
              const isShort = kShort > 0 || hShort > 0;
              const isToday = offset === 0 && i + 1 === today.getDate();   // 当前月的今天：格子加蓝框

              return (
                <div
                  key={d.date}
                  className={`calendarDay ${weekday === 0 || weekday === 6 ? "weekendDay" : ""} ${isShort ? "isShort" : ""} ${isToday ? "today" : ""}`}
                  onClick={() => setEditingDay(i)}
                >
                  <div className="dayNumber">{i + 1}</div>

                  {showKitchen && (
                    <div className="calDots">
                      {/* 一个人画一个圆点；只上了白班或晚班的人，圆点半透明，并在提示里注明 */}
                      {workingIds(d.kitchen).map((id) => {
                        const half = halfShift(d.kitchen, id);
                        return (
                          <i className={`calDot Kitchen ${half ? "half" : ""}`} key={id} title={`${employeeName(id)}${half ? ` · ${t.shifts[half]}` : ""}`}>
                            {initials(employeeName(id))}
                          </i>
                        );
                      })}
                      {Array.from({ length: Math.max(0, kShort) }, (_, k) => <i className="calDot empty" key={`k${k}`} />)}
                    </div>
                  )}

                  {showHall && (
                    <div className="calDots">
                      {workingIds(d.hall).map((id) => {
                        const half = halfShift(d.hall, id);
                        return (
                          <i className={`calDot Hall ${half ? "half" : ""}`} key={id} title={`${employeeName(id)}${half ? ` · ${t.shifts[half]}` : ""}`}>
                            {initials(employeeName(id))}
                          </i>
                        );
                      })}
                      {/* 缺几人就画几个虚线空位 */}
                      {Array.from({ length: Math.max(0, hShort) }, (_, k) => <i className="calDot empty" key={`h${k}`} />)}
                      {/* 兼职：灰色圆点，鼠标悬停显示名字和白班 / 晚班 */}
                      {d.partTime.map((p) => (
                        <i className="calDot partTime" key={p.employeeId} title={`${employeeName(p.employeeId)} · ${t.shifts[p.shift]}`}>
                          {initials(employeeName(p.employeeId))}
                        </i>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= 弹窗 =================
          {条件 && <组件 />}：条件成立才渲染。关掉时组件整个消失，下次打开是全新的（表单自动清空） */}
      {showDialog && (
        <CreateScheduleDialog
          onShow={setDialogOpen}
          onGenerate={handleGenerate}
          months={creatable}
          existingKeys={existingKeys}
        />
      )}

      {/* 某一天的编辑弹窗：editingDay 不是 null（点了某一天）才显示 */}
      {current && editingDay !== null && (
        <DayEditorDialog
          schedule={current}
          dayIndex={editingDay}
          canEdit={canEdit}
          onSave={(day) => saveDay(editingDay, day)}
          onClose={() => setEditingDay(null)}
        />
      )}

      {/* 清除班表的确认框：草稿和已提交的说明不一样 */}
      {current && (
        <Dialog open={confirmClear} onClose={() => setConfirmClear(false)} maxWidth="xs" fullWidth>
          <div className="confirmBox">
            <h3>{current.status === "draft" ? t.schedule.clearDraftTitle : t.schedule.clearSubmittedTitle}</h3>
            <p>
              {current.status === "draft"
                ? (serverCopy ? t.schedule.clearDraftRestore : t.schedule.clearDraftDelete)
                : t.schedule.clearSubmittedDesc(monthTitle)}
            </p>
            <div className="confirmActions">
              <button className="confirmCancel" onClick={() => setConfirmClear(false)}>{t.dayEditor.cancel}</button>
              <button className="confirmDanger" onClick={clearSchedule}>
                {current.status === "draft" ? t.schedule.clearConfirm : t.schedule.deleteConfirm}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* 底部的成功提示条：toast 有文字就显示，3.5 秒后自动关闭（!!toast：把字符串变成 true / false） */}
      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast("")} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="success" variant="filled" onClose={() => setToast("")}>{toast}</Alert>
      </Snackbar>
    </div>
  );
}

export default Schedule;
