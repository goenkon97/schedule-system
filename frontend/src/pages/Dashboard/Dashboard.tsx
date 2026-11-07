// src/pages/Dashboard/Dashboard.tsx
// =====================================================
// 首页（仪表盘）
//
// 页面分三块：
// 1. 顶部四张统计卡片：员工总数、今日排班、今日请假、加班时长
// 2. 左下「今日排班概览」：今天谁上班，白班 / 晚班各上不上
// 3. 右下「通知」：店长看员工发来的申请，员工看自己申请的状态（NoticePanel.tsx）
//
// 数据来源：
// - 今日排班：读排班页保存的同一份班表（scheduleStore），所以两边一定对得上
// - 员工：data/employees.ts；申请：data/requests.ts
// - 「较上月 +2」「加班 8 小时」现在还是写死的演示数字，以后由后端统计
// =====================================================

import { useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import Card from "../../components/Card/Card";
import { useNavigate } from "react-router-dom";
import NoticePanel from "./NoticePanel";
import { pendingRequestCount, subscribeRequests } from "../../data/requests";
import "./Dashboard.css";
import { useLanguage } from "../../i18n/LanguageContext";

// ---------- 业务数据：员工、班次定义、排班记录（都从 src/data 读，页面里不再写死）----------
import { employees } from "../../data/employees";
import { shiftDefinitions, shiftTimeLabel, departments } from "../../data/shifts";
import { toDateKey } from "../../data/mockSchedule";
// 班表：直接读排班页保存的同一份数据（以后两边一起换成接口）
import { monthFromToday, monthKey, scheduleApi, type MonthSchedule } from "../../data/scheduleStore";
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
  const navigate = useNavigate();

  // ---------------------------------------------------
  // 今天的排班：从后端拿「这个月已提交的班表」，取出今天那一天
  //   GET /api/schedules?from=2026-11&to=2026-11（只要这一个月）
  // ---------------------------------------------------
  const today = new Date();
  const todayKey = toDateKey(today);
  const { year, month } = monthFromToday(0);

  // 还没拿到（或者这个月还没提交班表）时是 undefined，下面的统计都会显示 0
  const [monthSchedule, setMonthSchedule] = useState<MonthSchedule | undefined>(undefined);
  useEffect(() => {
    const key = monthKey(year, month);
    scheduleApi
      .list(key, key)
      .then((list) => setMonthSchedule(list[0]))
      // 拿失败了（后端临时断开等）：首页照样显示，只是今日排班为空
      .catch(() => setMonthSchedule(undefined));
  }, [year, month]);
  const todayEntry = monthSchedule?.days.find((d) => d.date === todayKey);

  // 今天每个人上哪几个班：员工 id → 班次集合（白班 / 晚班）
  // （用 Set 存班次：同一个人同一个班不会重复；以后用 .has("day") 判断他上不上白班）
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
  }, [todayEntry]);   // 只有今天的班表变了才重新算

  // ---------------------------------------------------
  // 本月总工时：把这个月班表里每个人每个班的小时数加起来
  //   白班 10:00 - 15:00 = 5 小时，晚班 17:00 - 23:00 = 6 小时（来自 data/shifts.ts 的 shiftDefinitions）
  //   正社员：kitchen / hall 里每个 id 算一次；兼职：partTime 里每一条算一次
  // 同时记下「这个月有班的人」（Set 去重），用来算平均每人多少小时
  // ---------------------------------------------------
  const monthStats = useMemo(() => {
    // "10:00" → 10（只取小时；我们的班次都是整点开始、整点结束）
    const hourOf = (time: string) => Number(time.split(":")[0]);
    // 每种班次几小时：{ day: 5, evening: 6 }
    const shiftHours = Object.fromEntries(
      shiftDefinitions.map((s) => [s.type, hourOf(s.end) - hourOf(s.start)]),
    ) as Record<ShiftType, number>;

    let total = 0;
    const people = new Set<number>();
    for (const day of monthSchedule?.days ?? []) {
      for (const shift of ["day", "evening"] as ShiftType[]) {
        const ids = [...day.kitchen[shift], ...day.hall[shift]];
        ids.forEach((id) => people.add(id));
        total += ids.length * shiftHours[shift];
      }
      day.partTime.forEach((p) => {
        people.add(p.employeeId);
        total += shiftHours[p.shift];
      });
    }
    return {
      total,
      // 平均：总工时 ÷ 人数，四舍五入到整数；没人上班时是 0（避免除以 0）
      average: people.size > 0 ? Math.round(total / people.size) : 0,
    };
  }, [monthSchedule]);

  // 两个部门各有多少人（员工总数卡片的说明文字）
  const kitchenCount = employees.filter((e) => e.department === "Kitchen").length;
  const hallCount = employees.length - kitchenCount;

  // 休假中的员工
  const leaveToday = employees.filter((e) => e.status === "onLeave").length;

  // ---------------------------------------------------
  // 顶部四张统计卡片：数字都从数据算出来
  // ---------------------------------------------------
  const totalEmployees = employees.length;
  const scheduledToday = shiftsByEmployee.size;   // 今天上班的人数（每人只算一次）

  // 未处理申请数：数字来自后端（店长登录后 App.tsx 会去拿），拿到或变化时这里跟着更新
  const [pendingRequests, setPendingRequests] = useState(pendingRequestCount);
  useEffect(() => subscribeRequests(() => setPendingRequests(pendingRequestCount())), []);

  // 每张卡片是一个对象，下面用 map 生成 <Card />（以后加卡片只要在数组里加一项）
  const cards: CardItem[] = [
    {
      id: 1,
      title: t.dashboard.totalEmployees,
      value: totalEmployees,
      icon: GroupsIcon,
      tone: 'blue',
      // 以前这里是写死的「+2 较上月」，现在换成真实的部门人数
      description: t.dashboard.deptBreakdown(kitchenCount, hallCount),
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
      // 未处理的员工申请数（真实数据，来自 data/requests.ts）
      description: t.dashboard.pendingRequests(pendingRequests),
    },
    {
      id: 4,
      // 以前这里是写死的「加班 8 小时」，现在从本月班表算出来
      title: t.dashboard.monthHours,
      value: monthStats.total,
      unit: t.dashboard.hours,
      icon: AccessTimeIcon,
      tone: 'purple',
      // 这个月还没生成班表：总工时是 0，说明文字提示一下
      description: monthSchedule ? t.dashboard.avgPerPerson(monthStats.average) : t.dashboard.noScheduleThisMonth,
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
    // 最后变成 { 员工, 他今天的班次 } 这种形状，渲染表格时直接用
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
      {/* 下半部分：左边今日排班，右边通知（窄屏时上下排） */}
      <div className="dashMain">
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

        {/* 点击跳到排班页 */}
        <div className="scheduleFooter" onClick={() => navigate("/schedule")}>
          {t.dashboard.viewFull}
        </div>

      </div>

      <NoticePanel />
      </div>

    </div>
  )

}

export default Dashboard;
