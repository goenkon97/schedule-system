// src/theme.ts
// =====================================================
// 全局设计主题（整个项目的颜色、字体、圆角、阴影都以这里为准）
//
// 为什么要有它：
// MUI 组件（登录按钮、分页、开关、输入框……）默认用的是 MUI 自己的蓝色 #1976d2，
// 而我们手写的 CSS 用的是 #2563EB，两种蓝混在一起就会显得「怪怪的」。
// 在这里把 MUI 的主题改成和 index.css 里的 CSS 变量一样的值，
// 两边就统一成同一套设计了。改颜色时，这里和 index.css 的 :root 一起改。
// =====================================================

// createTheme：MUI 提供的函数，传入我们想改的部分，
// 它会和 MUI 的默认主题合并，返回一个完整的主题对象（没写的部分保持默认）
import { createTheme } from "@mui/material/styles";

// 设计令牌（和 src/index.css 里的 :root 变量一一对应）
// 「令牌（token）」就是给颜色起名字：代码里写 tokens.primary，
// 以后换颜色只改这一处，所有用到它的地方一起变
export const tokens = {
  primary: "#2563EB",       // 品牌蓝：主按钮、选中状态、链接
  primaryHover: "#1D4ED8",  // 悬停时深一点
  primarySoft: "#EFF6FF",   // 很浅的蓝：选中背景、提示底色
  ink: "#0F172A",           // 正文 / 标题（比纯黑柔和）
  inkSoft: "#64748B",       // 次要文字
  border: "#E2E8F0",        // 边框
  background: "#F5F7FB",    // 页面底色
  shell: "#0F172A",         // 顶部栏 + 左侧菜单（深海军蓝）
};

// 字体：英文用 Inter，中文 / 日文用系统自带的高质量字体
export const fontStack =
  '"Inter", "PingFang SC", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans CJK SC", "Microsoft YaHei", system-ui, sans-serif';

// 导出的 theme 会在 main.tsx 里传给 <ThemeProvider theme={theme}>
export const theme = createTheme({
  // palette：调色板。MUI 组件写 color="primary"、color="error" 时，就从这里取颜色
  palette: {
    primary: { main: tokens.primary, dark: tokens.primaryHover, light: "#3B82F6", contrastText: "#FFFFFF" },
    text: { primary: tokens.ink, secondary: tokens.inkSoft },
    divider: tokens.border,
    background: { default: tokens.background, paper: "#FFFFFF" },
    error: { main: "#DC2626" },
    success: { main: "#16A34A" },
    warning: { main: "#D97706" },
  },

  // typography：所有 MUI 文字的字体、粗细
  typography: {
    fontFamily: fontStack,
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },   // 按钮文字不要全大写
  },

  shape: { borderRadius: 10 },   // 全局圆角 10px

  // components：按组件改默认设置
  //   defaultProps   → 改这个组件的默认属性（相当于每次使用时自动加上）
  //   styleOverrides → 改这个组件的样式（root 是最外层元素）
  components: {
    // ---------- 按钮 ----------
    MuiButton: {
      defaultProps: { disableElevation: true },   // 去掉 MUI 默认的厚重阴影
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: "background-color .15s, box-shadow .15s, transform .05s",
          // variants：只对「实心 + 主色」的按钮生效（MUI v9 的写法，以前叫 containedPrimary）
          variants: [
            {
              props: { variant: "contained", color: "primary" },
              style: {
                // 主按钮：纯色 + 一层很淡的品牌色光晕，看起来更「实」
                backgroundColor: tokens.primary,
                boxShadow: "0 1px 2px rgba(15,23,42,.08), 0 6px 16px -6px rgba(37,99,235,.55)",
                "&:hover": {
                  backgroundColor: tokens.primaryHover,
                  boxShadow: "0 1px 2px rgba(15,23,42,.08), 0 8px 20px -6px rgba(29,78,216,.6)",
                },
                "&:active": { transform: "translateY(1px)" },   // 按下时轻轻下沉
              },
            },
          ],
        },
      },
    },

    // ---------- 输入框 ----------
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: "#FFFFFF",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: tokens.border },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#CBD5E1" },
          // 聚焦时：蓝色边框 + 外面一圈很淡的蓝光（和手写 CSS 的输入框一致）
          "&.Mui-focused": { boxShadow: "0 0 0 4px rgba(37,99,235,.12)" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: tokens.primary, borderWidth: 1.5 },
        },
      },
    },

    // ---------- 顶部栏 ----------
    MuiAppBar: { defaultProps: { elevation: 0 } },

    // ---------- 卡片 / 弹窗 ----------
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 14 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 18 } } },

    // ---------- 提示框 ----------
    MuiAlert: { styleOverrides: { root: { borderRadius: 10 } } },

    // ---------- 鼠标悬停提示 ----------
    MuiTooltip: {
      styleOverrides: { tooltip: { backgroundColor: tokens.ink, fontSize: 12, borderRadius: 6 } },
    },
  },
});
