import { useState } from "react";
import {
  Loader2,
  Lock,
  ShieldCheck,
  UserPlus,
  KeyRound,
  Mail,
  Eye,
  EyeOff,
  User,
} from "lucide-react";
import { api, getApiError } from "../api";
import "./admin.css";

export default function Login({ onLogin }) {
  const [authMode, setAuthMode] = useState("login");

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
    device_name: "Web - Google Keep Clone",
  });
  const [registerForm, setRegisterForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetForm, setResetForm] = useState({
    email: "",
    otp: "",
    newPassword: "",
  });

  const [message, setMessage] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Toggle show/hide password
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showRegisterPass, setShowRegisterPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const setMsg = (type, text) => setMessage({ type, text });
  const clearMsg = () => setMessage(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    clearMsg();
    try {
      const res = await api.post("/auth/login", loginForm);
      const { token, user } = res.data.data || res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      onLogin(user);
    } catch (err) {
      setMsg("error", getApiError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    clearMsg();
    try {
      await api.post("/auth/register", registerForm);
      setRegisterForm({ full_name: "", email: "", password: "" });
      setAuthMode("login");
      setMsg("success", "Tạo tài khoản thành công, có thể đăng nhập.");
    } catch (err) {
      setMsg("error", getApiError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return setMsg("error", "Vui lòng nhập email");
    setAuthLoading(true);
    clearMsg();
    try {
      const res = await api.post("/auth/forgot-password", {
        email: forgotEmail,
      });
      setResetForm({ email: forgotEmail, otp: "", newPassword: "" });
      setMsg("success", res.data.message || "Đã gửi mã OTP!");
      setAuthMode("reset");
    } catch (err) {
      setMsg("error", getApiError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetForm.otp || !resetForm.newPassword) {
      return setMsg("error", "Vui lòng nhập đủ mã OTP và mật khẩu mới");
    }
    setAuthLoading(true);
    clearMsg();
    try {
      const res = await api.post("/auth/reset-password", resetForm);
      setMsg("success", res.data.message || "Đổi mật khẩu thành công!");
      setResetForm({ email: "", otp: "", newPassword: "" });
      setForgotEmail("");
      setTimeout(() => {
        setAuthMode("login");
        clearMsg();
      }, 2000);
    } catch (err) {
      setMsg("error", getApiError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const titleMap = {
    login: "Đăng nhập ứng dụng",
    register: "Tạo tài khoản mới",
    forgot: "Quên mật khẩu",
    reset: "Đặt mật khẩu mới",
  };

  return (
    <main className="auth-shell">
      {/* Bên trái - Giới thiệu */}
      <div className="auth-intro">
        <div className="auth-intro-content">
          <h1 className="auth-intro-title">
            Chào mừng bạn đến với ứng dụng <span>Ghi Chú Nhanh</span>
          </h1>
          <p className="auth-intro-desc">
            Ghi lại mọi ý tưởng, nhắc nhở công việc và chia sẻ ghi chú với bạn
            bè dễ dàng.
          </p>
          <div className="auth-intro-features">
            <div className="auth-feature-card">
              🔔 <span>Nhắc nhở thông minh</span>
            </div>
            <div className="auth-feature-card">
              🤝 <span>Chia sẻ ghi chú</span>
            </div>
            <div className="auth-feature-card">
              🎨 <span>Tùy chỉnh màu sắc</span>
            </div>
            <div className="auth-feature-card">
              🔒 <span>Bảo mật an toàn</span>
            </div>
          </div>
        </div>
      </div>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="brand-mark">
          <ShieldCheck size={30} aria-hidden="true" />
          <div>
            <strong>Xác thực</strong>
          </div>
        </div>

        {authMode !== "forgot" && authMode !== "reset" && (
          <div className="auth-tabs" role="tablist">
            <button
              className={authMode === "login" ? "active" : ""}
              type="button"
              onClick={() => {
                setAuthMode("login");
                clearMsg();
              }}
            >
              <Lock size={18} /> Đăng nhập
            </button>
            <button
              className={authMode === "register" ? "active" : ""}
              type="button"
              onClick={() => {
                setAuthMode("register");
                clearMsg();
              }}
            >
              <UserPlus size={18} /> Đăng ký
            </button>
          </div>
        )}

        <h1 id="auth-title">{titleMap[authMode]}</h1>

        {message && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}

        {/* ── ĐĂNG NHẬP ── */}
        {authMode === "login" && (
          <form className="form-stack" onSubmit={handleLogin}>
            <label>
              Email
              <div className="input-icon-wrap">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                  required
                />
              </div>
            </label>
            <label>
              Mật khẩu
              <div className="input-icon-wrap">
                <Lock size={16} className="input-icon" />
                <input
                  type={showLoginPass ? "text" : "password"}
                  placeholder="Nhập mật khẩu"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  required
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setShowLoginPass(!showLoginPass)}
                >
                  {showLoginPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <button
              className="primary-action"
              type="submit"
              disabled={authLoading}
            >
              {authLoading ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <Lock size={18} />
              )}
              Đăng nhập
            </button>
            <button
              type="button"
              className="ghost-action"
              style={{ justifyContent: "center", marginTop: -4 }}
              onClick={() => {
                setAuthMode("forgot");
                clearMsg();
              }}
            >
              <KeyRound size={15} /> Quên mật khẩu?
            </button>
          </form>
        )}

        {/* ── ĐĂNG KÝ ── */}
        {authMode === "register" && (
          <form className="form-stack" onSubmit={handleRegister}>
            <label>
              Họ tên
              <div className="input-icon-wrap">
                <User size={16} className="input-icon" />
                <input
                  placeholder="Nguyễn Văn A"
                  value={registerForm.full_name}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      full_name: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </label>
            <label>
              Email
              <div className="input-icon-wrap">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, email: e.target.value })
                  }
                  required
                />
              </div>
            </label>
            <label>
              Mật khẩu
              <div className="input-icon-wrap">
                <Lock size={16} className="input-icon" />
                <input
                  type={showRegisterPass ? "text" : "password"}
                  placeholder="Tối thiểu 6 ký tự"
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      password: e.target.value,
                    })
                  }
                  minLength={6}
                  maxLength={72}
                  required
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setShowRegisterPass(!showRegisterPass)}
                >
                  {showRegisterPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <button
              className="primary-action"
              type="submit"
              disabled={authLoading}
            >
              {authLoading ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <UserPlus size={18} />
              )}
              Đăng ký
            </button>
          </form>
        )}

        {/* ── QUÊN MẬT KHẨU ── */}
        {authMode === "forgot" && (
          <form className="form-stack" onSubmit={handleForgotPassword}>
            <label>
              Email đã đăng ký
              <div className="input-icon-wrap">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>
            </label>
            <button
              className="primary-action"
              type="submit"
              disabled={authLoading}
            >
              {authLoading ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <KeyRound size={18} />
              )}
              Gửi mã xác nhận
            </button>
            <button
              type="button"
              className="ghost-action"
              style={{ justifyContent: "center" }}
              onClick={() => {
                setAuthMode("login");
                clearMsg();
              }}
            >
              ← Quay lại đăng nhập
            </button>
          </form>
        )}

        {/* ── ĐẶT MẬT KHẨU MỚI ── */}
        {authMode === "reset" && (
          <form className="form-stack" onSubmit={handleResetPassword}>
            <p
              style={{
                fontSize: 13,
                color: "var(--admin-text-muted)",
                margin: 0,
              }}
            >
              Mã OTP đã được gửi (15 phút). Nhập vào đây để đặt mật khẩu mới.
            </p>
            <label>
              Mã OTP (6 chữ số)
              <div className="input-icon-wrap">
                <KeyRound size={16} className="input-icon" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={resetForm.otp}
                  onChange={(e) =>
                    setResetForm({ ...resetForm, otp: e.target.value })
                  }
                  required
                />
              </div>
            </label>
            <label>
              Mật khẩu mới
              <div className="input-icon-wrap">
                <Lock size={16} className="input-icon" />
                <input
                  type={showNewPass ? "text" : "password"}
                  placeholder="Tối thiểu 6 ký tự"
                  value={resetForm.newPassword}
                  onChange={(e) =>
                    setResetForm({ ...resetForm, newPassword: e.target.value })
                  }
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setShowNewPass(!showNewPass)}
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <button
              className="primary-action"
              type="submit"
              disabled={authLoading}
            >
              {authLoading ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <KeyRound size={18} />
              )}
              Đặt lại mật khẩu
            </button>
            <button
              type="button"
              className="ghost-action"
              style={{ justifyContent: "center" }}
              onClick={() => {
                setAuthMode("forgot");
                clearMsg();
              }}
            >
              ← Gửi lại mã OTP
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
