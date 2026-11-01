// src/i18n/LanguageContext.ts
// =====================================================
// 语言的“全局状态”
//
// 为什么用 Context：
// 当前语言要被很多组件同时用到（导航栏、各个页面、弹窗）。
// 如果一层层用 props 往下传会非常麻烦，
// Context 相当于在组件树的最外层放一个“公共盒子”，
// 任何子组件都能直接从盒子里取出当前语言和翻译。
// =====================================================

import { createContext, useContext } from "react";
import type { Dictionary, Language } from "./translations";

// 盒子里装的东西
export interface LanguageContextValue {
  language: Language;                  // 当前语言代码
  setLanguage: (lang: Language) => void; // 切换语言的函数
  t: Dictionary;                       // 当前语言的翻译字典
  locale: string;                      // 格式化日期用的 locale，例如 "ja-JP"
}

// 创建 Context，默认值 null（真正的值由 LanguageProvider 提供）
export const LanguageContext = createContext<LanguageContextValue | null>(null);

// 自定义 Hook：组件里写 const { t } = useLanguage(); 就能拿到翻译
export function useLanguage() {
  const ctx = useContext(LanguageContext);

  // 如果忘了在外层包 LanguageProvider，这里直接报错提醒
  if (!ctx) {
    throw new Error("useLanguage must be used inside <LanguageProvider>");
  }

  return ctx;
}
