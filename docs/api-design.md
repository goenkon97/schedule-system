# 后端接口清单（明天开始写）

> 这份文档是写后端前的“地图”：先看懂全貌，再一个一个写。
> 规则细节见 [business-rules.md](./business-rules.md)。

---

## 0. 先看全貌：前端、后端、数据库是什么关系

```
 浏览器（React 前端）            Java 后端（Spring Boot）              数据库（MySQL）
 ┌──────────────────┐   HTTP   ┌──────────────────────────┐   SQL   ┌──────────────┐
 │ 页面点「添加员工」 │ ───────▶ │ 收到 POST /api/employees │ ──────▶ │ employees 表 │
 │                  │ ◀─────── │ 检查权限、检查数据、保存  │ ◀────── │ 多了一行数据  │
 │ 列表里多了一个人   │   JSON   │ 返回新员工的 JSON        │         │              │
 └──────────────────┘          └──────────────────────────┘         └──────────────┘
```

- **前端**：只负责显示和收集用户输入，不保存任何“真正的数据”。
- **后端**：一个一直在运行的 Java 程序（一个进程），监听一个端口（比如 8080），
  收到请求 → 判断你是谁、有没有权限 → 读写数据库 → 把结果用 JSON 返回。
- **数据库**：真正存数据的地方。程序关掉、电脑重启，数据还在（存在硬盘的文件里）。

现在前端的数据都存在浏览器的 localStorage 里，这就是“假后端”。
我们要做的，就是把下面这几个“假接口”一个个换成真的：

| 前端现在的假接口 | 文件 | 换成 |
| --- | --- | --- |
| 假登录 `DEMO_ACCOUNTS` | `src/auth/AuthProvider.tsx` | `/api/auth/*` |
| `employeeApi` | `src/data/employees.ts` | `/api/employees` |
| `requestApi` | `src/data/requests.ts` | `/api/requests` |
| `scheduleApi`（班表查询 / 提交 / 删除） | `src/data/scheduleStore.ts` | `/api/schedules` |

---

## 1. 技术选择

| 部分 | 用什么 | 为什么 |
| --- | --- | --- |
| 语言 | Java 21 | 日本企业后端最常见 |
| 框架 | Spring Boot 3 | Java 后端的事实标准，招聘要求里最常见 |
| 数据库 | MySQL 8（用 Docker 启动） | 最常见的关系型数据库；Docker 省去安装麻烦 |
| 读写数据库 | Spring Data JPA | 用 Java 类代表表，少写 SQL，适合入门 |
| 登录 | Spring Security + JWT | 登录后发一个“通行证”（token），之后每次请求带上它 |
| 工具 | IntelliJ IDEA、Postman（或 curl） | 写代码、测试接口 |

**自动排班的算法留在前端**：前端算好班表，再把结果提交给后端保存。
后端只负责“存”和“检查权限”，这样第一版后端会简单很多。

---

## 2. 数据库表（5 张）

### employees（员工）

店里有这个人：排班要用的信息。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | BIGINT 主键，自增 | 员工编号 |
| name | VARCHAR(40) | 姓名 |
| phone | VARCHAR(20) | 电话。在职员工之间不能重复（Service 里检查，不加唯一约束，因为有软删除） |
| department | enum | `Kitchen` / `Hall` |
| position | enum | `Chef` / `Cook` / `Dishwasher` / `Server` / `Host` / `Manager` |
| employment | enum | `fullTime` / `partTime` |
| status | enum | `active` / `onLeave` |
| deleted | BIT | 删除时不真删，只标记（以前的班表还要用到这个人） |
| created_at / updated_at | DATETIME(6) | 创建、修改时间 |

### accounts（登录账号）

这个人能登录系统：和员工分开放，一个员工最多一个账号（一对一）。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | BIGINT 主键，自增 | 账号编号（和员工编号是两套） |
| email | VARCHAR(100)，唯一 | 登录用的邮箱，统一存小写 |
| password_hash | VARCHAR(100) | 密码经过 BCrypt 算出的哈希（绝对不存密码原文） |
| role | enum | `manager` / `staff`，决定权限 |
| password_temporary | BIT | 是不是店长给的临时密码（是 → 登录后提醒修改，不强制） |
| employee_id | BIGINT，唯一，外键 → employees.id | 属于哪个员工 |
| created_at / updated_at | DATETIME(6) | 创建、修改时间 |

### schedules（一个月一份班表）

| 字段 | 说明 |
| --- | --- |
| id | 主键，直接用 `"2026-12"`（一个月只有一份，年月本身就唯一） |
| year / month | 年、月（数字） |
| name | `"2026年12月 班表"` |
| note | 月备注（最多 200 字） |
| kitchen_per_day / hall_per_day | 每天几个正社员（新建时店长设的） |
| version | 乐观锁版本号（两个人同时提交同一个月时，后提交的会失败，不会悄悄覆盖） |
| created_at / updated_at | 创建、最后提交时间 |

没有 status 列：草稿只存在浏览器里，数据库里的一定是「已提交」。

### schedule_assignments（班表里“谁、哪天、哪一组、上什么班”）

前端的 `days[]` 是嵌套结构，存数据库要“拍平”成一行一条：

| 字段 | 说明 |
| --- | --- |
| id | 主键（自增） |
| schedule_id | 属于哪份班表（外键 → schedules.id） |
| work_date | `2026-12-05` |
| slot | 放在哪个格子：`kitchen`（厨房正社员）/ `hall`（服务员正社员）/ `partTime`（兼职） |
| shift | `day` / `evening` |
| employee_id | 谁（外键 → employees.id） |

例：Tom Lee（厨房正社员）12 月 5 日上全天 → 两行（kitchen + day 一行、kitchen + evening 一行）。
slot 要单独存：前端是按格子放人的，取出来组装时要知道放回哪个格子（兼职也不是一个部门）。
索引：(employee_id, work_date)，方便以后查「某人这个月上了哪几天」。

### staff_requests（员工申请）

| 字段 | 说明 |
| --- | --- |
| id | 主键 |
| employee_id | 谁提交的 |
| type | `leave` / `swap` / `other` |
| start_date / end_date | 日期 |
| note | 备注 |
| status | `pending` / `done` |
| created_at | 提交时间 |

---

## 3. 接口清单（共 15 个）

权限说明：**公开** = 不用登录；**登录** = 店长、员工都可以；**店长** = 只有店长。

### 3.1 登录（2 个）

| # | 方法 | 地址 | 权限 | 做什么 |
| --- | --- | --- | --- | --- |
| 1 | POST | `/api/auth/login` | 公开 | 邮箱 + 密码登录，返回 token 和用户信息 |
| 2 | GET | `/api/auth/me` | 登录 | 用 token 取“我是谁”（刷新页面后恢复登录状态） |

```jsonc
// POST /api/auth/login  请求
{ "email": "manager@demo.com", "password": "demo1234" }
// 响应
{ "token": "eyJhbGciOi...", "user": { "id": 8, "name": "Sophia Liu", "email": "manager@demo.com", "role": "manager" } }
```

退出登录不需要接口：前端把 token 删掉就行。

### 3.2 员工（5 个）

| # | 方法 | 地址 | 权限 | 做什么 |
| --- | --- | --- | --- | --- |
| 3 | GET | `/api/employees` | 登录 | 员工列表（排班页、首页也要用） |
| 4 | GET | `/api/employees/me` | 登录 | 我的信息（员工端「我的信息」页） |
| 5 | POST | `/api/employees` | 店长 | 添加员工 |
| 6 | PUT | `/api/employees/{id}` | 店长 | 修改员工 |
| 7 | DELETE | `/api/employees/{id}` | 店长 | 删除员工（标记 deleted） |

后端要再检查一遍的规则（前端检查过也要查，因为别人可以绕过前端直接发请求）：
姓名、电话必填；电话不能重复；厨房和店长必须是正社员；职位要和部门对得上。

```jsonc
// POST /api/employees  请求（和前端 EmployeeInput 一样）
{ "name": "Ken Sato", "phone": "090-1234-5678", "department": "Hall",
  "position": "Server", "employment": "partTime", "status": "active" }
// 响应：带上后端分配的 id
{ "id": 25, "name": "Ken Sato", ... }
```

### 3.3 班表（3 个）

| # | 方法 | 地址 | 权限 | 做什么 |
| --- | --- | --- | --- | --- |
| 8 | GET | `/api/schedules?from=2026-11&to=2027-01` | 登录 | 取这几个月已提交的班表（没提交过的月份不在结果里，不会 404） |
| 9 | PUT | `/api/schedules/{monthKey}` | 店长 | 提交班表（没有就新建，有就整份覆盖） |
| 10 | DELETE | `/api/schedules/{monthKey}` | 店长 | 删除这个月的班表 |

请求 / 响应的格式就是前端现在的 `MonthSchedule`（一个月一个对象，里面有 `days[]`）。
后端收到后先检查（天数和日期、员工存在且未删除、格子和员工类型对得上、同一个班不重复），
再拍平存进 schedule_assignments；取的时候再组装回去。
「每人每周最多 4 天」只是自动排班的规则，店长手动调整可以超过，所以后端不拦。

草稿还是存在浏览器里，只有点「提交」才调接口 9。

### 3.4 员工申请（5 个）

| # | 方法 | 地址 | 权限 | 做什么 |
| --- | --- | --- | --- | --- |
| 11 | GET | `/api/requests/mine` | 登录 | 员工看自己的申请（「我是谁」从 token 里取，所以不用 `?employeeId=`，改不了别人的） |
| 12 | GET | `/api/requests` | 店长 | 店长看全部申请 |
| 13 | POST | `/api/requests` | 登录 | 员工提交申请（employeeId 由后端从 token 里取，不信前端传的） |
| 14 | PATCH | `/api/requests/{id}/status` | 店长 | 改状态：`{ "status": "done" }` |
| 15 | DELETE | `/api/requests/{id}` | 登录 | 撤回：只能撤回**自己的**（否则 403）、**还没处理的**（否则 409） |

实现：`backend/.../request/` 包（StaffRequest、StaffRequestRepository、DTO、StaffRequestService、StaffRequestController、RequestSeeder）。

---

## 4. 写的顺序（明天从第 1 步开始）

每一步都能单独跑起来、单独测试，不会一下子写一大堆不知道哪里错。

1. **准备环境**：安装 JDK 21、IntelliJ、Docker；用 Docker 启动 MySQL。
2. **第一个 Spring Boot 程序**：写一个 `GET /api/hello`，浏览器打开能看到返回的文字。
   先搞懂“程序启动 → 监听端口 → 收到请求 → 返回结果”这一整圈。
3. **员工的增删改查（先不加登录）**：接口 3、5、6、7。
   学会：实体类 ↔ 表、Repository、Service、Controller 三层分工、JSON 怎么变成 Java 对象。
4. **前端接上员工接口**：把 `employeeApi` 里面换成 `fetch`，体验前后端连通。
5. **登录和权限**：接口 1、2，密码加密，JWT，然后给接口 5、6、7 加上“只有店长”。
6. **员工申请**：接口 4、11 ~ 14。
7. **班表**：接口 8 ~ 10（数据结构最复杂，放最后）。
8. 以后：部署到服务器、写 README。

---

## 5. 统一的约定

- 地址都以 `/api` 开头，名词用复数（`/employees`、`/requests`）。
- 用 HTTP 方法表示动作：GET 查、POST 新增、PUT 整个替换、PATCH 改一部分、DELETE 删。
- 出错时统一返回：`{ "message": "电话已经被使用" }`，前端直接显示这个 message。
- 常见状态码（不用背，用到时查）：200 成功、201 创建成功、204 成功但没有内容、
  400 数据不对、401 没登录、403 没权限、404 找不到、409 冲突（比如电话重复）。
