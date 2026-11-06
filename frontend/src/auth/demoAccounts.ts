// src/auth/demoAccounts.ts
// =====================================================
// 演示账号：只用来在登录页上「一键填好邮箱和密码」，方便招聘方试用。
// 真正检查密码的是后端（数据库里存的是 BCrypt 哈希），前端这里不做任何判断。
// （单独放一个文件：React 的开发工具要求「放组件的文件」只导出组件，常量要放别处）
// =====================================================
export const DEMO_ACCOUNTS = [
  { email: "manager@demo.com", password: "demo1234" },
  { email: "staff@demo.com", password: "demo1234" },
] as const;
