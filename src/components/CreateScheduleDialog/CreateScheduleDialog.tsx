// src/components/CreateScheduleDialog/CreateScheduleDialog.tsx
// =====================================================
// 新建排班弹窗（两步）
//
// 第 1 步「设置」：
//   左边：选择不参加排班的正社员（只列正社员，兼职不在这里排）
//   右边：选月份 + 调厨房 / 服务员每天需要的正社员人数（带 + − 按钮）
//         下面实时显示「需要几名 / 可用几名 / 缺几名」
// 第 2 步「预览」：
//   用前端的排班算法（src/data/fullTimeScheduler.ts）算出整月班表，在弹窗里显示：
//   每天厨房、服务员各是谁上班，缺人的日子标红；最下面是每人这个月上几天
//   点「使用这个班表」确认；点「返回修改」回到第 1 步
// =====================================================

import { useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import Alert from "@mui/material/Alert";
import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import "./CreateScheduleDialog.css";

import { useLanguage } from "../../i18n/LanguageContext";
import type { Department } from "../../i18n/translations";
import { employees } from "../../data/employees";
import {
  DEFAULT_SETTINGS,
  availableFullTime,
  estimateStaffing,
  generateFullTimeSchedule,
  type FullTimeSettings,
  type ScheduleResult,
} from "../../data/fullTimeScheduler";
import { tableSx } from "../DataTable/tableStyles";
import type { GenerateScheduleData } from "../../pages/Schedule/Schedule";

// 取名字首字母作头像："Tom Lee" → "TL"
const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// 短名字："Tom Lee" → "Tom L."（表格里放得下）
const shortName = (name: string) => {
  const [first, last] = name.split(" ");
  return last ? `${first} ${last[0]}.` : first;
};

// id → 员工，预览表格里用
const byId = new Map(employees.map((e) => [e.id, e]));

// 默认选中的月份：下个月（排班一般提前排下个月），格式 "2026-12"
function nextMonthValue() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const DEPTS: Department[] = ["Kitchen", "Hall"];

// ---------- + − 数字调节器（苹果风格的步进器）----------
function Stepper({ value, onChange, min = 1, max = 10 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div className="stepper">
      <button type="button" aria-label="-" disabled={value <= min} onClick={() => onChange(value - 1)}>
        <RemoveIcon fontSize="small" />
      </button>
      <span>{value}</span>
      <button type="button" aria-label="+" disabled={value >= max} onClick={() => onChange(value + 1)}>
        <AddIcon fontSize="small" />
      </button>
    </div>
  );
}

function CreateScheduleDialog({
  onShow,
  onGenerate,
}: {
  onShow: (value: boolean) => void;                 // 打开 / 关闭弹窗
  onGenerate: (data: GenerateScheduleData) => void; // 点「使用这个班表」时把结果交给父组件
}) {
  const { t, locale } = useLanguage();

  // ---------- 第 1 步的表单 ----------
  const [keyword, setKeyword] = useState("");
  const [excluded, setExcluded] = useState<number[]>([]);
  const [month, setMonth] = useState(nextMonthValue());
  const [settings, setSettings] = useState<FullTimeSettings>(DEFAULT_SETTINGS);

  // ---------- 第 2 步：算出来的班表（null = 还在第 1 步）----------
  const [result, setResult] = useState<ScheduleResult | null>(null);

  // 所有可以参加排班的正社员（不管有没有被排除），左边列表用
  const fullTimeStaff = useMemo(() => [...availableFullTime("Kitchen"), ...availableFullTime("Hall")], []);

  // 搜索：名字或部门（中英日都能搜到）
  const k = keyword.trim().toLowerCase();
  const shown = fullTimeStaff.filter(
    (e) => !k || `${e.name} ${e.department} ${t.departments[e.department]}`.toLowerCase().includes(k)
  );

  const toggle = (id: number) =>
    setExcluded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // 人数估算：设置或排除名单一变就重新算
  const estimates = estimateStaffing(settings, excluded);
  const anyShort = estimates.some((e) => e.short > 0);

  // "2026-12" → 年、月（月是 1~12）
  const [year, monthNum] = month.split("-").map(Number);
  const monthTitle = year && monthNum
    ? new Date(year, monthNum - 1, 1).toLocaleString(locale, { year: "numeric", month: "long" })
    : "";

  // 点「生成排班」：用前端算法算出整月班表，进入第 2 步
  const handleGenerate = () => {
    if (!year || !monthNum) return;
    setResult(generateFullTimeSchedule(year, monthNum - 1, settings, excluded));
  };

  // 点「使用这个班表」：交给父组件（以后这里会调用后端接口保存）
  const handleConfirm = () => {
    onGenerate({ year, month: monthNum, excludedEmployees: excluded, ...settings });
  };

  return (
    <Dialog open onClose={() => onShow(false)} maxWidth="md" fullWidth>
      <div className="createScheduleDialog">

        {/* ========== Header ========== */}
        <div className="dialogHeader">
          <div>
            <h2>{result ? t.dialog.previewTitle(monthTitle) : t.dialog.title}</h2>
            <p>{result ? t.dialog.previewDesc : t.dialog.description}</p>
          </div>
          <button className="dialogCloseButton" onClick={() => onShow(false)}>
            <CloseIcon />
          </button>
        </div>

        {!result ? (
          /* ================= 第 1 步：设置 ================= */
          <div className="dialogContent">

            {/* 左边：不参加排班的正社员 */}
            <div className="employeeSection">
              <h3>{t.dialog.excludedFullTime}</h3>
              <p className="sectionDescription">{t.dialog.excludedDescription}</p>

              <input
                className="employeeSearch"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t.dialog.searchPlaceholder}
              />

              <div className="employeeList">
                {shown.map((e) => (
                  <label className="employeeItem" key={e.id}>
                    <input type="checkbox" checked={excluded.includes(e.id)} onChange={() => toggle(e.id)} />
                    <div className="employeeAvatar">{initials(e.name)}</div>
                    <div className="employeeInfo">
                      <strong>{e.name}</strong>
                      <span>{t.departments[e.department]} · {t.employee.positions[e.position]}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 右边：月份 + 每天需要的正社员人数 + 规则 */}
            <div className="scheduleSettings">
              <h3>{t.dialog.monthTitle}</h3>
              <input className="monthInput" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />

              <div className="staffingBox">
                <strong>{t.dialog.staffingTitle}</strong>
                <p className="staffingHint">{t.dialog.staffingHint}</p>

                {estimates.map((est) => (
                  <div className="staffingRow" key={est.dept}>
                    <div className="staffingLabel">
                      <b>{est.dept === "Kitchen" ? t.dialog.kitchenPerDay : t.dialog.hallPerDay}</b>
                      <small>{t.dialog.needHave(est.need, est.have)}</small>
                    </div>
                    <div className="staffingControl">
                      <Stepper
                        value={est.perDay}
                        onChange={(v) => setSettings((s) => (est.dept === "Kitchen" ? { ...s, kitchenPerDay: v } : { ...s, hallPerDay: v }))}
                      />
                      <span className={`staffingBadge ${est.short ? "isShort" : ""}`}>
                        {est.short ? t.dialog.shortOf(est.short) : t.dialog.enough}
                      </span>
                    </div>
                  </div>
                ))}

                {anyShort && <Alert severity="warning" sx={{ mt: 1.5, fontSize: 13 }}>{t.dialog.shortWarning}</Alert>}
              </div>

              <div className="scheduleNotice">
                <div className="noticeIcon">!</div>
                <div className="noticeContent">
                  <strong>{t.dialog.rulesTitle}</strong>
                  <ul>
                    {t.dialog.rules.map((rule) => <li key={rule}>{rule}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================= 第 2 步：预览 ================= */
          <div className="previewContent">

            {/* 一句话总结：每天都排满 / 有几天缺人 */}
            <div className={`previewSummary ${result.shortDayCount ? "isShort" : ""}`}>
              {result.shortDayCount ? t.dialog.shortDays(result.shortDayCount) : t.dialog.allCovered}
            </div>

            {/* 整月班表：一行一天 */}
            <TableContainer className="previewTable">
              <Table stickyHeader size="small" sx={[tableSx, { "& .MuiTableCell-root": { whiteSpace: "normal" } }]}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 92 }}>{t.dialog.colDate}</TableCell>
                    {DEPTS.map((d) => <TableCell key={d}>{t.departments[d]}</TableCell>)}
                    <TableCell sx={{ width: 130 }}>{t.dialog.colStatus}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.days.map((d) => {
                    const weekend = d.weekday === 0 || d.weekday === 6;
                    const short = DEPTS.filter((dept) => d.short[dept] > 0);
                    return (
                      <TableRow key={d.date} className={weekend ? "weekendRow" : undefined}>
                        <TableCell>
                          <span className="previewDate">{monthNum}/{d.day}</span>
                          <span className={`previewWeekday ${weekend ? "weekend" : ""}`}>{t.schedule.weekdays[d.weekday]}</span>
                        </TableCell>
                        {DEPTS.map((dept) => (
                          <TableCell key={dept}>
                            <div className="nameChips">
                              {d.staff[dept].map((id) => (
                                <span className={`nameChip ${dept}`} key={id}>{shortName(byId.get(id)!.name)}</span>
                              ))}
                              {/* 缺几人，就画几个虚线空位 */}
                              {Array.from({ length: d.short[dept] }, (_, i) => (
                                <span className="nameChip empty" key={`e${i}`}>—</span>
                              ))}
                            </div>
                          </TableCell>
                        ))}
                        <TableCell>
                          {short.length ? (
                            <span className="statusShort">
                              {short.map((dept) => `${t.departments[dept]} ${t.dialog.shortOf(d.short[dept])}`).join(" · ")}
                            </span>
                          ) : (
                            <span className="statusOk">{t.dialog.ok}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* 每人上几天：一眼看出是否平均 */}
            <div className="daysSummary">
              <strong>{t.dialog.daysTitle}</strong>
              {DEPTS.map((dept) => (
                <div className="daysRow" key={dept}>
                  <span className="daysDept">{t.departments[dept]}</span>
                  <div className="nameChips">
                    {availableFullTime(dept, excluded).map((e) => (
                      <span className={`nameChip ${dept}`} key={e.id}>
                        {shortName(e.name)} <b>{t.dialog.days(result.daysByEmployee.get(e.id) ?? 0)}</b>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== Footer ========== */}
        <div className="dialogFooter">
          {!result ? (
            <>
              <button className="cancelButton" onClick={() => onShow(false)}>{t.dialog.cancel}</button>
              <button className="generateButton" onClick={handleGenerate}>{t.dialog.generate}</button>
            </>
          ) : (
            <>
              <button className="cancelButton withIcon" onClick={() => setResult(null)}>
                <ArrowBackIcon fontSize="small" /> {t.dialog.back}
              </button>
              <button className="generateButton" onClick={handleConfirm}>{t.dialog.confirm}</button>
            </>
          )}
        </div>

      </div>
    </Dialog>
  );
}

export default CreateScheduleDialog;
