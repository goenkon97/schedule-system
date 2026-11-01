import Dashboard from './pages/Dashboard/Dashboard';
import Employee from './pages/Employee/Employee';
import Schedule from './pages/Schedule/Schedule';
import Settings from './pages/Settings/Settings';

import { Routes, Route, Link, useLocation } from 'react-router-dom';

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

function App() {

  // 取出当前语言的翻译字典 t
  const { t } = useLanguage();

  // 当前网址路径（例如 "/employee"），用来高亮左侧菜单里对应的那一项
  const { pathname } = useLocation();

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
      name: t.nav.employee,
      path: '/employee',
      icon: BadgeIcon,
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
                  mx: 1,
                  my: 0.5,
                  borderRadius: '8px',

                  '&.Mui-selected, &.Mui-selected:hover': {
                    backgroundColor: '#2563EB',
                  },

                  '&:hover': {
                    backgroundColor: '#1F2937',
                  },

                  '&:active': {
                    backgroundColor: '#111827',
                  },
                }}
              >

                <ListItemIcon>

                  <Icon
                    sx={{
                      color: '#E5E7EB',
                    }}
                  />

                </ListItemIcon>

                <ListItemText
                  primary={page.name}
                  sx={{
                    color: '#E5E7EB',
                  }}
                />

              </ListItemButton>

            </ListItem>
          );

        })}

      </List>

      <Divider />

    </Box>
  );

  return (

    <div>

      {/* =========================
          顶部导航栏
      ========================= */}
      <Box sx={{ flexGrow: 1 }}>

        <AppBar position="static">

          <Toolbar>

            <Typography
              variant="h6"
              component="div"
              sx={{ flexGrow: 1 }}
            >
              {t.appTitle}
            </Typography>

            <LanguageSwitcher />

            <Button color="inherit">
              {t.login}
            </Button>

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