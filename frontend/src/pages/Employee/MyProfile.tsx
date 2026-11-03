// src/pages/Employee/MyProfile.tsx
// =====================================================
// 员工账号看到的「我的信息」页（店长看到的是员工列表）
//
// 三块内容：
// 1. 基本信息：只能看，不能改（改信息要找店长）
// 2. 提交申请：类型（请假 / 换班 / 其他）+ 日期 + 备注
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

  // 换班只选一天；请假、其他可以选一段日期
  const singleDay = type === "swap";

  // ---------------------------------------------------
  // 点「发送给店长」：检查日期和备注 → 调接口提交 → 清空表单、刷新下面的列表
  // return setError(...)：显示错误并直接结束函数（后面的代码不执行）
  // ---------------------------------------------------
  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const end = singleDay || !endDate ? startDate : endDate;   // 没填结束日期 = 只有一天
    if (!startDate) return setError(t.requests.errDate);
    if (end < startDate) return setError(t.requests.errDateOrder);   // "YYYY-MM-DD" 可以直接按字符串比大小
    if (!note.trim()) return setError(t.requests.errNote);

    await requestApi.create({ employeeId: user.id, type, startDate, endDate: end, note: note.trim() });
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
  const fmtRange = (r: StaffRequest) => (r.startDate === r.endDate ? fmtDate(r.startDate) : `${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}`);
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
                  <button type="button" key={x} className={type === x ? "active" : ""} onClick={() => { setType(x); setError(""); }}>
                    {t.requests.types[x]}
                  </button>
                ))}
              </div>
            </div>

            {/* 日期：换班只有一个日期，请假 / 其他有开始和结束 */}
            <div className={`mpDates ${singleDay ? "single" : ""}`}>
              <label className="mpField">
                <span>{singleDay ? t.requests.fieldDate : t.requests.fieldFrom}</span>
                <input type="date" min={todayStr()} value={startDate} onChange={(e) => { setStartDate(e.target.value); setError(""); }} />
              </label>
              {!singleDay && (
                <label className="mpField">
                  <span>{t.requests.fieldTo}</span>
                  <input type="date" min={startDate || todayStr()} value={endDate} onChange={(e) => { setEndDate(e.target.value); setError(""); }} />
                </label>
              )}
            </div>

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

            <button type="submit" className="mpSubmit"><SendIcon sx={{ fontSize: 17 }} /> {t.requests.submit}</button>
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
