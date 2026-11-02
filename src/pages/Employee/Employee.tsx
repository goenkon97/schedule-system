// src/pages/Employee/Employee.tsx
// =====================================================
// 员工管理页面
//
// 功能：
// 1. 搜索（姓名 / 部门 / 职位 / 电话）
// 2. 分页（每页 6 人）
// 3. 删除（目前只删前端 state 里的数据，刷新后恢复）
// 4. 导出 CSV（导出当前搜索结果）
// 5. 添加 / 编辑：先占位，等后端一起做
//
// 表格部分使用 MUI 组件：
// TableContainer / Table / TableHead / TableBody / TableRow / TableCell
// 以及单元格里的 Avatar（头像）、Chip（状态标签）、IconButton（操作按钮）、
// 底部的 Pagination（分页）
// =====================================================

import { useMemo, useState } from "react";

// ---------- MUI 组件 ----------
import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Pagination from "@mui/material/Pagination";

// ---------- 图标 ----------
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";

import { useLanguage } from "../../i18n/LanguageContext";
import { employees as mockEmployees, type Employee as EmployeeData } from "../../data/employees";
import type { EmployeeStatus } from "../../i18n/translations";
import { tableSx, avatarSx } from "../../components/DataTable/tableStyles";
import "./Employee.css";

// 每页显示几个人
const PAGE_SIZE = 6;

// 状态标签的颜色：在职绿色，休假橙色
const statusColors: Record<EmployeeStatus, { bg: string; color: string }> = {
  active: { bg: "#dcfce7", color: "#15803d" },
  onLeave: { bg: "#fef3c7", color: "#b45309" },
};

// 取名字首字母作头像："Tom Lee" → "TL"
function getInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Employee() {

  const { t } = useLanguage();

  // 员工列表放进 state：这样删除后页面会重新渲染
  const [list, setList] = useState<EmployeeData[]>(mockEmployees);

  // 搜索关键字
  const [keyword, setKeyword] = useState("");

  // 当前页（从 1 开始）
  const [page, setPage] = useState(1);

  // ---------------------------------------------------
  // 搜索过滤
  // 同时匹配英文原值和翻译后的文字，
  // 所以切到中文后搜“厨房”也能搜到
  // ---------------------------------------------------
  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return list;

    return list.filter((e) =>
      [
        e.name,
        e.phone,
        e.department,
        e.position,
        t.departments[e.department],
        t.employee.positions[e.position],
      ]
        .join(" ")
        .toLowerCase()
        .includes(k)
    );
  }, [list, keyword, t]);

  // ---------------------------------------------------
  // 分页计算
  // ---------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // 删除或搜索后总页数可能变少，当前页不能超过最后一页
  const currentPage = Math.min(page, totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;                 // 本页第一条的下标
  const pageItems = filtered.slice(start, start + PAGE_SIZE);  // 本页的数据

  // “第 x–y 条，共 z 条” 里的数字
  const from = filtered.length === 0 ? 0 : start + 1;
  const to = start + pageItems.length;

  // ---------------------------------------------------
  // 删除
  // ---------------------------------------------------
  const handleDelete = (emp: EmployeeData) => {
    if (window.confirm(t.employee.deleteConfirm(emp.name))) {
      setList((prev) => prev.filter((e) => e.id !== emp.id));
    }
  };

  // ---------------------------------------------------
  // 导出 CSV（表头和内容都用当前语言）
  // ---------------------------------------------------
  const handleExport = () => {
    const header = [
      t.employee.colEmployee,
      t.employee.colDepartment,
      t.employee.colPosition,
      t.employee.colPhone,
      t.employee.colStatus,
    ];

    const rows = filtered.map((e) => [
      e.name,
      t.departments[e.department],
      t.employee.positions[e.position],
      e.phone,
      t.employee.status[e.status],
    ]);

    // 每个格子用双引号包起来，避免内容里有逗号时错列
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    // 开头加 BOM（\uFEFF），Excel 打开中文 / 日文才不会乱码
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "employees.csv";
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="Employee">

      {/* ========== 标题 ========== */}
      <h1>{t.employee.title}</h1>
      <p className="pageSubtitle">{t.employee.subtitle}</p>

      {/* ========== 工具栏（这一部分下一步再换组件） ========== */}
      <div className="employeeToolbar">

        <div className="employeeSearchBox">
          <SearchIcon />
          <input
            type="text"
            value={keyword}
            placeholder={t.employee.searchPlaceholder}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1); // 搜索后回到第一页
            }}
          />
        </div>

        <div className="employeeActions">
          <button
            className="primaryButton"
            onClick={() => window.alert(t.employee.addComingSoon)}
          >
            <AddIcon />
            {t.employee.add}
          </button>

          <button className="outlineButton" onClick={handleExport}>
            <FileDownloadOutlinedIcon />
            {t.employee.export}
          </button>
        </div>

      </div>

      {/* ========== 表格卡片 ========== */}
      <div className="employeeCard">

        {/* TableContainer：表格外壳，表格太宽时自动出现横向滚动条 */}
        <TableContainer>

          {/* tableSx：所有表格共用的样式（见 components/DataTable/tableStyles.ts） */}
          <Table sx={[tableSx, { minWidth: 860 }]}>

            <TableHead>
              <TableRow>
                <TableCell>{t.employee.colEmployee}</TableCell>
                <TableCell>{t.employee.colDepartment}</TableCell>
                <TableCell>{t.employee.colPosition}</TableCell>
                <TableCell>{t.employee.colType}</TableCell>
                <TableCell>{t.employee.colPhone}</TableCell>
                <TableCell>{t.employee.colStatus}</TableCell>
                <TableCell>{t.employee.colActions}</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {pageItems.map((emp) => (
                <TableRow key={emp.id}>

                  {/* 员工：头像 + 名字 */}
                  <TableCell>
                    <div className="employeeName">
                      <Avatar sx={avatarSx}>{getInitials(emp.name)}</Avatar>
                      <strong>{emp.name}</strong>
                    </div>
                  </TableCell>

                  <TableCell sx={{ color: "#6b7280 !important" }}>
                    {t.departments[emp.department]}
                  </TableCell>
                  <TableCell sx={{ color: "#6b7280 !important" }}>
                    {t.employee.positions[emp.position]}
                  </TableCell>
                  {/* 雇佣类型：正社员蓝色、兼职灰色 */}
                  <TableCell>
                    <span className={`typeTag ${emp.employment}`}>{t.employee.employment[emp.employment]}</span>
                  </TableCell>
                  <TableCell sx={{ color: "#6b7280 !important" }}>
                    {emp.phone}
                  </TableCell>

                  {/* 状态：Chip 标签 */}
                  <TableCell>
                    <Chip
                      label={t.employee.status[emp.status]}
                      size="small"
                      sx={{
                        borderRadius: "6px",
                        fontWeight: 600,
                        fontSize: 12,
                        bgcolor: statusColors[emp.status].bg,
                        color: statusColors[emp.status].color,
                      }}
                    />
                  </TableCell>

                  {/* 操作：编辑 / 删除，鼠标悬停显示 Tooltip 提示文字 */}
                  <TableCell>
                    <Tooltip title={t.employee.edit}>
                      <IconButton
                        size="small"
                        onClick={() => window.alert(t.employee.addComingSoon)}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title={t.employee.delete}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(emp)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>

                </TableRow>
              ))}

              {/* 搜索不到时显示空状态 */}
              {pageItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5, color: "#8c96a0 !important" }}>
                    {t.employee.empty}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>

          </Table>
        </TableContainer>

        {/* ========== 底部：条数说明 + 分页 ========== */}
        <div className="employeeFooter">

          <span>{t.employee.showing(from, to, filtered.length)}</span>

          {/* MUI Pagination：自动生成页码、上一页/下一页，
              页数多时会自动显示省略号（1 2 … 9 10） */}
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, value) => setPage(value)}
            variant="outlined"
            shape="rounded"
            color="primary"
            size="small"
          />

        </div>

      </div>

    </div>
  );
}

export default Employee;
