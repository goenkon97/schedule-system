// src/pages/Login/Login.tsx
// =====================================================
// 登录页（苹果风格：简洁、留白、层级清楚）
//
// 宽屏：左右两栏
//   左边：深蓝品牌区，只放 Logo + 一句大标题 + 一句副标题 + 一个简洁的班表插画
//   右边：白色背景，表单居中（大标题 → 副标题 → 邮箱 / 密码 → 登录按钮 → 一行演示账号）
// 手机：隐藏左边品牌区，变成浅灰背景 + 居中白色卡片
//
// 交互（和之前一样）：
//   - 邮箱 / 密码校验（空、格式不对），错误显示在输入框下面
//   - 密码可以点眼睛图标显示 / 隐藏
//   - 登录中按钮转圈、不能重复点
//   - 账号或密码错误：表单上方红色提示
//   - 点演示账号：自动填好店长 / 员工的账号
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

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

import { useLanguage } from "../../i18n/LanguageContext";
import { useAuth } from "../../auth/AuthContext";
import { DEMO_ACCOUNTS } from "../../auth/AuthProvider";
import LanguageSwitcher from "../../components/LanguageSwitcher/LanguageSwitcher";
import "./Login.css";

// 简单的邮箱格式检查：有 @，@ 后面有点
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 输入框的统一样式：更高、更圆、背景是很浅的灰，聚焦时变白（苹果的输入框就是这种感觉）
const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: "#F5F5F7",
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#D2D2D7" },
    "&.Mui-focused": { backgroundColor: "#FFFFFF" },
  },
};

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

      {/* ========== 左边：品牌区（只放最重要的三样：名字、一句话、一张图） ========== */}
      <aside className="loginBrand">
        <div className="brandTop">
          <div className="brandLogo"><CalendarMonthIcon /></div>
          <span>{t.appTitle}</span>
        </div>

        <div className="brandMain">
          <h2>{t.auth.brandTitle}</h2>
          <p>{t.auth.brandSubtitle}</p>

          {/* 插画：一周的迷你班表，白班一条黄、晚班一条紫，周六晚班缺人（浅红） */}
          <div className="brandCalendar" aria-hidden="true">
            {t.schedule.weekdays.map((w, i) => (
              <div className="miniDay" key={i}>
                <small>{w}</small>
                <span className="miniBar day" />
                <span className={`miniBar evening ${i === 5 ? "short" : ""}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="brandFoot">© 2026 Goen Kon</div>
      </aside>

      {/* ========== 右边：表单区 ========== */}
      <div className="loginSide">

      {/* 顶部：返回 + 语言（很淡，不抢视线） */}
      <header className="loginTop">
        <Link to="/" className="backLink">
          <ChevronLeftIcon fontSize="small" />
          {t.auth.backHome}
        </Link>
        <LanguageSwitcher tone="light" />
      </header>

      <main className="loginMain">
        <form className="loginCard" onSubmit={handleSubmit} noValidate>

          {/* Logo：宽屏时左边品牌区已经有了，这里只在手机上显示 */}
          <div className="loginLogo"><CalendarMonthIcon /></div>

          <h1>{t.auth.title}</h1>
          <p className="loginSub">{t.auth.subtitle}</p>

          {formError && <Alert severity="error" sx={{ mb: 2, textAlign: "left" }}>{formError}</Alert>}

          <TextField
            label={t.auth.email}
            type="email"
            autoComplete="username"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!errors.email}
            helperText={errors.email || " "}        // 空格占位：有没有错误时高度都一样，表单不会跳
            sx={fieldSx}
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
            sx={fieldSx}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
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
            sx={{ mt: 1, py: 1.5, borderRadius: "12px", fontSize: 16, fontWeight: 600 }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : t.auth.submit}
          </Button>
        </form>

        {/* 演示账号：卡片外面一行小字，需要时点一下就填好 */}
        <p className="demoLine">
          {t.auth.demoTitle}
          <button type="button" onClick={() => fillDemo(0)}>{t.auth.demoManager}</button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => fillDemo(1)}>{t.auth.demoStaff}</button>
        </p>
      </main>

      </div>
    </div>
  );
}
