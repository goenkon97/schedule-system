// src/i18n/LanguageProvider.tsx
// =====================================================
// 把“当前语言”这个状态提供给整个应用
// 在 main.tsx 里包在 <App /> 外面
// =====================================================

import { useEffect, useState, type ReactNode } from "react";
import { LanguageContext } from "./LanguageContext";
import { localeMap, translations, type Language } from "./translations";

// localStorage 里保存语言用的 key
const STORAGE_KEY = "schedule-system-language";

// 读取上次选择的语言（刷新页面后语言不会丢）
function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "zh" || saved === "ja") {
      return saved;
    }
  } catch {
    // 某些浏览器隐私模式会禁止 localStorage，忽略即可
  }
  return "en"; // 默认英文
}

export function LanguageProvider({ children }: { children: ReactNode }) {

  // 当前语言（传函数给 useState：只在第一次渲染时读取 localStorage）
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  // 语言变化时：
  // 1. 保存到 localStorage
  // 2. 修改 <html lang="...">，让浏览器知道页面语言（字体选择、读屏软件会用到）
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // 忽略
    }
    document.documentElement.lang = localeMap[language];
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translations[language], // 根据当前语言取出对应字典
        locale: localeMap[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
