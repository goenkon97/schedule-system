// src/components/DayEditorDialog/DayEditorDialog.tsx
// =====================================================
// 点月历上的某一天打开：查看 / 修改这一天的人员
//
// 正社员按「白班 / 晚班」分开显示：默认两段都是同一批人（全天班），
// 但店长可以只移除某人的白班或晚班，再把那一段换给别人（例如 A 的白班和 B 的晚班互换）。
//
// - 店长（canEdit = true）：每一段都可以 × 移除、下拉添加；服务员可以添加兼职（选白班 / 晚班）
// - 其他人：只能看，顶部提示「只有店长可以修改」
// - 改的是弹窗里的「副本」，点「保存修改」才写回这个月的班表；
//   整个月改完后，再在排班页点「提交班表」一次性提交到后台
// =====================================================

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import Alert from "@mui/material/Alert";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import "./DayEditorDialog.css";

import { useLanguage } from "../../i18n/LanguageContext";
import type { Department, ShiftType } from "../../i18n/translations";
import { employees, employeeName } from "../../data/employees";
import { shiftDefinitions } from "../../data/shifts";
import { availableFullTime } from "../../data/fullTimeScheduler";
import { workingIds, type DayEntry, type MonthSchedule } from "../../data/scheduleStore";

// 取名字首字母作头像："Tom Lee" → "TL"
const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// 部门 → 这一天数据里对应的字段（"Kitchen" → "kitchen"）
// as "kitchen" | "hall"：告诉 TypeScript 返回值只会是这两个之一，之后 d[field(dept)] 才不会报错
const field = (dept: Department) => (dept === "Kitchen" ? "kitchen" : "hall") as "kitchen" | "hall";

const DEPTS: Department[] = ["Kitchen", "Hall"];
const SHIFTS: ShiftType[] = ["day", "evening"];

export default function DayEditorDialog({
  schedule,
  dayIndex,
  canEdit,
  onSave,
  onClose,
}: {
  schedule: MonthSchedule;        // 这个月的班表
  dayIndex: number;               // 第几天（0 = 1 号）
  canEdit: boolean;               // 是不是店长
  onSave: (day: DayEntry) => void;
  onClose: () => void;
}) {
  const { t, locale } = useLanguage();

  // 弹窗里改的是副本：点「保存」之前不影响原来的班表
  // structuredClone：浏览器自带的「深拷贝」，连里面的数组也复制一份，改副本不会动到原数据
  // useState(() => ...)：传函数，只在弹窗第一次打开时复制一次
  const [day, setDay] = useState<DayEntry>(() => structuredClone(schedule.days[dayIndex]));

  // 添加兼职用的两个下拉框
  const [ptId, setPtId] = useState("");
  const [ptShift, setPtShift] = useState<ShiftType>("day");

  // 这一天的日期（Date 的月份从 0 开始，所以 month - 1；dayIndex 从 0 开始，所以 + 1）
  const date = new Date(schedule.year, schedule.month - 1, dayIndex + 1);
  // 标题，例如「12月5日 星期六」（跟着当前语言格式化）
  const title = date.toLocaleDateString(locale, { month: "long", day: "numeric", weekday: "long" });
  // 取某个班次的定义（开始、结束时间）；! 表示「一定找得到」
  const timeOf = (s: ShiftType) => shiftDefinitions.find((d) => d.type === s)!;

  // ---------- 某人「这一周」上了几天（白班或晚班上了任意一段就算一天）----------
  // 帮店长遵守「每周最多 4 天」；一周从周一开始，只数这个月里的日子
  const weekDaysOf = (id: number, dept: Department) => {
    const wd = (date.getDay() + 6) % 7;                // 今天是这周的第几天（周一 = 0）
    const start = Math.max(0, dayIndex - wd);
    const end = Math.min(schedule.days.length - 1, dayIndex + (6 - wd));
    let n = 0;
    for (let i = start; i <= end; i++) {
      const d = i === dayIndex ? day : schedule.days[i];   // 今天用正在改的副本
      if (workingIds(d[field(dept)]).includes(id)) n++;
    }
    return n;
  };

  // ---------- 正社员：某个部门的某一段班，移除 / 添加 ----------
  // React 的 state 不能直接改（d.kitchen.day.push(id) 是错的，页面不会更新），
  // 要造一个「新对象」交给 setDay：
  //   { ...d,                      复制这一天的其他字段
  //     [field(dept)]: {           [变量]：用变量的值当 key（kitchen 或 hall）
  //       ...d[field(dept)],       复制这个部门的另一段班
  //       [shift]: 新数组 } }      只替换 day 或 evening 这一段
  const removeFull = (dept: Department, shift: ShiftType, id: number) =>
    setDay((d) => ({ ...d, [field(dept)]: { ...d[field(dept)], [shift]: d[field(dept)][shift].filter((x) => x !== id) } }));

  const addFull = (dept: Department, shift: ShiftType, id: number) =>
    setDay((d) => ({ ...d, [field(dept)]: { ...d[field(dept)], [shift]: [...d[field(dept)][shift], id] } }));

  // ---------- 兼职：移除 / 添加 ----------
  const removePart = (id: number) => setDay((d) => ({ ...d, partTime: d.partTime.filter((p) => p.employeeId !== id) }));

  // 添加兼职：没选人就什么都不做；加完把下拉框清空
  // Number(ptId)：下拉框的值是字符串，转成数字 id
  const addPart = () => {
    if (!ptId) return;
    setDay((d) => ({ ...d, partTime: [...d.partTime, { employeeId: Number(ptId), shift: ptShift }] }));
    setPtId("");
  };

  // 还能加进来的兼职：在职、兼职、今天还没排
  const partTimers = employees.filter(
    (e) => e.employment === "partTime" && e.status === "active" && !day.partTime.some((p) => p.employeeId === e.id)
  );

  // 每个部门每一段班需要几名正社员（白班、晚班一样）
  const need = (dept: Department) => (dept === "Kitchen" ? schedule.settings.kitchenPerDay : schedule.settings.hallPerDay);

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <div className="dayEditor">

        {/* ===== 标题：日期 + 这是哪个月的班表 ===== */}
        <div className="deHeader">
          <div>
            <h2>{title}</h2>
            <p>{t.schedule.scheduleName(new Date(schedule.year, schedule.month - 1, 1).toLocaleString(locale, { year: "numeric", month: "long" }))}</p>
          </div>
          <button className="deClose" onClick={onClose} aria-label={t.dayEditor.close}><CloseIcon /></button>
        </div>

        {/* ===== 内容区（太长时只有这里滚动）===== */}
        <div className="deBody">
          {/* 员工账号：顶部提示只能看 */}
          {!canEdit && <Alert severity="info" sx={{ mb: 2 }}>{t.dayEditor.readOnly}</Alert>}

          {/* ===== 正社员：每个部门一块，块里分白班、晚班两段 ===== */}
          {DEPTS.map((dept) => (
            <section className="deSection" key={dept}>
              <div className="deSectionHead">
                <h3>{t.departments[dept]} · {t.dayEditor.fullTime}</h3>
              </div>

              {/* 每个部门里再分白班、晚班两段 */}
              {SHIFTS.map((shift) => {
                const ids = day[field(dept)][shift];       // 这一段已经排的人
                const short = need(dept) - ids.length;     // 还缺几人（负数或 0 表示够了）
                const s = timeOf(shift);
                // 还能加进这一段的正社员：这个部门、在职、这一段还没排
                const candidates = availableFullTime(dept).filter((e) => !ids.includes(e.id));
                return (
                  <div className="deShiftBlock" key={shift}>
                    <div className="deShiftHead">
                      <span className={`deShiftName ${shift}`}>{t.shifts[shift]} <small>{s.start}–{s.end}</small></span>
                      <span className={`deCount ${short > 0 ? "isShort" : ""}`}>
                        {short > 0 ? `${t.coverage(ids.length, need(dept))} · ${t.shortBy(short)}` : t.coverage(ids.length, need(dept))}
                      </span>
                    </div>

                    <div className="dePeople">
                      {ids.length === 0 && <span className="deEmpty">{t.dayEditor.none}</span>}
                      {ids.map((id) => {
                        const e = { name: employeeName(id) };
                        return (
                          <span className={`dePerson ${dept}`} key={id}>
                            <i>{initials(e.name)}</i>
                            {e.name}
                            {canEdit && (
                              <button aria-label="remove" onClick={() => removeFull(dept, shift, id)}><CloseIcon sx={{ fontSize: 14 }} /></button>
                            )}
                          </span>
                        );
                      })}

                      {/* 添加下拉框：value 永远是 ""，选了一个人就马上加进去，下拉框又回到「+ 添加…」
                          选项后面显示这个人本周已经上了几天，帮店长判断会不会太多 */}
                      {canEdit && candidates.length > 0 && (
                        <select
                          className="deSelect inline"
                          value=""
                          onChange={(ev) => ev.target.value && addFull(dept, shift, Number(ev.target.value))}
                        >
                          <option value="">+ {t.dayEditor.add}…</option>
                          {candidates.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name}（{t.dayEditor.weekDays(weekDaysOf(e.id, dept))}）
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}

          {/* ===== 服务员兼职：店长手动填 ===== */}
          <section className="deSection">
            <div className="deSectionHead">
              <h3>{t.departments.Hall} · {t.dayEditor.partTime}</h3>
              <span className="deCount">{day.partTime.length}</span>
            </div>

            <div className="dePeople">
              {day.partTime.length === 0 && <span className="deEmpty">{t.dayEditor.none}</span>}
              {day.partTime.map((p) => {
                const e = { name: employeeName(p.employeeId) };
                const s = timeOf(p.shift);
                return (
                  <span className="dePerson partTime" key={p.employeeId}>
                    <i>{initials(e.name)}</i>
                    {e.name}
                    <small className={`deShift ${p.shift}`}>{t.shifts[p.shift]} {s.start}–{s.end}</small>
                    {canEdit && (
                      <button aria-label="remove" onClick={() => removePart(p.employeeId)}><CloseIcon sx={{ fontSize: 14 }} /></button>
                    )}
                  </span>
                );
              })}
            </div>

            {/* 添加兼职：先选人、再选白班 / 晚班，点「添加」（没选人时按钮是灰的） */}
            {canEdit && (
              <div className="deAddRow">
                <select className="deSelect" value={ptId} onChange={(ev) => setPtId(ev.target.value)}>
                  <option value="">{t.dayEditor.choose}</option>
                  {partTimers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <select className="deSelect narrow" value={ptShift} onChange={(ev) => setPtShift(ev.target.value as ShiftType)}>
                  {shiftDefinitions.map((s) => (
                    <option key={s.type} value={s.type}>{t.shifts[s.type]} {s.start}–{s.end}</option>
                  ))}
                </select>
                <button className="deAddBtn" disabled={!ptId} onClick={addPart}>
                  <AddIcon sx={{ fontSize: 18 }} /> {t.dayEditor.add}
                </button>
              </div>
            )}
          </section>
        </div>

        {/* ===== 底部按钮：店长「取消 / 保存修改」；员工只有「关闭」
            onSave(day)：把改好的副本交给父组件（排班页），由它写回这个月的班表 ===== */}
        <div className="deFooter">
          {canEdit ? (
            <>
              <button className="deBtn" onClick={onClose}>{t.dayEditor.cancel}</button>
              <button className="deBtn primary" onClick={() => onSave(day)}>{t.dayEditor.save}</button>
            </>
          ) : (
            <button className="deBtn" onClick={onClose}>{t.dayEditor.close}</button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
