// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.tsx'

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
// 多语言 Provider：让所有组件都能拿到当前语言和翻译
import { LanguageProvider } from './i18n/LanguageProvider'
// 登录状态 Provider：所有组件都能用 useAuth() 拿到当前登录的用户
import { AuthProvider } from './auth/AuthProvider'
// 全局设计主题：让所有 MUI 组件和我们手写的 CSS 用同一套颜色、字体、圆角
import { ThemeProvider } from '@mui/material/styles'
import { theme } from './theme'

createRoot(document.getElementById('root')!).render(
    <StrictMode>

        {/* React Router 根组件 */}
        <BrowserRouter>

            {/* 语言 Provider 包在 App 外面 → App 里所有页面都能用 useLanguage() */}
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
