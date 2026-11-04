// vite.config.ts
// =====================================================
// Vite 的配置文件（Vite = 前端开发服务器 + 打包工具）
//
// npm run dev 时，Vite 在你电脑上启动一个程序，占住 5173 端口：
//   - 浏览器打开 http://localhost:5173 → Vite 把 index.html、React 代码发给浏览器
//   - 现在多了一件事：浏览器请求 /api/... → Vite 不自己回答，而是「转交」给 8080 端口的 Spring Boot
// =====================================================

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // ---------- 开发服务器设置（只在 npm run dev 时生效，打包上线后不存在）----------
  server: {
    // proxy：代理 / 转发规则
    //
    // 为什么需要它（同源策略）：
    //   浏览器认为「协议 + 主机 + 端口」完全一样才是同一个网站。
    //   页面在 localhost:5173，后端在 localhost:8080 —— 端口不同 = 两个网站。
    //   页面直接 fetch 8080，浏览器会拦下返回的数据（控制台报 CORS 错误），这是浏览器的安全规则。
    //
    // 代理怎么绕开：
    //   页面只发 fetch('/api/employees') —— 没写主机和端口，就是发给自己（5173），同一个网站，浏览器不拦。
    //   Vite 收到后，看到路径以 /api 开头，就用 Node.js 自己再发一次请求到 8080，
    //   拿到结果后原样交回给浏览器。
    //   「程序 → 程序」的请求没有浏览器参与，同源策略管不到（和你用 curl 访问 8080 是一个道理）。
    proxy: {
      // 键 '/api'：路径以 /api 开头的请求才转发（/src/main.tsx 这种还是 Vite 自己处理）
      // 值：转发到哪里。路径原样保留：/api/employees → http://localhost:8080/api/employees
      '/api': 'http://localhost:8080',
    },
  },
})
