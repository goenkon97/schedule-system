// src/pages/Employee/Employee.tsx
// =====================================================
// 员工管理页面
//
// 功能：
// 1. 搜索（姓名 / 部门 / 职位 / 电话）
// 2. 分页（每页 6 人）
// 3. 添加 / 编辑：弹窗 EmployeeFormDialog（同一个组件，两种模式）
// 4. 删除：先弹确认框，确认后再删
// 5. 导出 CSV（导出当前搜索结果）
//
// 增删改查都走 employeeApi（data/employees.ts），已经接上 Java 后端，数据存在 MySQL 里。
// 后端拒绝时（手机号重复、厨房员工不是正社员……），页面底部用红色提示条显示后端给的原因。
//
// 权限：
// - 店长：两个标签页「员工列表」（增删改查）和「员工申请」（看员工发来的请假 / 换班等申请）
// - 员工：看不到员工列表，只显示「我的信息」页（MyProfile.tsx）：自己的信息 + 提交申请
//
// 表格部分使用 MUI 组件：
// TableContainer / Table / TableHead / TableBody / TableRow / TableCell
// 以及单元格里的 Avatar（头像）、Chip（状态标签）、IconButton（操作按钮）、
// 底部的 Pagination（分页）
// =====================================================

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

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
import Dialog from "@mui/material/Dialog";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

// ---------- 图标 ----------
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";

import { useLanguage } from "../../i18n/LanguageContext";
import { useAuth } from "../../auth/AuthContext";
import { employeeApi, type Employee as EmployeeData, type EmployeeInput } from "../../data/employees";
import EmployeeFormDialog from "../../components/EmployeeFormDialog/EmployeeFormDialog";
import MyProfile from "./MyProfile";
import RequestsPanel from "./RequestsPanel";
import { pendingRequestCount, subscribeRequests } from "../../data/requests";
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

// =====================================================
// 入口：按登录角色决定显示哪个页面
// =====================================================
function Employee() {
  const { user } = useAuth();

  // 员工账号 → 「我的信息」
  if (user && user.role !== "manager") return <MyProfile user={user} />;

  // 店长 → 员工管理
  return <EmployeeManager />;
}

// =====================================================
// 店长看到的员工管理页
// =====================================================
function EmployeeManager() {

  const { t } = useLanguage();
  const { user } = useAuth();

  // 只有店长能添加、编辑、删除（这个页面本来只有店长能进，这里再保险一次）
  const canEdit = user?.role === "manager";

  // ---------- 标签页：员工列表 / 员工申请 ----------
  // 存在网址里（/employee?tab=requests），这样侧边栏的红色数字点过来能直接打开「员工申请」
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "requests" ? "requests" : "list";
  const setTab = (next: "list" | "requests") => setSearchParams(next === "requests" ? { tab: "requests" } : {});

  // 未处理申请的数量（标签上的红色数字），申请数据一变就更新
  const [pending, setPending] = useState(pendingRequestCount);
  useEffect(() => subscribeRequests(() => setPending(pendingRequestCount())), []);

  // 员工列表放进 state：增删改之后页面会重新渲染
  const [list, setList] = useState<EmployeeData[]>([]);


  // 弹窗状态：
  // formTarget = null 不显示；"new" 添加；某个员工对象 = 编辑这个人
  const [formTarget, setFormTarget] = useState<EmployeeData | "new" | null>(null);
  // 准备删除的人（显示确认框）
  const [deleting, setDeleting] = useState<EmployeeData | null>(null);
  // 底部提示条的文字（绿色：操作成功）
  const [toast, setToast] = useState("");
  // 底部错误提示条的文字（红色：后端拒绝了、或者连不上后端）
  const [errorText, setErrorText] = useState("");
  // 把 catch 到的错误变成提示文字。
  // err 是 unknown 类型（JS 里 throw 什么都可以），先判断是不是 Error 才能读 .message；
  // 我们自己的 ApiError 继承了 Error，message 就是后端返回的 {"message": "..."}
  const showError = (err: unknown) => setErrorText(err instanceof Error ? err.message : String(err));

  // 第一次打开页面时调接口拿员工列表：GET /api/employees
  // list() 返回 Promise（要等网络）；.then(setList)：拿到结果后放进 state，页面就显示出来
  // .catch：请求失败时（后端突然停了等），显示红色提示条，列表保持空
  // （放在 showError 定义的下面：JS 里 const 要先定义才能用）
  useEffect(() => {
    employeeApi.list().then(setList).catch(showError);
  }, []);
  // 刚添加 / 修改的那一行，短暂高亮一下，方便看到改了哪里
  const [highlightId, setHighlightId] = useState<number | null>(null);

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
  }, [list, keyword, t]);   // 列表、关键字、语言任何一个变了，才重新过滤

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

  // 高亮某一行 2 秒
  // （2 秒后如果高亮的还是这一行，就取消高亮；期间又高亮了别的行就不动）
  const flash = (id: number) => {
    setHighlightId(id);
    window.setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 2000);
  };

  // ---------------------------------------------------
  // 添加 / 编辑：弹窗里点「添加」或「保存」后调用
  // ---------------------------------------------------
  //
  // try / catch：await 的接口如果失败（apiFetch 抛出 ApiError），
  // 会直接跳到 catch，try 里后面的代码（更新列表、关弹窗）都不会执行 ——
  // 所以失败时弹窗不关，用户填的内容还在，看完红色提示改一下就能再提交。
  // ---------------------------------------------------
  const handleSubmit = async (input: EmployeeInput) => {
    try {
      if (formTarget === "new") {
        // 添加：接口返回带新 id 的员工，加到列表最后
        const created = await employeeApi.create(input);
        const next = [...list, created];
        setList(next);
        // 清空搜索，跳到最后一页，让新加的人马上能看到
        setKeyword("");
        setPage(Math.ceil(next.length / PAGE_SIZE));
        flash(created.id);
        setToast(t.employee.addedToast(created.name));
      } else if (formTarget) {
        // 编辑：用接口返回的数据替换这一行
        const updated = await employeeApi.update(formTarget.id, input);
        setList((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        flash(updated.id);
        setToast(t.employee.updatedToast(updated.name));
      }
      setFormTarget(null);
    } catch (err) {
      showError(err);
    }
  };

  // ---------------------------------------------------
  // 删除：确认框里点「删除」后调用
  // ---------------------------------------------------
  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await employeeApi.remove(deleting.id);
      // 走到这里说明后端已经删掉了（返回 204），再从页面的列表里去掉
      setList((prev) => prev.filter((e) => e.id !== deleting.id));
      setToast(t.employee.deletedToast(deleting.name));
    } catch (err) {
      // 删除失败（比如 404：这个人已经被别人删掉了），列表不动，显示原因
      showError(err);
    }
    // 不管成功失败都关掉确认框
    setDeleting(null);
  };

  // ---------------------------------------------------
  // 导出 CSV（表头和内容都用当前语言）
  // ---------------------------------------------------
  const handleExport = () => {
    const header = [
      t.employee.colEmployee,
      t.employee.colDepartment,
      t.employee.colPosition,
      t.employee.colType,
      t.employee.colPhone,
      t.employee.colStatus,
    ];

    const rows = filtered.map((e) => [
      e.name,
      t.departments[e.department],
      t.employee.positions[e.position],
      t.employee.employment[e.employment],
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

      {/* ========== 标签页 ========== */}
      <div className="employeeTabs">
        <button className={tab === "list" ? "active" : ""} onClick={() => setTab("list")}>
          {t.requests.tabList}
        </button>
        <button className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>
          {t.requests.tabRequests}
          {/* 有未处理的申请时显示红色数字 */}
          {pending > 0 && <span className="tabBadge">{pending}</span>}
        </button>
      </div>

      {tab === "requests" && <RequestsPanel onToast={setToast} />}

      {tab === "list" && (<>

      {/* ========== 工具栏 ========== */}
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
          {/* 员工账号：按钮变灰，鼠标放上去提示「只有店长可以…」
              （按钮 disabled 时收不到鼠标事件，所以外面包一层 span 给 Tooltip 用） */}
          <Tooltip title={canEdit ? "" : t.employee.managerOnly}>
            <span>
              <button
                className="primaryButton"
                disabled={!canEdit}
                onClick={() => setFormTarget("new")}
              >
                <AddIcon />
                {t.employee.add}
              </button>
            </span>
          </Tooltip>

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
                <TableRow key={emp.id} className={emp.id === highlightId ? "rowFlash" : ""}>

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

                  {/* 操作：编辑 / 删除，鼠标悬停显示 Tooltip 提示文字
                      员工账号时按钮变灰，提示只有店长能操作 */}
                  <TableCell>
                    <Tooltip title={canEdit ? t.employee.edit : t.employee.managerOnly}>
                      <span>
                        <IconButton
                          size="small"
                          disabled={!canEdit}
                          onClick={() => setFormTarget(emp)}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title={canEdit ? t.employee.delete : t.employee.managerOnly}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={!canEdit}
                          onClick={() => setDeleting(emp)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
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

      </>)}

      {/* ========== 添加 / 编辑弹窗 ==========
          key 不一样时 React 会重新创建组件，表单就会用新的人的数据重新填 */}
      {formTarget && (
        <EmployeeFormDialog
          key={formTarget === "new" ? "new" : formTarget.id}
          employee={formTarget === "new" ? undefined : formTarget}
          allEmployees={list}
          onClose={() => setFormTarget(null)}
          onSubmit={handleSubmit}
        />
      )}

      {/* ========== 删除确认框（样式和排班页的「清除班表」确认框共用） ========== */}
      <Dialog open={!!deleting} onClose={() => setDeleting(null)} maxWidth="xs" fullWidth>
        {deleting && (
          <div className="confirmBox">
            <h3>{t.employee.deleteConfirm(deleting.name)}</h3>
            <p>{t.employee.deleteDesc}</p>
            <div className="confirmActions">
              <button className="confirmCancel" onClick={() => setDeleting(null)}>{t.employee.cancel}</button>
              <button className="confirmDanger" onClick={handleDelete}>{t.employee.deleteAction}</button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ========== 底部提示条 ========== */}
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast("")}>{toast}</Alert>
      </Snackbar>

      {/* ========== 底部错误提示条（红色）==========
          显示后端返回的错误原因，比如「这个电话号码已经有其他员工在用了。」
          错误要多留一会儿让人看清，所以是 6 秒 */}
      <Snackbar
        open={!!errorText}
        autoHideDuration={6000}
        onClose={() => setErrorText("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" variant="filled" onClose={() => setErrorText("")}>{errorText}</Alert>
      </Snackbar>

    </div>
  );
}

export default Employee;
