// src/components/DayEditorDialog/DayEditorDialog.tsx
// =====================================================
// 点月历上的某一天打开：查看 / 修改这一天的人员
//
// - 店长（canEdit = true）：可以移除、添加正社员；给服务员添加兼职（选白班 / 晚班）
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
import { employees } from "../../data/employees";
import { shiftDefinitions } from "../../data/shifts";
import { availableFullTime } from "../../data/fullTimeScheduler";
import type { DayEntry, MonthSchedule } from "../../data/scheduleStore";

const byId = new Map(employees.map((e) => [e.id, e]));
const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// 部门 → 这一天数据里对应的字段
const field = (dept: Department) => (dept === "Kitchen" ? "kitchen" : "hall") as "kitchen" | "hall";

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
  const [day, setDay] = useState<DayEntry>(() => structuredClone(schedule.days[dayIndex]));

  // 添加兼职用的两个下拉框
  const [ptId, setPtId] = useState("");
  const [ptShift, setPtShift] = useState<ShiftType>("day");

  const date = new Date(schedule.year, schedule.month - 1, dayIndex + 1);
  const title = date.toLocaleDateString(locale, { month: "long", day: "numeric", weekday: "long" });

  // ---------- 某人「这一周」上了几天（帮店长遵守「每周最多 4 天」）----------
  // 一周从周一开始；只数这个月里的日子
  const weekDaysOf = (id: number, dept: Department) => {
    const wd = (date.getDay() + 6) % 7;                // 今天是这周的第几天（周一 = 0）
    const start = Math.max(0, dayIndex - wd);
    const end = Math.min(schedule.days.length - 1, dayIndex + (6 - wd));
    let n = 0;
    for (let i = start; i <= end; i++) {
      const d = i === dayIndex ? day : schedule.days[i];   // 今天用正在改的副本
      if (d[field(dept)].includes(id)) n++;
    }
    return n;
  };

  // ---------- 正社员：移除 / 添加 ----------
  const removeFull = (dept: Department, id: number) =>
    setDay((d) => ({ ...d, [field(dept)]: d[field(dept)].filter((x) => x !== id) }));

  const addFull = (dept: Department, id: number) =>
    setDay((d) => ({ ...d, [field(dept)]: [...d[field(dept)], id] }));

  // ---------- 兼职：移除 / 添加 ----------
  const removePart = (id: number) => setDay((d) => ({ ...d, partTime: d.partTime.filter((p) => p.employeeId !== id) }));

  const addPart = () => {
    if (!ptId) return;
    setDay((d) => ({ ...d, partTime: [...d.partTime, { employeeId: Number(ptId), shift: ptShift }] }));
    setPtId("");
  };

  // 还能加进来的兼职：在职、兼职、今天还没排
  const partTimers = employees.filter(
    (e) => e.employment === "partTime" && e.status === "active" && !day.partTime.some((p) => p.employeeId === e.id)
  );

  const DEPTS: Department[] = ["Kitchen", "Hall"];
  const need = (dept: Department) => (dept === "Kitchen" ? schedule.settings.kitchenPerDay : schedule.settings.hallPerDay);
  const timeOf = (s: ShiftType) => shiftDefinitions.find((d) => d.type === s)!;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <div className="dayEditor">

        <div className="deHeader">
          <div>
            <h2>{title}</h2>
            <p>{t.schedule.scheduleName(new Date(schedule.year, schedule.month - 1, 1).toLocaleString(locale, { year: "numeric", month: "long" }))}</p>
          </div>
          <button className="deClose" onClick={onClose} aria-label={t.dayEditor.close}><CloseIcon /></button>
        </div>

        <div className="deBody">
          {!canEdit && <Alert severity="info" sx={{ mb: 2 }}>{t.dayEditor.readOnly}</Alert>}

          {/* ===== 正社员：厨房、服务员各一块 ===== */}
          {DEPTS.map((dept) => {
            const ids = day[field(dept)];
            const short = need(dept) - ids.length;
            // 还能加进来的正社员：这个部门、在职、今天还没排
            const candidates = availableFullTime(dept).filter((e) => !ids.includes(e.id));
            return (
              <section className="deSection" key={dept}>
                <div className="deSectionHead">
                  <h3>{t.departments[dept]} · {t.dayEditor.fullTime}</h3>
                  <span className={`deCount ${short > 0 ? "isShort" : ""}`}>
                    {short > 0 ? `${t.coverage(ids.length, need(dept))} · ${t.shortBy(short)}` : t.coverage(ids.length, need(dept))}
                  </span>
                </div>

                <div className="dePeople">
                  {ids.length === 0 && <span className="deEmpty">{t.dayEditor.none}</span>}
                  {ids.map((id) => {
                    const e = byId.get(id)!;
                    return (
                      <span className={`dePerson ${dept}`} key={id}>
                        <i>{initials(e.name)}</i>
                        {e.name}
                        <small>{t.dayEditor.weekDays(weekDaysOf(id, dept))}</small>
                        {canEdit && (
                          <button aria-label="remove" onClick={() => removeFull(dept, id)}><CloseIcon sx={{ fontSize: 14 }} /></button>
                        )}
                      </span>
                    );
                  })}
                </div>

                {canEdit && candidates.length > 0 && (
                  <select
                    className="deSelect"
                    value=""
                    onChange={(ev) => ev.target.value && addFull(dept, Number(ev.target.value))}
                  >
                    <option value="">+ {t.dayEditor.add}…</option>
                    {candidates.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}（{t.dayEditor.weekDays(weekDaysOf(e.id, dept))}）
                      </option>
                    ))}
                  </select>
                )}
              </section>
            );
          })}

          {/* ===== 服务员兼职：店长手动填 ===== */}
          <section className="deSection">
            <div className="deSectionHead">
              <h3>{t.departments.Hall} · {t.dayEditor.partTime}</h3>
              <span className="deCount">{day.partTime.length}</span>
            </div>

            <div className="dePeople">
              {day.partTime.length === 0 && <span className="deEmpty">{t.dayEditor.none}</span>}
              {day.partTime.map((p) => {
                const e = byId.get(p.employeeId)!;
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
