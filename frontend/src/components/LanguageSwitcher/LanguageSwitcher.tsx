// src/components/LanguageSwitcher/LanguageSwitcher.tsx
// =====================================================
// 顶部导航栏右侧的语言切换按钮：EN / 中文 / 日本語
// 用 MUI 的 ToggleButtonGroup（一组按钮，同时只能选中一个）
// =====================================================

import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useLanguage } from "../../i18n/LanguageContext";
import { languageLabels, type Language } from "../../i18n/translations";

// 按钮顺序
const languages: Language[] = ["en", "zh", "ja"];

// tone：放在什么颜色的背景上。dark = 蓝色顶部栏（默认，白色按钮）；light = 白色背景（登录页，深色按钮）
export default function LanguageSwitcher({ tone = "dark" }: { tone?: "dark" | "light" }) {

  // 从全局 Context 拿到当前语言和切换函数
  const { language, setLanguage } = useLanguage();

  return (
    <ToggleButtonGroup
      value={language}          // 当前选中的按钮
      exclusive                 // 单选
      size="small"
      onChange={(_, value: Language | null) => {
        // 再点一次已选中的按钮时 MUI 会传 null，这里忽略，保证总有一个语言被选中
        if (value) setLanguage(value);
      }}
      aria-label="language"
      sx={{
        mr: 2,
        // 蓝色导航栏上用半透明白色的按钮；白色背景上用灰色按钮
        "& .MuiToggleButton-root": {
          color: tone === "dark" ? "rgba(255,255,255,0.85)" : "#4b5563",
          borderColor: tone === "dark" ? "rgba(255,255,255,0.4)" : "#d1d5db",
          px: 1.5,
          py: 0.25,
          textTransform: "none",
          fontWeight: 600,
        },
        // 选中状态：白底蓝字
        "& .MuiToggleButton-root.Mui-selected": {
          color: tone === "dark" ? "#1d4ed8" : "#ffffff",
          backgroundColor: tone === "dark" ? "#ffffff" : "#2563eb",
        },
        "& .MuiToggleButton-root.Mui-selected:hover": {
          backgroundColor: tone === "dark" ? "#e5e7eb" : "#1d4ed8",
        },
      }}
    >
      {/* 三个语言各生成一个按钮；value 是按下后传给 onChange 的值 */}
      {languages.map((lang) => (
        <ToggleButton key={lang} value={lang}>
          {languageLabels[lang]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
