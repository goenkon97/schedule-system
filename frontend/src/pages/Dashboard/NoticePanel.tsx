// src/pages/Dashboard/NoticePanel.tsx
// =====================================================
// 首页右边的「通知」小模块
//
// - 店长：员工发来的、还没处理的申请（最新 5 条），点一下跳到「员工申请」
// - 员工：自己提交的申请和处理状态（最新 5 条），点一下跳到「我的信息」
//
// 数据来自 requestApi（data/requests.ts），申请一有变化就自动刷新
// 以后接后端：店长 GET /api/requests?status=pending，员工 GET /api/requests（后端按登录的人只返回他自己的）
// =====================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";

import { useLanguage } from "../../i18n/LanguageContext";
import { useAuth } from "../../auth/AuthContext";
import { employeeName } from "../../data/employees";
import { requestApi, subscribeRequests, type StaffRequest } from "../../data/requests";
import "../Employee/Requests.css";   // 申请类型、状态的小标签样式

const MAX_ITEMS = 5;

export default function NoticePanel() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isManager = user?.role === "manager";

  const [items, setItems] = useState<StaffRequest[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // 店长：所有未处理的；员工：自己的全部
      const list = isManager
        ? (await requestApi.listAll()).filter((r) => r.status === "pending")
        : await requestApi.listMine(user.id);
      setTotal(list.length);
      setItems(list.slice(0, MAX_ITEMS));
    };
    load();
    return subscribeRequests(load);
  }, [user, isManager]);

  // "多久之前"：刚刚 / 5 分钟前 / 3 小时前 / 2 天前
  const ago = (iso: string) => {
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return t.dashboard.timeAgo.justNow;
    if (min < 60) return t.dashboard.timeAgo.minutes(min);
    if (min < 60 * 24) return t.dashboard.timeAgo.hours(Math.floor(min / 60));
    return t.dashboard.timeAgo.days(Math.floor(min / 60 / 24));
  };

  const fmtDate = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale, { month: "short", day: "numeric" });
  };
  // 「其他」类型没有日期：显示「—」
  const fmtRange = (r: StaffRequest) =>
    !r.startDate || !r.endDate ? "—" : r.startDate === r.endDate ? fmtDate(r.startDate) : `${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}`;

  // 点通知 / 底部链接要去的地方
  const target = isManager ? "/employee?tab=requests" : "/employee";

  return (
    <aside className="noticePanel">
      <div className="noticeHead">
        <h2><NotificationsNoneIcon /> {isManager ? t.dashboard.noticeTitle : t.dashboard.myNoticeTitle}</h2>
        {/* 店长：未处理数量用红色；员工：只是总数 */}
        {total > 0 && <span className={`noticeCount ${isManager ? "alert" : ""}`}>{total}</span>}
      </div>

      <div className="noticeList">
        {items.length === 0 && (
          <p className="noticeEmpty">{isManager ? t.dashboard.noticeEmpty : t.dashboard.myNoticeEmpty}</p>
        )}

        {items.map((r) => (
          <button className="noticeItem" key={r.id} onClick={() => navigate(target)}>
            <div className="noticeTop">
              {/* 店长看是谁发的；员工看的是自己的，就显示处理状态 */}
              {isManager
                ? <strong>{employeeName(r.employeeId)}</strong>
                : <span className={`reqStatus ${r.status}`}>{t.requests.status[r.status]}</span>}
              <span className={`reqType ${r.type}`}>{t.requests.types[r.type]}</span>
            </div>
            <p className="noticeDate">{fmtRange(r)}</p>
            <p className="noticeNote">{r.note}</p>
            <small>{ago(r.createdAt)}</small>
          </button>
        ))}
      </div>

      <button className="noticeFooter" onClick={() => navigate(target)}>
        {isManager ? t.dashboard.noticeViewAll : t.dashboard.myNoticeGo}
      </button>
    </aside>
  );
}
