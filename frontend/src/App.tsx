// src/App.tsx
// =====================================================
// 根组件：整个系统的「外壳」
//
// 页面结构：
// ┌──────────────────────────────────────────────┐
// │ 顶部栏：Logo · 系统名 · 语言切换 · 用户 · 退出 │
// ├──────────┬───────────────────────────────────┤
// │ 左侧菜单  │ 右侧内容：根据网址显示不同页面      │
// │ 仪表盘    │   /          → Dashboard 首页       │
// │ 排班      │   /schedule  → Schedule 排班        │
// │ 员工      │   /employee  → Employee 员工        │
// │ 设置      │   /settings  → Settings 设置        │
// └──────────┴───────────────────────────────────┘
// 登录页（/login）例外：全屏显示，不要顶部栏和菜单。
//
// 权限在这里处理了两件事：
// - 菜单：员工看不到「设置」，「员工」变成「我的信息」
// - 路由：员工直接输入 /settings 也会被送回首页
// =====================================================

// ---------- 各个页面组件 ----------
import Dashboard from './pages/Dashboard/Dashboard';
import Employee from './pages/Employee/Employee';
import Schedule from './pages/Schedule/Schedule';
import Settings from './pages/Settings/Settings';
import Login from './pages/Login/Login';

// useState：组件自己的「记忆」（值变了页面会重新渲染）
// useEffect：组件显示出来之后要做的事（这里用来订阅申请数量的变化）
import { useEffect, useState } from 'react';

// React Router：
// Routes / Route  → 网址和页面的对应表
// Link            → 不刷新网页的链接（点了只切换组件）
// Navigate        → 渲染到它时自动跳转（用来把员工送回首页）
// useLocation     → 读当前网址（高亮菜单用）
// useNavigate     → 在代码里跳转页面（点「登录」按钮时用）
import { Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

// 员工申请：侧边栏「员工」后面显示店长还没处理的申请数量
import { pendingRequestCount, subscribeRequests } from './data/requests';

// loadEmployees：从后端拿全部员工，放进全系统共用的 employees 数组（data/employees.ts）
import { loadEmployees } from './data/employees';

// 登录状态
import { useAuth } from './auth/AuthContext';

// 多语言
import { useLanguage } from './i18n/LanguageContext';
import LanguageSwitcher from './components/LanguageSwitcher/LanguageSwitcher';

// ---------- MUI 组件（现成的 UI 组件库）----------
// AppBar：顶部栏；Box：万能的 div（可以直接用 sx 写样式）
// Toolbar：顶部栏里面那一行；Typography：文字；Button：按钮
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

// Drawer：侧边栏容器；List / ListItem / ListItemButton：菜单列表和每一项
// ListItemIcon / ListItemText：菜单项里的图标和文字；Divider：分隔线
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

// ---------- 图标（每个图标都是一个 React 组件）----------
import HomeIcon from '@mui/icons-material/Home';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BadgeIcon from '@mui/icons-material/Badge';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import Avatar from '@mui/material/Avatar';

function App() {

  // 取出当前语言的翻译字典 t
  const { t } = useLanguage();

  // 当前网址路径（例如 "/employee"），用来高亮左侧菜单里对应的那一项
  const { pathname } = useLocation();

  // 当前登录的用户（没登录是 null）、退出登录的函数；navigate 用来跳转页面
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // 是不是店长（user?.role：user 为 null 时不报错，直接得到 undefined）
  const isManager = user?.role === 'manager';

  // 未处理申请数：一开始读一次，之后申请一有变化（提交 / 撤回 / 标记）就重新读
  // useState(pendingRequestCount)：传的是函数本身（没有括号），React 只在第一次渲染时调用它
  const [pendingCount, setPendingCount] = useState(pendingRequestCount);
  // subscribeRequests 返回「取消订阅」的函数；useEffect 返回它，
  // 组件消失时 React 会自动调用，避免内存里留着没用的监听
  // 第二个参数 []：只在第一次显示时订阅一次
  useEffect(() => subscribeRequests(() => setPendingCount(pendingRequestCount())), []);

  // =========================
  // 启动时先从后端拿员工列表
  //
  // 排班页、首页等很多地方都「同步地」读员工数组（不等网络），
  // 所以必须先拿到数据，再显示这些页面。三种状态：
  //   'loading' → 正在请求，显示「正在连接后端…」
  //   'ready'   → 拿到了，正常显示页面
  //   'error'   → 失败了（后端没开、数据库没开……），显示原因和「重试」按钮
  // =========================
  const [employeesState, setEmployeesState] = useState<'loading' | 'ready' | 'error'>('loading');
  // 失败时显示的具体原因（来自 apiFetch 抛出的 ApiError.message）
  const [employeesError, setEmployeesError] = useState('');

  // 发请求的函数：只负责「请求 → 根据结果改状态」
  const requestEmployees = () => {
    loadEmployees()
      // 成功：数据已经在 employees 数组里了，只要把状态改成 ready，页面就会重新渲染
      .then(() => setEmployeesState('ready'))
      // 失败：记下原因，显示错误画面
      // err 的类型是 unknown（JS 里什么都能被 throw），先判断是不是 Error 再读 message
      .catch((err: unknown) => {
        setEmployeesError(err instanceof Error ? err.message : String(err));
        setEmployeesState('error');
      });
  };

  // 点「重试」：先切回「加载中」，再请求一次
  const retryEmployees = () => {
    setEmployeesState('loading');
    requestEmployees();
  };

  // 第一次显示 App 时请求一次（[] = 只执行一次）。
  // 这里不用先设 'loading'，因为 useState 的初始值就是 'loading'
  // （React 不建议在 effect 里同步地 setState，会多渲染一轮；.then / .catch 里的 setState 是等网络回来以后才执行，没问题）
  // 开发模式的 StrictMode 会故意执行两次，所以浏览器 Network 里看到两个请求是正常的
  useEffect(requestEmployees, []);

  // =========================
  // 侧边栏菜单
  // 用数组描述每一项（名字、网址、图标），下面用 map 循环生成，
  // 以后加一个页面只要在这里加一项
  // =========================
  const arrPages = [
    {
      name: t.nav.dashboard,
      path: '/',
      icon: HomeIcon,
    },
    {
      name: t.nav.schedule,
      path: '/schedule',
      icon: CalendarMonthIcon,
    },
    {
      // 店长：员工管理；员工：同一个网址，但显示的是「我的信息」
      name: isManager ? t.nav.employee : t.nav.myInfo,
      path: '/employee',
      icon: BadgeIcon,
      // 只有店长看到红色数字（有员工提交了申请还没处理）
      badge: isManager ? pendingCount : 0,
    },
    {
      name: t.nav.settings,
      path: '/settings',
      icon: SettingsIcon,
      managerOnly: true,   // 设置只有店长能看（员工没有修改设置的权限）
    },
  ].filter((page) => !('managerOnly' in page) || isManager);   // 员工：把店长专用的菜单去掉

  // =========================
  // Drawer 内容（侧边栏里的菜单列表）
  // 先存进一个变量，下面 return 里再放进 <Drawer>
  // =========================
  const DrawerList = (
    <Box sx={{ width: 250 }} role="presentation">

      <List>

        {/* 每一项菜单生成一个 ListItem；key 让 React 能分清每一项 */}
        {arrPages.map((page) => {

          // 组件名必须大写开头，JSX 里才能写成 <Icon />，所以先赋给大写变量
          const Icon = page.icon;

          return (
            <ListItem
              key={page.path}
              disablePadding
            >

              {/* component={Link}：让这个按钮表现成 React Router 的 Link，点了不刷新网页 */}
              <ListItemButton
                component={Link}
                to={page.path}
                // 当前路径等于这一项的 path → 选中状态（蓝色背景）
                selected={pathname === page.path}
                sx={{
                  mx: 1.5,
                  my: 0.5,
                  borderRadius: '10px',
                  color: '#94A3B8',                                   // 未选中：柔和的灰蓝色

                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.06)',        // 悬停：很淡的白色
                    color: '#E2E8F0',
                  },

                  // 选中：品牌蓝底 + 白字 + 一点蓝色光晕
                  '&.Mui-selected, &.Mui-selected:hover': {
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    boxShadow: '0 6px 16px -6px rgba(37,99,235,.8)',
                  },
                }}
              >

                {/* ListItemIcon 默认是灰色、最小宽度 56px；改成跟随文字颜色、更紧凑 */}
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>

                  {/* color: inherit → 图标跟着文字颜色变（选中时变白） */}
                  <Icon sx={{ color: 'inherit', fontSize: 21 }} />

                </ListItemIcon>

                <ListItemText
                  primary={page.name}
                  slotProps={{ primary: { sx: { fontSize: 14.5, fontWeight: 600 } } }}
                />

                {/* 红色数字：'badge' in page 判断这一项有没有 badge 字段 */}
                {'badge' in page && !!page.badge && (
                  <Box
                    component="span"
                    sx={{
                      minWidth: 20, height: 20, px: 0.75, borderRadius: 999,
                      bgcolor: '#DC2626', color: '#fff',
                      fontSize: 11.5, fontWeight: 700, lineHeight: '20px', textAlign: 'center',
                    }}
                  >
                    {page.badge}
                  </Box>
                )}

              </ListItemButton>

            </ListItem>
          );

        })}

      </List>

      <Divider />

    </Box>
  );

  // =========================
  // 登录页：全屏显示，不要顶部栏和左侧菜单
  // （放在所有 Hook 调用之后再 return，React 要求 Hook 每次渲染的调用顺序一样）
  // =========================
  if (pathname === '/login') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  // =========================
  // 员工数据还没拿到：先不显示页面，只显示「加载中」或「出错了」
  // （登录页不需要员工数据，所以这个判断放在登录页后面）
  // =========================
  if (employeesState !== 'ready') {
    return (
      // 全屏居中的一个小卡片（样式在 index.css 的 .serverGate）
      <div className="serverGate">
        {employeesState === 'loading' ? (
          <p>{t.server.loading}</p>
        ) : (
          <div className="confirmBox">
            <h3>{t.server.errorTitle}</h3>
            {/* 具体原因（比如「连不上后端服务器……」） */}
            <p>{employeesError}</p>
            <p>{t.server.errorHint}</p>
            <div className="confirmActions">
              <button className="confirmPrimary" onClick={retryEmployees}>{t.server.retry}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================
  // 其他页面：顶部栏 + 左侧菜单 + 右侧内容
  // =========================
  return (

    <div>

      {/* =========================
          顶部导航栏
      ========================= */}
      <Box sx={{ flexGrow: 1 }}>

        <AppBar position="static">

          <Toolbar>

            {/* Logo + 系统名：蓝色渐变的小方块里放一个日历图标 */}
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 34, height: 34, borderRadius: '10px', display: 'grid', placeItems: 'center',
                  background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                  boxShadow: '0 4px 12px -4px rgba(37,99,235,.7)',
                }}
              >
                <CalendarMonthIcon sx={{ fontSize: 20, color: '#fff' }} />
              </Box>
              <Typography variant="h6" component="div" sx={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>
                {t.appTitle}
              </Typography>
            </Box>

            <LanguageSwitcher />

            {/* 没登录：显示 LOGIN 按钮，点了去登录页；登录了：显示头像、名字、角色和退出按钮 */}
            {user ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {/* 头像：名字的第一个字母 */}
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#ffffff', color: '#1d4ed8', fontSize: 14, fontWeight: 700 }}>
                  {user.name.charAt(0)}
                </Avatar>
                {/* 名字 + 角色；display xs:none → 手机屏幕太窄时隐藏，sm 以上才显示 */}
                <Box sx={{ lineHeight: 1.2, display: { xs: 'none', sm: 'block' } }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{user.name}</Typography>
                  <Typography sx={{ fontSize: 11.5, opacity: 0.8 }}>{t.auth.roles[user.role]}</Typography>
                </Box>
                <Button color="inherit" size="small" startIcon={<LogoutIcon />} onClick={logout} sx={{ textTransform: 'none' }}>
                  {t.auth.logout}
                </Button>
              </Box>
            ) : (
              <Button color="inherit" onClick={() => navigate('/login')}>
                {t.login}
              </Button>
            )}

          </Toolbar>

        </AppBar>

      </Box>


      {/* =========================
          页面主体
      ========================= */}
      <div className="content">

        {/* =========================
            左侧 Sidebar
        ========================= */}
        <div className="drawer">

          <Drawer variant="permanent">

            {DrawerList}

          </Drawer>

        </div>


        {/* =========================
            右侧页面内容
        ========================= */}
        <div className="contentRight">

          {/* Routes：看当前网址，只渲染匹配的那一个 Route 的 element */}
          <Routes>

            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/employee"
              element={<Employee />}
            />

            <Route
              path="/schedule"
              element={<Schedule />}
            />

            {/* 设置：员工直接输入网址也进不来，会被送回首页 */}
            <Route
              path="/settings"
              element={isManager ? <Settings /> : <Navigate to="/" replace />}
            />

          </Routes>

        </div>

      </div>

    </div>

  );
}

export default App;