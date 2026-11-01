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

export default function LanguageSwitcher() {

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
        // 蓝色导航栏上用半透明白色的按钮
        "& .MuiToggleButton-root": {
          color: "rgba(255,255,255,0.85)",
          borderColor: "rgba(255,255,255,0.4)",
          px: 1.5,
          py: 0.25,
          textTransform: "none",
          fontWeight: 600,
        },
        // 选中状态：白底蓝字
        "& .MuiToggleButton-root.Mui-selected": {
          color: "#1d4ed8",
          backgroundColor: "#ffffff",
        },
        "& .MuiToggleButton-root.Mui-selected:hover": {
          backgroundColor: "#e5e7eb",
        },
      }}
    >
      {languages.map((lang) => (
        <ToggleButton key={lang} value={lang}>
          {languageLabels[lang]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
