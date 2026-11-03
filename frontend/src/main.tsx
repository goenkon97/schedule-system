// src/main.tsx
// =====================================================
// 整个前端的「入口文件」—— 浏览器最先运行的就是这里
//
// 打开网页时发生了什么：
// 1. 浏览器先下载 index.html，里面只有一个空的 <div id="root"></div>
//    和一行 <script src="/src/main.tsx">
// 2. 浏览器运行这个文件：React 找到那个空 div，把整个 App 画进去
// 3. 之后页面上看到的所有东西（菜单、表格、弹窗）都是 React 生成的
//
// 这里还做了一件重要的事：把几个「全局 Provider」一层层包在 App 外面。
// Provider 就像一个「广播站」：包在它里面的所有组件，
// 不管嵌套多深，都能直接拿到它提供的数据（主题、语言、登录用户）。
// =====================================================

// StrictMode：React 的「严格模式」，只在开发时生效，
// 会故意把组件多渲染一次，帮你提前发现写法上的问题（上线后不影响性能）
import { StrictMode } from 'react'

// createRoot：React 18 之后的写法，把 React 挂到页面上的某个 DOM 元素上
import { createRoot } from 'react-dom/client'

// BrowserRouter：React Router 的根组件，负责「网址 ↔ 页面」的对应关系
// 有了它，地址栏变成 /schedule 时不用刷新整个网页，只切换显示的组件
import { BrowserRouter } from 'react-router-dom'

// 全局 CSS：颜色变量（--primary 等）、整体布局（顶部栏、侧边栏、内容区）
import './index.css'

// 根组件：顶部栏 + 侧边栏 + 各个页面
import App from './App.tsx'

// 多语言 Provider：让所有组件都能拿到当前语言和翻译
import { LanguageProvider } from './i18n/LanguageProvider'

// 登录状态 Provider：所有组件都能用 useAuth() 拿到当前登录的用户
import { AuthProvider } from './auth/AuthProvider'

// 全局设计主题：让所有 MUI 组件和我们手写的 CSS 用同一套颜色、字体、圆角
import { ThemeProvider } from '@mui/material/styles'
import { theme } from './theme'

// document.getElementById('root')：找到 index.html 里那个空的 div
// 后面的 !：告诉 TypeScript「这个元素一定存在，不会是 null」
// .render(...)：把括号里的组件树画进这个 div
createRoot(document.getElementById('root')!).render(
    <StrictMode>

        {/* React Router 根组件：包在最外面，里面所有组件都能用 useNavigate / useLocation */}
        <BrowserRouter>

            {/* 包的顺序：外层的 Provider 里面的组件都能用。
                ThemeProvider → MUI 组件拿到统一的颜色
                LanguageProvider → 所有组件都能用 useLanguage() 拿翻译
                AuthProvider → 所有组件都能用 useAuth() 拿登录用户 */}
            <ThemeProvider theme={theme}>
                <LanguageProvider>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                </LanguageProvider>
            </ThemeProvider>

        </BrowserRouter>

    </StrictMode>,
)
