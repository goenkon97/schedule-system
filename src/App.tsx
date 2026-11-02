import Dashboard from './pages/Dashboard/Dashboard';
import Employee from './pages/Employee/Employee';
import Schedule from './pages/Schedule/Schedule';
import Settings from './pages/Settings/Settings';
import Login from './pages/Login/Login';

import { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';

// 员工申请：侧边栏「员工」后面显示店长还没处理的申请数量
import { pendingRequestCount, subscribeRequests } from './data/requests';

// 登录状态
import { useAuth } from './auth/AuthContext';

// 多语言
import { useLanguage } from './i18n/LanguageContext';
import LanguageSwitcher from './components/LanguageSwitcher/LanguageSwitcher';

import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

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

  const isManager = user?.role === 'manager';

  // 未处理申请数：一开始读一次，之后申请一有变化（提交 / 撤回 / 标记）就重新读
  const [pendingCount, setPendingCount] = useState(pendingRequestCount);
  useEffect(() => subscribeRequests(() => setPendingCount(pendingRequestCount())), []);

  // =========================
  // 侧边栏菜单
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
    },
  ];

  // =========================
  // Drawer 内容
  // =========================
  const DrawerList = (
    <Box sx={{ width: 250 }} role="presentation">

      <List>

        {arrPages.map((page) => {

          const Icon = page.icon;

          return (
            <ListItem
              key={page.path}
              disablePadding
            >

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
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#ffffff', color: '#1d4ed8', fontSize: 14, fontWeight: 700 }}>
                  {user.name.charAt(0)}
                </Avatar>
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

            <Route
              path="/settings"
              element={<Settings />}
            />

          </Routes>

        </div>

      </div>

    </div>

  );
}

export default App;