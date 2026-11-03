// src/components/CreateScheduleDialog/CreateScheduleDialog.tsx
// =====================================================
// 新建排班弹窗（两步）
//
// 第 1 步「设置」：
//   左边：选择不参加排班的正社员（只列正社员，兼职不在这里排）
//   右边：选月份（只能选下个月、下下个月）+ 调厨房 / 服务员每天需要的正社员人数（带 + − 按钮）
//         下面实时显示「需要几名 / 可用几名 / 缺几名」
// 第 2 步「预览」：
//   用前端的排班算法（src/data/fullTimeScheduler.ts）算出整月班表，用「月历」的样子显示：
//   每个日期格里，橙色圆点 = 厨房正社员，蓝色圆点 = 服务员正社员（圆点里是名字缩写，鼠标悬停看全名）
//   缺人的格子标红、画虚线空位；最下面是每人这个月上几天
//
// 布局：弹窗最高 = 屏幕高度；标题栏和底部按钮固定，只有中间内容区在需要时滚动，
//       这样按钮永远看得见，电脑上一般一屏就能显示完
//   点「使用这个班表」确认；点「返回修改」回到第 1 步
//
// 和父组件（Schedule 页）的关系：
//   父组件决定「开不开」这个弹窗；弹窗算好班表后，通过 onGenerate 把结果「交还」给父组件，
//   由父组件保存。弹窗自己不存任何班表数据。
// =====================================================

// useState：组件自己的状态；useMemo：把计算结果缓存起来，依赖不变就不重新算
import { useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import "./CreateScheduleDialog.css";

import { useLanguage } from "../../i18n/LanguageContext";
import type { Department } from "../../i18n/translations";
import { employeeName } from "../../data/employees";
import {
  DEFAULT_SETTINGS,
  availableFullTime,
  estimateStaffing,
  generateFullTimeSchedule,
  type FullTimeSettings,
  type ScheduleResult,
} from "../../data/fullTimeScheduler";
import type { GenerateScheduleData } from "../../pages/Schedule/Schedule";
import { monthKey } from "../../data/scheduleStore";

// 取名字首字母作头像："Tom Lee" → "TL"
const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// 短名字："Tom Lee" → "Tom L."（底部「每人天数」里用）
const shortName = (name: string) => {
  const [first, last] = name.split(" ");
  return last ? `${first} ${last[0]}.` : first;
};


const DEPTS: Department[] = ["Kitchen", "Hall"];

// ---------- + − 数字调节器（苹果风格的步进器）----------
// 一个只在这个文件里用的小组件：显示数字，点 − / + 调用 onChange(新数字)
// 到了 min / max 时对应的按钮变灰（disabled），不能再减 / 再加
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
  months,
  existingKeys,
}: {
  onShow: (value: boolean) => void;                 // 打开 / 关闭弹窗
  onGenerate: (data: GenerateScheduleData) => void; // 点「使用这个班表」时把结果交给父组件
  months: { year: number; month: number }[];        // 可以选的月份（下个月、下下个月）
  existingKeys: string[];                           // 已经有班表的月份，例如 ["2026-11", "2026-12"]
}) {
  const { t, locale } = useLanguage();

  // ---------- 第 1 步的表单 ----------
  const [keyword, setKeyword] = useState("");                 // 左边搜索框里的文字
  const [excluded, setExcluded] = useState<number[]>([]);    // 被勾选「不参加」的员工 id
  // 选中的月份，格式 "2026-12"；默认选下个月
  const [month, setMonth] = useState(monthKey(months[0].year, months[0].month));
  const [settings, setSettings] = useState<FullTimeSettings>(DEFAULT_SETTINGS);   // 厨房 / 服务员每天几人

  // ---------- 第 2 步：算出来的班表（null = 还在第 1 步）----------
  const [result, setResult] = useState<ScheduleResult | null>(null);

  // 所有可以参加排班的正社员（不管有没有被排除），左边列表用
  // useMemo(..., [])：依赖是空数组 → 弹窗打开时算一次，之后不再重算
  const fullTimeStaff = useMemo(() => [...availableFullTime("Kitchen"), ...availableFullTime("Hall")], []);

  // 搜索：名字或部门（中英日都能搜到）
  const k = keyword.trim().toLowerCase();
  const shown = fullTimeStaff.filter(
    (e) => !k || `${e.name} ${e.department} ${t.departments[e.department]}`.toLowerCase().includes(k)
  );

  // 勾选 / 取消勾选：已经在名单里就去掉，不在就加进去
  // setExcluded(prev => ...)：用「上一次的值」算新值，React 推荐的写法
  const toggle = (id: number) =>
    setExcluded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // 人数估算：设置或排除名单一变就重新算
  const estimates = estimateStaffing(settings, excluded);
  const anyShort = estimates.some((e) => e.short > 0);

  // "2026-12" → 年、月（月是 1~12）
  // split("-") → ["2026", "12"]；map(Number) → [2026, 12]；再解构成两个变量
  const [year, monthNum] = month.split("-").map(Number);
  const monthTitle = year && monthNum
    ? new Date(year, monthNum - 1, 1).toLocaleString(locale, { year: "numeric", month: "long" })
    : "";

  // 点「生成排班」：用前端算法算出整月班表，进入第 2 步
  const handleGenerate = () => {
    if (!year || !monthNum) return;
    // monthNum - 1：算法里的月份和 JS 的 Date 一样从 0 开始（0 = 1 月）
    // setResult 之后 result 不再是 null → 下面的 JSX 自动切换成第 2 步的预览
    setResult(generateFullTimeSchedule(year, monthNum - 1, settings, excluded));
  };

  // 点「使用这个班表」：交给父组件（以后这里会调用后端接口保存）
  const handleConfirm = () => {
    if (!result) return;
    // ...settings：把 kitchenPerDay、hallPerDay 两个字段展开放进这个对象
    onGenerate({ year, month: monthNum, excludedEmployees: excluded, ...settings, result });
  };

  return (
    // open：一直是打开的（要不要显示由父组件决定渲不渲染这个组件）
    // onClose：点弹窗外面的灰色区域或按 Esc 时调用
    <Dialog
      open
      onClose={() => onShow(false)}
      // 预览日历需要更宽一点，所以第 2 步用 lg
      maxWidth={result ? "lg" : "md"}
      fullWidth
      // 纸面本身不滚动，交给里面的内容区滚动 → 标题栏和底部按钮始终可见
      // 弹窗离屏幕上下边缘只留 16px（默认 32px），小屏幕上能多放一点内容
      slotProps={{ paper: { sx: { display: "flex", overflow: "hidden", m: 2, maxHeight: "calc(100% - 32px)" } } }}
    >
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

        {/* result 是 null → 显示第 1 步；有结果 → 显示第 2 步（三元表达式 条件 ? A : B） */}
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
              <p className="sectionDescription">{t.dialog.monthLimitHint}</p>

              {/* 只能选两个月：做成两个并排的按钮（分段选择器） */}
              <div className="monthPicker">
                {months.map((m) => {
                  const k = monthKey(m.year, m.month);
                  return (
                    <button
                      type="button"
                      key={k}
                      className={k === month ? "active" : undefined}
                      onClick={() => setMonth(k)}
                    >
                      {new Date(m.year, m.month - 1, 1).toLocaleString(locale, { year: "numeric", month: "long" })}
                      {existingKeys.includes(k) && <small>{t.dialog.monthExists}</small>}
                    </button>
                  );
                })}
              </div>
              {existingKeys.includes(month) && (
                <Alert severity="info" sx={{ mt: 1, py: 0, fontSize: 12.5 }}>{t.dialog.monthExistsWarn}</Alert>
              )}

              <div className="staffingBox">
                <strong>{t.dialog.staffingTitle}</strong>
                {/* 规则说明：一共需要几人，就是按「每人每周 4 天全天班」算出来的；兼职不在这里调 */}
                <p className="staffingRule">{t.dialog.staffingRule}</p>

                {estimates.map((est) => (
                  <div className="staffingRow" key={est.dept}>
                    <div className="staffingLabel">
                      <b>{est.dept === "Kitchen" ? t.dialog.kitchenPerDay : t.dialog.hallPerDay}</b>
                      <small>{t.dialog.needHave(est.need, est.have)}</small>
                    </div>
                    <div className="staffingControl">
                      {/* 改数字：只改对应部门的那个字段，另一个保持不变（{ ...s, 字段: 新值 }） */}
                      <Stepper
                        value={est.perDay}
                        onChange={(v) => setSettings((s) => (est.dept === "Kitchen" ? { ...s, kitchenPerDay: v } : { ...s, hallPerDay: v }))}
                      />
                      {/* 单位写清楚：这个数字是「每天几人」 */}
                      <span className="stepperUnit">{t.dialog.perDayUnit}</span>
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
            <div className="pvTop">
              <div className={`previewSummary ${result.shortDayCount ? "isShort" : ""}`}>
                {result.shortDayCount ? t.dialog.shortDays(result.shortDayCount) : t.dialog.allCovered}
              </div>

              {/* 图例：颜色代表什么 */}
              <div className="pvLegend">
                <span><i className="pvDot Kitchen" /> {t.departments.Kitchen}</span>
                <span><i className="pvDot Hall" /> {t.departments.Hall}</span>
                <span><i className="pvDot empty" /> {t.schedule.shortLegend}</span>
              </div>
            </div>

            {/* 整月班表：月历的样子，和 Schedule 页面的月历一样从周日开始 */}
            <div className="pvCalendar">
              {t.schedule.weekdays.map((w, i) => (
                <div className={`pvHead ${i === 0 || i === 6 ? "weekend" : ""}`} key={w}>{w}</div>
              ))}

              {/* 1 号前面的空白格：1 号是星期几，前面就空几格 */}
              {/* Array.from({ length: n }, ...)：生成一个长度为 n 的数组，用来循环画 n 个格子 */}
              {Array.from({ length: result.days[0].weekday }, (_, i) => (
                <div className="pvCell outside" key={`blank${i}`} />
              ))}

              {result.days.map((d) => {
                const isShort = DEPTS.some((dept) => d.short[dept] > 0);
                const weekend = d.weekday === 0 || d.weekday === 6;
                return (
                  <div className={`pvCell ${isShort ? "isShort" : ""}`} key={d.date}>
                    <div className={`pvDate ${weekend ? "weekend" : ""}`}>{d.day}</div>

                    {/* 每个部门一行圆点 */}
                    {DEPTS.map((dept) => (
                      <div className="pvRow" key={dept}>
                        {d.staff[dept].map((id) => {
                          const e = { name: employeeName(id) };
                          return (
                            <Tooltip title={`${e.name} · ${t.departments[dept]}`} key={id} arrow>
                              <span className={`pvDot ${dept}`}>{initials(e.name)}</span>
                            </Tooltip>
                          );
                        })}
                        {/* 缺几人，就画几个红色虚线空位 */}
                        {Array.from({ length: d.short[dept] }, (_, i) => (
                          <span className="pvDot empty" key={`e${i}`} />
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* 每人上几天：一眼看出是否平均 */}
            <div className="daysSummary">
              <strong>{t.dialog.daysTitle}</strong>
              {DEPTS.map((dept) => (
                <div className="daysRow" key={dept}>
                  <span className="daysDept">{t.departments[dept]}</span>
                  <div className="nameChips">
                    {availableFullTime(dept, excluded).map((e) => (
                      <span className={`nameChip ${dept}`} key={e.id}>
                        <i className={`pvDot small ${dept}`}>{initials(e.name)}</i>
                        {shortName(e.name)} <b>{t.dialog.days(result.daysByEmployee.get(e.id) ?? 0)}</b>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== Footer：第 1 步是「取消 / 生成」，第 2 步是「返回修改 / 使用这个班表」==========
            <>...</>：Fragment，把两个按钮包成一组，但不会在页面上多出一层 div */}
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
