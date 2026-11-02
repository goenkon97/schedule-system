import { useMemo } from "react";
import type { ComponentProps } from "react";
import Card from "../../components/Card/Card";
import "./Dashboard.css";
import { useLanguage } from "../../i18n/LanguageContext";

// ---------- 业务数据：员工、班次定义、排班记录（都从 src/data 读，页面里不再写死）----------
import { employees } from "../../data/employees";
import { shiftDefinitions, shiftTimeLabel, departments } from "../../data/shifts";
import { toDateKey } from "../../data/mockSchedule";
// 班表：直接读排班页保存的同一份数据（以后两边一起换成接口）
import { loadSchedules, monthFromToday, monthKey } from "../../data/scheduleStore";
import type { ShiftType } from "../../i18n/translations";

// ---------- MUI 表格组件 ----------
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Avatar from '@mui/material/Avatar';
import { tableSx, avatarSx } from '../../components/DataTable/tableStyles';

import GroupsIcon from '@mui/icons-material/Groups';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// 卡片数据的类型 = Card 组件的 props 再加一个 id
// ComponentProps<typeof Card> 会自动取出 Card 组件声明的 props 类型
type CardItem = ComponentProps<typeof Card> & { id: number };

function Dashboard() {
  // 当前语言的翻译
  const { t } = useLanguage();

  // ---------------------------------------------------
  // 今天的排班：从排班页保存的「这个月的班表」里，取出今天那一天
  // 以后换成接口：GET /api/schedules/2026-11 → 取今天
  // ---------------------------------------------------
  const today = new Date();
  const todayKey = toDateKey(today);
  const { year, month } = monthFromToday(0);

  // useMemo：只在第一次渲染时读一次
  const monthSchedule = useMemo(() => loadSchedules()[monthKey(year, month)], [year, month]);
  const todayEntry = monthSchedule?.days.find((d) => d.date === todayKey);

  // 今天每个人上哪几个班：员工 id → 班次集合（白班 / 晚班）
  const shiftsByEmployee = useMemo(() => {
    const map = new Map<number, Set<ShiftType>>();
    const add = (id: number, shift: ShiftType) => {
      if (!map.has(id)) map.set(id, new Set());
      map.get(id)!.add(shift);
    };
    if (todayEntry) {
      for (const shift of ["day", "evening"] as ShiftType[]) {
        todayEntry.kitchen[shift].forEach((id) => add(id, shift));   // 厨房正社员
        todayEntry.hall[shift].forEach((id) => add(id, shift));      // 服务员正社员
      }
      todayEntry.partTime.forEach((p) => add(p.employeeId, p.shift)); // 兼职
    }
    return map;
  }, [todayEntry]);

  // 休假中的员工
  const leaveToday = employees.filter((e) => e.status === "onLeave").length;

  // ---------------------------------------------------
  // 顶部四张统计卡片：数字都从数据算出来
  // ---------------------------------------------------
  const totalEmployees = employees.length;
  const scheduledToday = shiftsByEmployee.size;   // 今天上班的人数（每人只算一次）

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
      // 出勤率 = 今日排班人数 / 员工总数
      description: t.dashboard.ofAllStaff(Math.round((scheduledToday / totalEmployees) * 100)),
    },
    {
      id: 3,
      title: t.dashboard.onLeaveToday,
      value: leaveToday,
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

  // ---------------------------------------------------
  // 今日排班表的每一行 = 今天有班的一个员工
  // 排序：厨房 → 服务员；同一部门里正社员在前、兼职在后
  // ---------------------------------------------------
  const rows = employees
    .filter((e) => shiftsByEmployee.has(e.id))
    .sort((a, b) =>
      departments.indexOf(a.department) - departments.indexOf(b.department) ||
      (a.employment === b.employment ? 0 : a.employment === "fullTime" ? -1 : 1))
    .map((e) => ({ employee: e, shifts: shiftsByEmployee.get(e.id)! }));

  return (
    <div className="Dashboard">
      <h1>{t.dashboard.title}</h1>
      <h5>{t.dashboard.welcome}</h5>
      <div className="cardItems">
        {/* ...rest：把除 id 以外的字段全部当作 props 传给 Card */}
        {cards.map(({ id, ...rest }) => (
          <Card key={id} {...rest} />
        ))}
      </div>
      <div className="scheduleOverview">

        <div className="sectionHeader">
          <h2>{t.dashboard.todayOverview}</h2>
        </div>

        {/* ========== MUI 表格 ========== */}
        <TableContainer>
          <Table
            sx={[
              tableSx,
              {
                tableLayout: "fixed",   // 列宽固定，两个班次列平均分
                minWidth: 560,
                "& .MuiTableCell-root": { textAlign: "center" },
                "& .MuiTableCell-root:first-of-type": { width: 240, textAlign: "left" },
              },
            ]}
          >

            <TableHead>
              <TableRow>
                <TableCell>{t.dashboard.employee}</TableCell>

                {/* 班次列由 shiftDefinitions 生成：白班 10:00、晚班 17:00 */}
                {shiftDefinitions.map((s) => (
                  <TableCell key={s.type}>
                    {s.start}
                    <span className="shiftColumnName">{t.shifts[s.type]}</span>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map(({ employee, shifts }) => (
                <TableRow key={employee.id}>

                  {/* 员工：MUI Avatar + 名字 + 部门 */}
                  <TableCell>
                    <div className="employeeInfo">
                      <Avatar sx={avatarSx}>{employee.name.charAt(0)}</Avatar>
                      <div>
                        <strong>{employee.name}</strong>
                        <span>{t.departments[employee.department]} · {t.employee.employment[employee.employment]}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* 每个班次一格：这个人上的是这个班 → 显示时间；否则显示「休息」 */}
                  {shiftDefinitions.map((s) => (
                    <TableCell key={s.type}>
                      {shifts.has(s.type) ? (
                        <div className={`shift ${s.type}`}>{shiftTimeLabel(s)}</div>
                      ) : (
                        <div className="shift off">{t.off}</div>
                      )}
                    </TableCell>
                  ))}

                </TableRow>
              ))}

              {/* 今天没人排班时的空状态 */}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={shiftDefinitions.length + 1} sx={{ py: 5, color: "#9ca3af !important" }}>
                    {/* 这个月还没有班表 / 今天没人上班 */}
                    {monthSchedule ? t.dashboard.noShiftToday : t.schedule.noSchedule}
                  </TableCell>
                </TableRow>
              )}
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
