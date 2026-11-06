// src/pages/Employee/MyProfile.tsx
// =====================================================
// 员工账号看到的「我的信息」页（店长看到的是员工列表）
//
// 三块内容：
// 1. 基本信息：只能看，不能改（改信息要找店长）
// 2. 提交申请：类型 + 日期 + 备注，日期按类型变：
//      请假 → 先选「一天 / 多天」：一天只填一个日期，多天填开始和结束
//      换班 → 只填「想换的那一天」，和谁换写在备注里
//      其他 → 不用填日期
//    必填的没填完，「发送给店长」按钮是灰的，点不了
// 3. 我的申请：自己提交过的申请和处理状态；店长还没处理的可以撤回
//
// 申请只是“通知店长”：店长当面沟通后，自己去排班页调班，
// 再把申请标记为「已沟通」，这边就显示「店长已处理」
// =====================================================

import { useEffect, useState, type FormEvent } from "react";
import Avatar from "@mui/material/Avatar";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import SendIcon from "@mui/icons-material/Send";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import { useLanguage } from "../../i18n/LanguageContext";
import type { AuthUser } from "../../auth/AuthContext";
import { employeeById } from "../../data/employees";
import { requestApi, type RequestType, type StaffRequest } from "../../data/requests";
import { avatarSx } from "../../components/DataTable/tableStyles";
import "./Requests.css";

// 今天的日期字符串 "2026-11-02"（日期输入框的格式）
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TYPES: RequestType[] = ["leave", "swap", "other"];

export default function MyProfile({ user }: { user: AuthUser }) {
  const { t, locale } = useLanguage();

  // 登录账号的 id 就是员工 id（以后后端登录接口直接返回员工信息）
  const me = employeeById(user.id);

  // ---------- 表单 ----------
  const [type, setType] = useState<RequestType>("leave");
  // 请假是一天还是多天（只有请假用得到）
  const [leaveSpan, setLeaveSpan] = useState<"single" | "multi">("single");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  // ---------- 我的申请 ----------
  const [mine, setMine] = useState<StaffRequest[]>([]);
  const reload = () => requestApi.listMine(user.id).then(setMine);
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const [toast, setToast] = useState("");

  // ---------------------------------------------------
  // 这个类型要填几个日期：
  //   none   → 其他：不填
  //   single → 换班、一天的请假：填一个
  //   range  → 多天的请假：填开始和结束
  // ---------------------------------------------------
  const dateMode: "none" | "single" | "range" =
    type === "other" ? "none" : type === "leave" && leaveSpan === "multi" ? "range" : "single";

  // 多天请假时，结束日期早于开始日期（"YYYY-MM-DD" 可以直接按字符串比大小）
  const dateOrderWrong = dateMode === "range" && !!startDate && !!endDate && endDate < startDate;

  // ---------------------------------------------------
  // 能不能发送：该填的都填了，按钮才能点
  //   日期：none 不用；single 要有开始；range 开始、结束都要有，而且顺序对
  //   备注：都要写（请假写原因，换班写和谁换，其他写想说什么）
  // ---------------------------------------------------
  const datesOk =
    dateMode === "none" ||
    (dateMode === "single" && !!startDate) ||
    (dateMode === "range" && !!startDate && !!endDate && !dateOrderWrong);
  const canSubmit = datesOk && note.trim() !== "";

  // 切换类型、或者切换一天 / 多天时，把日期清空，免得带着上一种的日期提交
  const changeType = (x: RequestType) => {
    setType(x);
    setStartDate("");
    setEndDate("");
    setError("");
  };
  const changeLeaveSpan = (x: "single" | "multi") => {
    setLeaveSpan(x);
    setEndDate("");
    setError("");
  };

  // ---------------------------------------------------
  // 点「发送给店长」：调接口提交 → 清空表单、刷新下面的列表
  // （按钮在没填完时是灰的，这里再检查一次 canSubmit，防止按回车绕过去）
  // ---------------------------------------------------
  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!canSubmit) return;

    // 按类型算出要存的开始、结束日期：没有日期就是 null；只有一天就开始 = 结束
    const start = dateMode === "none" ? null : startDate;
    const end = dateMode === "range" ? endDate : start;

    await requestApi.create({ employeeId: user.id, type, startDate: start, endDate: end, note: note.trim() });
    // 发送成功：清空表单，刷新下面的列表
    setStartDate("");
    setEndDate("");
    setNote("");
    setError("");
    setToast(t.requests.submittedToast);
    reload();
  };

  const handleCancel = async (r: StaffRequest) => {
    await requestApi.cancel(r.id);
    setToast(t.requests.cancelledToast);
    reload();
  };

  // 日期显示："2026-12-05" → "12月5日（周六）"（跟着当前语言）
  // 不直接 new Date("2026-12-05")：那样会按 UTC 解析，在某些时区可能差一天，所以拆开传年月日
  const fmtDate = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale, { month: "short", day: "numeric", weekday: "short" });
  };
  // 「其他」类型没有日期：显示「—」
  const fmtRange = (r: StaffRequest) =>
    !r.startDate || !r.endDate ? "—" : r.startDate === r.endDate ? fmtDate(r.startDate) : `${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}`;
  const fmtTime = (iso: string) => new Date(iso).toLocaleString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="MyProfile">
      <h1>{t.requests.myTitle}</h1>
      <p className="pageSubtitle">{t.requests.mySubtitle}</p>

      <div className="mpGrid">

        {/* ========== 1. 基本信息（只读） ========== */}
        <section className="mpCard">
          <div className="mpPerson">
            <Avatar sx={{ ...avatarSx, width: 56, height: 56, fontSize: 20 }}>
              {user.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </Avatar>
            <div>
              <h2>{user.name}</h2>
              {me && <p>{t.departments[me.department]} · {t.employee.positions[me.position]}</p>}
            </div>
          </div>

          <h3 className="mpCardTitle">{t.requests.profileTitle}</h3>
          {/* dl / dt / dd：HTML 里专门表示“名称 — 值”这种列表的标签 */}
          <dl className="mpInfo">
            {me && (
              <>
                <dt>{t.employee.colDepartment}</dt><dd>{t.departments[me.department]}</dd>
                <dt>{t.employee.colPosition}</dt><dd>{t.employee.positions[me.position]}</dd>
                <dt>{t.employee.colType}</dt><dd>{t.employee.employment[me.employment]}</dd>
                <dt>{t.employee.colPhone}</dt><dd>{me.phone}</dd>
                <dt>{t.employee.colStatus}</dt><dd>{t.employee.status[me.status]}</dd>
              </>
            )}
            <dt>{t.requests.email}</dt><dd>{user.email}</dd>
          </dl>
          <p className="mpHint">{t.requests.profileHint}</p>
        </section>

        {/* ========== 2. 提交申请 ========== */}
        <section className="mpCard">
          <h3 className="mpCardTitle">{t.requests.formTitle}</h3>
          <p className="mpNotice"><InfoOutlinedIcon /> {t.requests.formHint}</p>

          <form className="mpForm" onSubmit={handleSubmit} noValidate>
            <div className="mpField">
              <span>{t.requests.fieldType}</span>
              <div className="mpSegment">
                {TYPES.map((x) => (
                  <button type="button" key={x} className={type === x ? "active" : ""} onClick={() => changeType(x)}>
                    {t.requests.types[x]}
                  </button>
                ))}
              </div>
            </div>

            {/* 请假：先选一天还是多天 */}
            {type === "leave" && (
              <div className="mpField">
                <span>{t.requests.fieldLeaveSpan}</span>
                <div className="mpSegment">
                  <button type="button" className={leaveSpan === "single" ? "active" : ""} onClick={() => changeLeaveSpan("single")}>
                    {t.requests.leaveSingle}
                  </button>
                  <button type="button" className={leaveSpan === "multi" ? "active" : ""} onClick={() => changeLeaveSpan("multi")}>
                    {t.requests.leaveMulti}
                  </button>
                </div>
              </div>
            )}

            {/* 日期：「其他」不显示；一天 / 换班显示一个；多天显示开始和结束 */}
            {dateMode !== "none" && (
              <div className={`mpDates ${dateMode === "single" ? "single" : ""}`}>
                <label className="mpField">
                  <span>
                    {type === "swap" ? t.requests.fieldSwapDate : dateMode === "range" ? t.requests.fieldFrom : t.requests.fieldDate}
                  </span>
                  <input type="date" min={todayStr()} value={startDate} onChange={(e) => { setStartDate(e.target.value); setError(""); }} />
                </label>
                {dateMode === "range" && (
                  <label className="mpField">
                    <span>{t.requests.fieldTo}</span>
                    <input type="date" min={startDate || todayStr()} value={endDate} onChange={(e) => { setEndDate(e.target.value); setError(""); }} />
                  </label>
                )}
              </div>
            )}
            {/* 多天请假：结束日期早于开始日期时，提示一下 */}
            {dateOrderWrong && <p className="mpError">{t.requests.errDateOrder}</p>}

            <label className="mpField">
              <span>{t.requests.fieldNote}</span>
              <textarea
                rows={3}
                maxLength={300}
                value={note}
                placeholder={t.requests.notePlaceholder[type]}
                onChange={(e) => { setNote(e.target.value); setError(""); }}
              />
            </label>

            {error && <p className="mpError">{error}</p>}

            {/* disabled：没填完就是灰的、点不了（样式在 Requests.css 的 .mpSubmit:disabled） */}
            <button type="submit" className="mpSubmit" disabled={!canSubmit}><SendIcon sx={{ fontSize: 17 }} /> {t.requests.submit}</button>
          </form>
        </section>
      </div>

      {/* ========== 3. 我的申请 ========== */}
      <section className="mpCard mpList">
        <h3 className="mpCardTitle">{t.requests.myListTitle}</h3>
        {mine.length === 0 && <p className="mpEmpty">{t.requests.myListEmpty}</p>}
        {mine.map((r) => (
          <div className="mpItem" key={r.id}>
            <span className={`reqType ${r.type}`}>{t.requests.types[r.type]}</span>
            <div className="mpItemMain">
              <strong>{fmtRange(r)}</strong>
              <p>{r.note}</p>
              <small>{t.requests.sentAt(fmtTime(r.createdAt))}</small>
            </div>
            <span className={`reqStatus ${r.status}`}>{t.requests.status[r.status]}</span>
            {/* 店长还没处理的才能撤回 */}
            {r.status === "pending" && (
              <button className="mpCancel" onClick={() => handleCancel(r)}>{t.requests.cancel}</button>
            )}
          </div>
        ))}
      </section>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast("")} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="success" variant="filled" onClose={() => setToast("")}>{toast}</Alert>
      </Snackbar>
    </div>
  );
}
