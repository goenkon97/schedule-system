import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import CloseIcon from "@mui/icons-material/Close";
import "./CreateScheduleDialog.css";
import { useLanguage } from "../../i18n/LanguageContext";

// 员工和班次都从数据文件读：以前员工列表是在这里手写的 5 个人
import { employees } from "../../data/employees";
import { shiftDefinitions, shiftTimeLabel, departments } from "../../data/shifts";
import type { GenerateScheduleData } from "../../pages/Schedule/Schedule";

// 取名字首字母作头像："Tom Lee" → "TL"
const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// 默认选中的月份：下个月（排班一般提前排下个月），格式 "2026-12"
function nextMonthValue() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function CreateScheduleDialog({
  onShow,
  onGenerate,
}: {
  onShow: (value: boolean) => void;                 // 打开 / 关闭弹窗
  onGenerate: (data: GenerateScheduleData) => void; // 点「生成」时把选择的结果交给父组件
}) {
  // 当前语言的翻译
  const { t } = useLanguage();

  // 只显示在职的员工（长期休假中的人本来就不会被排）
  const activeEmployees = employees.filter((e) => e.status === "active");

  // 搜索关键字、勾选了「不参加」的员工、选择的月份
  const [keyword, setKeyword] = useState("");
  const [excluded, setExcluded] = useState<number[]>([]);
  const [month, setMonth] = useState(nextMonthValue());

  // 搜索：名字或部门（中英日都能搜到）
  const k = keyword.trim().toLowerCase();
  const shown = activeEmployees.filter(
    (e) => !k || `${e.name} ${e.department} ${t.departments[e.department]}`.toLowerCase().includes(k)
  );

  // 勾选 / 取消勾选
  const toggle = (id: number) =>
    setExcluded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // 生成：把 "2026-12" 拆成年和月交给父组件
  const handleGenerate = () => {
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) return;
    onGenerate({ year: y, month: m, excludedEmployees: excluded });
  };

  return (
    <Dialog
      open={true}
      onClose={() => onShow(false)}     // 点遮罩或按 Esc 也能关闭
      maxWidth="md"
      fullWidth
    >
      <div className="createScheduleDialog">

        {/* Header */}
        <div className="dialogHeader">
          <div>
            <h2>{t.dialog.title}</h2>
            <p>{t.dialog.description}</p>
          </div>
          <button className="dialogCloseButton" onClick={() => onShow(false)}>
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="dialogContent">

          {/* 左边：不参加排班的员工 */}
          <div className="employeeSection">

            <h3>{t.dialog.excludedTitle}</h3>
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
                  <input
                    type="checkbox"
                    checked={excluded.includes(e.id)}
                    onChange={() => toggle(e.id)}
                  />
                  <div className="employeeAvatar">{initials(e.name)}</div>
                  <div className="employeeInfo">
                    <strong>{e.name}</strong>
                    <span>{t.departments[e.department]}</span>
                  </div>
                </label>
              ))}
            </div>

          </div>

          {/* 右边：月份 + 规则 */}
          <div className="scheduleSettings">

            <h3>{t.dialog.monthTitle}</h3>
            <p className="sectionDescription">{t.dialog.monthDescription}</p>

            <label className="inputLabel">{t.dialog.monthLabel}</label>
            <input
              className="monthInput"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />

            {/* 每个班次需要的人数：从 shiftDefinitions 生成 */}
            <div className="requiredBox">
              <strong>{t.dialog.requiredTitle}</strong>
              <table className="requiredTable">
                <thead>
                  <tr>
                    <th></th>
                    {departments.map((d) => <th key={d}>{t.departments[d]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {shiftDefinitions.map((s) => (
                    <tr key={s.type}>
                      <td>
                        {t.shifts[s.type]}
                        <small>{shiftTimeLabel(s)}</small>
                      </td>
                      {departments.map((d) => <td key={d}>{t.staffCount(s.required[d])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 默认排班规则 */}
            <div className="scheduleNotice">
              <div className="noticeIcon">!</div>
              <div className="noticeContent">
                <strong>{t.dialog.rulesTitle}</strong>
                <ul>
                  {t.dialog.rules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="dialogFooter">
          <button className="cancelButton" onClick={() => onShow(false)}>
            {t.dialog.cancel}
          </button>
          <button className="generateButton" onClick={handleGenerate}>
            {t.dialog.generate}
          </button>
        </div>

      </div>
    </Dialog>
  );
}

export default CreateScheduleDialog;
