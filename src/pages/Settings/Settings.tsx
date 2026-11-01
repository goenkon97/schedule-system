// src/pages/Settings/Settings.tsx
// =====================================================
// 系统设置页面
//
// 布局：左边是设置分类标签，右边是当前分类的内容。
// 目前做好了“通用设置（General）”，其他分类先显示“即将推出”。
// 表单用“受控组件”写法：每个输入框的值都放在 state 里，
// 以后点保存时，直接把这个 state 对象发给后端即可。
// =====================================================

import { useEffect, useState } from "react";
import Switch from "@mui/material/Switch";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useLanguage } from "../../i18n/LanguageContext";
import "./Settings.css";

// 设置分类的 key（和翻译字典 t.settings.tabs 的 key 一一对应）
type TabKey =
  | "general"
  | "departments"
  | "shifts"
  | "roles"
  | "notifications"
  | "security"
  | "backup";

const tabKeys: TabKey[] = [
  "general",
  "departments",
  "shifts",
  "roles",
  "notifications",
  "security",
  "backup",
];

// 时区选项：value 用标准的 IANA 时区名（后端也认识），label 是显示文字
const timeZones = [
  { value: "Asia/Tokyo", label: "(UTC+09:00) Tokyo" },
  { value: "Asia/Shanghai", label: "(UTC+08:00) Shanghai" },
  { value: "Australia/Sydney", label: "(UTC+10:00) Sydney" },
  { value: "Europe/London", label: "(UTC+00:00) London" },
  { value: "America/New_York", label: "(UTC-05:00) New York" },
  { value: "America/Los_Angeles", label: "(UTC-08:00) Los Angeles" },
];

const dateFormats = ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"];

// 通用设置的数据结构
interface GeneralSettings {
  companyName: string;
  timeZone: string;
  dateFormat: string;
  timeFormat: "24h" | "12h";
  allowSwap: boolean;
  overtimeApproval: boolean;
}

function Settings() {

  const { t } = useLanguage();

  // 当前选中的分类
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  // 表单数据（默认值）
  const [form, setForm] = useState<GeneralSettings>({
    companyName: "Staff Scheduling System",
    timeZone: "Asia/Tokyo",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h",
    allowSwap: true,
    overtimeApproval: true,
  });

  // 是否显示“已保存”提示
  const [saved, setSaved] = useState(false);

  // 通用的更新函数：update("companyName", "xxx")
  // <K extends keyof GeneralSettings> 保证 key 和 value 的类型对得上
  const update = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // “已保存”提示 2 秒后自动消失
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer); // 组件卸载时清掉定时器
  }, [saved]);

  const handleSave = () => {
    // 以后这里换成：fetch("/api/settings", { method: "PUT", body: JSON.stringify(form) })
    console.log("Save settings:", form);
    setSaved(true);
  };

  return (
    <div className="Settings">

      <h1>{t.settings.title}</h1>
      <p className="pageSubtitle">{t.settings.subtitle}</p>

      <div className="settingsCard">

        {/* ========== 左边：分类标签 ========== */}
        <nav className="settingsTabs">
          {tabKeys.map((key) => (
            <button
              key={key}
              className={key === activeTab ? "active" : undefined}
              onClick={() => setActiveTab(key)}
            >
              {t.settings.tabs[key]}
            </button>
          ))}
        </nav>

        {/* ========== 右边：内容 ========== */}
        <section className="settingsPanel">

          {activeTab === "general" ? (
            <>
              <h2>{t.settings.generalTitle}</h2>

              {/* 公司名称 */}
              <label className="field">
                <span>{t.settings.companyName}</span>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => update("companyName", e.target.value)}
                />
              </label>

              {/* 时区 */}
              <label className="field">
                <span>{t.settings.timeZone}</span>
                <select
                  value={form.timeZone}
                  onChange={(e) => update("timeZone", e.target.value)}
                >
                  {timeZones.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </label>

              {/* 日期格式 + 时间格式：并排两列 */}
              <div className="fieldRow">
                <label className="field">
                  <span>{t.settings.dateFormat}</span>
                  <select
                    value={form.dateFormat}
                    onChange={(e) => update("dateFormat", e.target.value)}
                  >
                    {dateFormats.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>{t.settings.timeFormat}</span>
                  <select
                    value={form.timeFormat}
                    onChange={(e) => update("timeFormat", e.target.value as "24h" | "12h")}
                  >
                    <option value="24h">{t.settings.hour24}</option>
                    <option value="12h">{t.settings.hour12}</option>
                  </select>
                </label>
              </div>

              {/* 开关：允许换班 */}
              <div className="toggleRow">
                <div>
                  <strong>{t.settings.swapTitle}</strong>
                  <p>{t.settings.swapDesc}</p>
                </div>
                <Switch
                  checked={form.allowSwap}
                  onChange={(e) => update("allowSwap", e.target.checked)}
                />
              </div>

              {/* 开关：加班审批 */}
              <div className="toggleRow">
                <div>
                  <strong>{t.settings.overtimeTitle}</strong>
                  <p>{t.settings.overtimeDesc}</p>
                </div>
                <Switch
                  checked={form.overtimeApproval}
                  onChange={(e) => update("overtimeApproval", e.target.checked)}
                />
              </div>

              {/* 底部保存 */}
              <div className="settingsFooter">
                {saved && (
                  <span className="savedHint">
                    <CheckCircleIcon />
                    {t.settings.saved}
                  </span>
                )}
                <button className="saveButton" onClick={handleSave}>
                  {t.settings.save}
                </button>
              </div>
            </>
          ) : (
            // 其他分类：占位
            <>
              <h2>{t.settings.tabs[activeTab]}</h2>
              <p className="comingSoon">{t.settings.comingSoon}</p>
            </>
          )}

        </section>

      </div>

    </div>
  );
}

export default Settings;
