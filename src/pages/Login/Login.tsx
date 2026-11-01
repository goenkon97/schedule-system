// src/pages/Login/Login.tsx
// =====================================================
// 登录页（全屏，不显示顶部栏和左侧菜单）
//
// 布局：左边蓝色品牌区（系统名 + 小插画 + 三个卖点），右边登录表单
// 交互：
//   - 邮箱 / 密码校验（空、格式不对），错误显示在输入框下面
//   - 密码可以点眼睛图标显示 / 隐藏
//   - 登录中按钮转圈、不能重复点
//   - 账号或密码错误：表单上方红色提示
//   - 演示账号：点一下自动填好店长 / 员工的账号
//   - 左上角「返回首页」：不登录也能回去看
// =====================================================

import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";

import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import GroupsIcon from "@mui/icons-material/Groups";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";

import { useLanguage } from "../../i18n/LanguageContext";
import { useAuth } from "../../auth/AuthContext";
import { DEMO_ACCOUNTS } from "../../auth/AuthProvider";
import LanguageSwitcher from "../../components/LanguageSwitcher/LanguageSwitcher";
import "./Login.css";

// 简单的邮箱格式检查：有 @，@ 后面有点
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();

  // 表单的值
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // 状态：每个输入框的错误、整体错误、是否正在登录
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  // 校验：返回是否通过
  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = t.auth.emailRequired;
    else if (!EMAIL_RE.test(email.trim())) next.email = t.auth.emailInvalid;
    if (!password) next.password = t.auth.passwordRequired;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();                // 阻止浏览器默认的「提交后刷新页面」
    setFormError("");
    if (!validate() || loading) return;

    setLoading(true);
    const res = await login(email, password, remember);
    setLoading(false);

    if (res.ok) navigate("/");         // 登录成功回首页
    else setFormError(t.auth.invalidCredentials);
  };

  // 点演示账号：自动填好
  const fillDemo = (i: number) => {
    setEmail(DEMO_ACCOUNTS[i].email);
    setPassword(DEMO_ACCOUNTS[i].password);
    setErrors({});
    setFormError("");
  };

  return (
    <div className="Login">

      {/* ========== 左边：品牌区 ========== */}
      <aside className="loginBrand">
        <div className="brandTop">
          <div className="brandLogo"><CalendarMonthIcon /></div>
          <span>{t.appTitle}</span>
        </div>

        <div className="brandMain">
          <h1>{t.auth.brandTitle}</h1>
          <p>{t.auth.brandSubtitle}</p>

          {/* 小插画：一张迷你班表，白班黄点、晚班紫点 */}
          <div className="brandCalendar" aria-hidden="true">
            {t.schedule.weekdays.map((w, i) => (
              <div className="miniDay" key={i}>
                <small>{w}</small>
                <span className="miniDot day" />
                <span className={`miniDot evening ${i === 5 ? "short" : ""}`} />
              </div>
            ))}
          </div>

          <ul className="brandPoints">
            <li><AutoAwesomeIcon /> {t.auth.point1}</li>
            <li><EventAvailableIcon /> {t.auth.point2}</li>
            <li><GroupsIcon /> {t.auth.point3}</li>
          </ul>
        </div>

        <div className="brandFoot">© 2026 Goen Kon · Portfolio</div>
      </aside>

      {/* ========== 右边：登录表单 ========== */}
      <main className="loginPanel">

        <div className="loginTopBar">
          {/* 不登录也能回首页 */}
          <Link to="/" className="backLink">
            <ArrowBackIcon fontSize="small" />
            {t.auth.backHome}
          </Link>
          <LanguageSwitcher tone="light" />
        </div>

        <form className="loginCard" onSubmit={handleSubmit} noValidate>
          <h2>{t.auth.title}</h2>
          <p className="loginSub">{t.auth.subtitle}</p>

          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

          <TextField
            label={t.auth.email}
            type="email"
            autoComplete="username"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!errors.email}
            helperText={errors.email || " "}        // 空格占位：有没有错误时高度都一样，表单不会跳
            sx={{ mb: 1 }}
          />

          <TextField
            label={t.auth.password}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!errors.password}
            helperText={errors.password || " "}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <div className="loginRow">
            <FormControlLabel
              control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} size="small" />}
              label={t.auth.remember}
            />
            <button type="button" className="textLink" onClick={() => setFormError(t.auth.forgotHint)}>
              {t.auth.forgot}
            </button>
          </div>

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={loading}
            sx={{ mt: 1, py: 1.4, borderRadius: "10px", fontWeight: 700, textTransform: "none", fontSize: 16 }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : t.auth.submit}
          </Button>

          {/* 演示账号：给面试官一键体验 */}
          <div className="demoBox">
            <span>{t.auth.demoTitle}</span>
            <div className="demoButtons">
              <button type="button" onClick={() => fillDemo(0)}>
                <StorefrontOutlinedIcon fontSize="small" />
                <b>{t.auth.demoManager}</b>
              </button>
              <button type="button" onClick={() => fillDemo(1)}>
                <PersonOutlineIcon fontSize="small" />
                <b>{t.auth.demoStaff}</b>
              </button>
            </div>
            <small>{t.auth.demoHint}</small>
          </div>
        </form>
      </main>
    </div>
  );
}
