# Staff Scheduling System（烤肉店排班系统）

一个给烤肉店用的员工排班系统：店长自动生成正社员的月班表、手动安排兼职、管理员工；员工查看班表、提交请假 / 换班申请。

> 完整的 README（截图、功能介绍、技术说明、部署地址）会在后端完成后补上。

## 项目结构

前后端放在同一个仓库里，各自是一个独立的项目，互不影响：

```
schedule-system/
├── frontend/   React 19 + TypeScript + Vite + MUI（前端）
├── backend/    Java 21 + Spring Boot + MySQL（后端，开发中）
└── docs/       业务规则、接口清单（前后端共用）
```

## 本地启动

### 前端

```bash
cd frontend
npm install      # 第一次，或者依赖有变化时
npm run dev      # 打开 http://localhost:5173
```

### 数据库（Docker）

```bash
docker run -d --name schedule-mysql \
  -e MYSQL_ROOT_PASSWORD=root1234 -e MYSQL_DATABASE=schedule \
  -e MYSQL_USER=schedule -e MYSQL_PASSWORD=schedule1234 \
  -p 3306:3306 -v schedule-mysql-data:/var/lib/mysql mysql:8.4
```

### 后端

开发中。

## 文档

- [业务规则](docs/business-rules.md)
- [后端接口清单](docs/api-design.md)
