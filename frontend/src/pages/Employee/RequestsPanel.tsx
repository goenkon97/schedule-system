// src/pages/Employee/RequestsPanel.tsx
// =====================================================
// 店长看到的「员工申请」标签页
//
// - 默认只显示「未处理」的申请，也可以切到「全部」
// - 申请只是通知：店长和员工当面沟通 → 到排班页调班 → 回来点「标记为已沟通」
// - 点错了可以「改回未处理」
// =====================================================

import { useEffect, useMemo, useState } from "react";
import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Avatar from "@mui/material/Avatar";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import { useLanguage } from "../../i18n/LanguageContext";
import { employeeById } from "../../data/employees";
import { requestApi, subscribeRequests, type StaffRequest } from "../../data/requests";
import { tableSx, avatarSx } from "../../components/DataTable/tableStyles";
import "./Requests.css";

// 筛选：只看未处理 / 看全部
type Filter = "pending" | "all";

// onToast：父组件（Employee 页）传进来的函数，调用它就能在页面底部显示提示条
export default function RequestsPanel({ onToast }: { onToast: (msg: string) => void }) {
  const { t, locale } = useLanguage();
  const [list, setList] = useState<StaffRequest[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");

  // 拿全部申请；数据一变（比如员工在别处提交了）就重新拿
  useEffect(() => {
    const load = () => requestApi.listAll().then(setList);
    load();
    return subscribeRequests(load);   // 返回“取消订阅”，组件卸载时 React 会自动调用
  }, []);

  // 未处理的条数（显示在筛选按钮上）
  const pendingCount = list.filter((r) => r.status === "pending").length;
  // 表格里实际显示的：选「未处理」就过滤一下，选「全部」就是整个列表
  const shown = useMemo(() => (filter === "pending" ? list.filter((r) => r.status === "pending") : list), [list, filter]);

  // 点操作按钮：未处理 ↔ 已沟通 来回切换
  // 不用手动刷新列表：setStatus 会通知订阅者，上面 useEffect 里的 load 会自动重新拿数据
  const toggle = async (r: StaffRequest) => {
    await requestApi.setStatus(r.id, r.status === "pending" ? "done" : "pending");
    onToast(t.requests.markedToast);
  };

  // 日期显示："2026-12-05" → 「12月5日(六)」，跟着当前语言
  // 不直接 new Date("2026-12-05")：那样会按 UTC 解析，在某些时区可能差一天，所以拆开传年月日
  const fmtDate = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale, { month: "short", day: "numeric", weekday: "short" });
  };
  // 提交时间：只显示月、日、时、分
  const fmtTime = (iso: string) => new Date(iso).toLocaleString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="reqPanel">
      <p className="reqHint"><InfoOutlinedIcon /> {t.requests.managerHint}</p>

      <div className="reqFilter">
        <button className={filter === "pending" ? "active" : ""} onClick={() => setFilter("pending")}>
          {t.requests.filterPending} ({pendingCount})
        </button>
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
          {t.requests.filterAll} ({list.length})
        </button>
      </div>

      <div className="reqCard">
        <TableContainer>
          <Table sx={[tableSx, { minWidth: 900 }]}>
            <TableHead>
              <TableRow>
                <TableCell>{t.requests.colEmployee}</TableCell>
                <TableCell>{t.requests.colType}</TableCell>
                <TableCell>{t.requests.colDate}</TableCell>
                <TableCell>{t.requests.colNote}</TableCell>
                <TableCell>{t.requests.colSent}</TableCell>
                <TableCell>{t.requests.colStatus}</TableCell>
                <TableCell>{t.requests.colActions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* 每条申请一行 */}
              {shown.map((r) => {
                const e = employeeById(r.employeeId);   // 员工可能已经被删了
                const name = e?.name ?? t.requests.unknownEmployee;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="reqWho">
                        <Avatar sx={avatarSx}>{e ? name.split(" ").map((w) => w[0]).join("").slice(0, 2) : "?"}</Avatar>
                        <div>
                          <strong>{name}</strong>
                          {e && <small>{t.departments[e.department]} · {t.employee.employment[e.employment]}</small>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className={`reqType ${r.type}`}>{t.requests.types[r.type]}</span></TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {/* 「其他」类型没有日期：显示「—」；只有一天：显示一个日期；一段：开始 – 结束 */}
                      {!r.startDate || !r.endDate ? "—" : r.startDate === r.endDate ? fmtDate(r.startDate) : `${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}`}
                    </TableCell>
                    <TableCell sx={{ color: "#6b7280 !important" }}><div className="reqNote">{r.note}</div></TableCell>
                    <TableCell sx={{ color: "#6b7280 !important", whiteSpace: "nowrap" }}>{fmtTime(r.createdAt)}</TableCell>
                    <TableCell><span className={`reqStatus ${r.status}`}>{t.requests.managerStatus[r.status]}</span></TableCell>
                    <TableCell>
                      <button className={`reqAction ${r.status === "pending" ? "primary" : ""}`} onClick={() => toggle(r)}>
                        {r.status === "pending" ? t.requests.markDone : t.requests.markPending}
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {shown.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5, color: "#8c96a0 !important" }}>{t.requests.managerEmpty}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}
