import Card from "../../components/Card/Card";
import type { ComponentProps } from "react";

// 卡片数据的类型 = Card 组件的 props 再加一个 id
// ComponentProps<typeof Card> 会自动取出 Card 组件声明的 props 类型
type CardItem = ComponentProps<typeof Card> & { id: number };
import "./Dashboard.css";
import { useLanguage } from "../../i18n/LanguageContext";
import type { Department, ShiftType } from "../../i18n/translations";

// ---------- MUI 表格组件 ----------
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Avatar from '@mui/material/Avatar';
import { tableSx, avatarSx } from '../../components/DataTable/tableStyles';

// 表头的四个班次列：type 用来取翻译和颜色 class，start 是开始时间
const shiftColumns: { type: ShiftType; start: string }[] = [
  { type: 'morning', start: '09:00' },
  { type: 'afternoon', start: '13:00' },
  { type: 'evening', start: '17:00' },
  { type: 'night', start: '21:00' },
];

import GroupsIcon from '@mui/icons-material/Groups';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

function Dashboard() {
  // 当前语言的翻译
  const { t } = useLanguage();

  // ---------------------------------------------------
  // 顶部四张统计卡片（以后由后端统计接口返回数字）
  // ---------------------------------------------------
  const totalEmployees = 24;
  const scheduledToday = 18;

  const cards: CardItem[] = [
    {
      id: 1,
      title: t.dashboard.totalEmployees,
      value: totalEmployees,
      icon: GroupsIcon,
      tone: 'blue',
      trend: { label: '+2', direction: 'up', good: true },
      description: t.dashboard.vsLastMonth,
    },
    {
      id: 2,
      title: t.dashboard.scheduledToday,
      value: scheduledToday,
      icon: HowToRegIcon,
      tone: 'green',
      // 出勤率 = 今日排班人数 / 员工总数，算出来而不是写死
      description: t.dashboard.ofAllStaff(Math.round((scheduledToday / totalEmployees) * 100)),
    },
    {
      id: 3,
      title: t.dashboard.onLeaveToday,
      value: 3,
      icon: EventAvailableIcon,
      tone: 'amber',
      description: t.dashboard.pendingRequests(2),
    },
    {
      id: 4,
      title: t.dashboard.totalOvertime,
      value: 8,
      unit: t.dashboard.hours,
      icon: AccessTimeIcon,
      tone: 'purple',
      // 加班变多是“坏事”，所以 good: false → 红色
      trend: { label: '+1.5', direction: 'up', good: false },
      description: t.dashboard.thisWeek,
    },
  ];
  const schedule = [
    {
      id: 1,
      name: 'Tom Lee',
      department: 'Kitchen' as Department,
      morning: '09:00-13:00',
      afternoon: '13:00-17:00',
      evening: '17:00-21:00',
      night: 'OFF',
    },
    {
      id: 2,
      name: 'Alice Chen',
      department: 'Hall' as Department,
      morning: '09:00-13:00',
      afternoon: '13:00-17:00',
      evening: '17:00-21:00',
      night: 'OFF',
    },
    {
      id: 3,
      name: 'Jack Wang',
      department: 'Kitchen' as Department,
      morning: 'OFF',
      afternoon: '09:00-13:00',
      evening: '13:00-17:00',
      night: '21:00-01:00',
    },
    {
      id: 4,
      name: 'Emily Zhang',
      department: 'Service' as Department,
      morning: '09:00-13:00',
      afternoon: 'OFF',
      evening: '17:00-21:00',
      night: '21:00-01:00',
    },
    {
      id: 5,
      name: 'David Kim',
      department: 'Service' as Department,
      morning: 'OFF',
      afternoon: 'OFF',
      evening: 'OFF',
      night: 'OFF',
    },
  ];
  // 班次时间：数据里是 'OFF' 的显示成翻译后的“休息”
  const showShift = (value: string) => (value === 'OFF' ? t.off : value);

  return (
    <div className="Dashboard">
      <h1>{t.dashboard.title}</h1>
      <h5>{t.dashboard.welcome}</h5>
      <div className="cardItems">
        {/* ...rest：把除 id 以外的字段全部当作 props 传给 Card */}
        {cards.map(({ id, ...rest }) => (
          <Card key={id} {...rest} />
        ))}
        {/* <Card
          title="Employees"
          value={24}
          description="Total employees"
        />
        <Card
          title="Employees"
          value={24}
          description="Total employees"
        />
        <Card
          title="Employees"
          value={24}
          description="Total employees"
        />
        <Card
          title="Employees"
          value={24}
          description="Total employees"
        /> */}
      </div>
      <div className="scheduleOverview">

        <div className="sectionHeader">
          <h2>{t.dashboard.todayOverview}</h2>
        </div>

        {/* ========== MUI 表格 ========== */}
        <TableContainer>
          {/* tableSx：共用表格样式；再叠加这张表自己的设置 */}
          <Table
            sx={[
              tableSx,
              {
                tableLayout: "fixed",   // 列宽固定，四个班次列平均分
                minWidth: 720,
                "& .MuiTableCell-root": { textAlign: "center" },
                "& .MuiTableCell-root:first-of-type": { width: 220, textAlign: "left" },
              },
            ]}
          >

            <TableHead>
              <TableRow>
                <TableCell>{t.dashboard.employee}</TableCell>

                {/* 班次列由 shiftColumns 数组生成，不再一列一列手写 */}
                {shiftColumns.map((col) => (
                  <TableCell key={col.type}>
                    {col.start}
                    <span className="shiftColumnName">{t.shifts[col.type]}</span>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {schedule.map((item) => (
                <TableRow key={item.id}>

                  {/* 员工：MUI Avatar + 名字 + 部门 */}
                  <TableCell>
                    <div className="employeeInfo">
                      <Avatar sx={avatarSx}>{item.name.charAt(0)}</Avatar>
                      <div>
                        <strong>{item.name}</strong>
                        <span>{t.departments[item.department]}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* 四个班次：item[col.type] 取出 item.morning / item.afternoon … */}
                  {shiftColumns.map((col) => (
                    <TableCell key={col.type}>
                      <div className={`shift ${col.type}`}>
                        {showShift(item[col.type])}
                      </div>
                    </TableCell>
                  ))}

                </TableRow>
              ))}
            </TableBody>

          </Table>
        </TableContainer>

        <div className="scheduleFooter">
          {t.dashboard.viewFull}
        </div>

      </div>

    </div>
  )

}

export default Dashboard;