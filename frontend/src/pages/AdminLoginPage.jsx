import { useState } from "react";
import { Lock, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { api, getApiError } from "../api";

const emptyLoginForm = {
  email: "",
  password: "",
  device_name: "Chrome on Windows",
};

const emptyRegisterForm = {
  full_name: "",
  email: "",
  password: "",
};

export default function AdminLoginPage({ onLoginSuccess }) {
  const [authMode, setAuthMode] = useState("login");
  const [loginForm, setLoginForm] = useState(emptyLoginForm);
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [message, setMessage] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setMessage(null);
    try {
      const response = await api.post("/auth/login", loginForm);
      const data = response.data.data;
      if (!data.user?.roles?.includes("Admin")) {
        setMessage({ type: "error", text: "Tài khoản không có quyền Admin." });
        return;
      }
      onLoginSuccess(data.token, data.user);
    } catch (error) {
      setMessage({ type: "error", text: getApiError(error) });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setMessage(null);
    try {
      await api.post("/auth/register", registerForm);
      setRegisterForm(emptyRegisterForm);
      setAuthMode("login");
      setMessage({
        type: "success",
        text: "Tạo tài khoản thành công, có thể đăng nhập.",
      });
    } catch (error) {
      setMessage({ type: "error", text: getApiError(error) });
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="brand-mark">
          <ShieldCheck size={30} aria-hidden="true" />
          <div>
            <span>Google Keep Clone</span>
            <strong>Admin Security</strong>
          </div>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Chọn biểu mẫu">
          <button
            className={authMode === "login" ? "active" : ""}
            type="button"
            onClick={() => setAuthMode("login")}
          >
            <Lock size={18} aria-hidden="true" />
            Đăng nhập
          </button>
          <button
            className={authMode === "register" ? "active" : ""}
            type="button"
            onClick={() => setAuthMode("register")}
          >
            <UserPlus size={18} aria-hidden="true" />
            Đăng ký
          </button>
        </div>

        <h1 id="auth-title">
          {authMode === "login" ? "Đăng nhập Admin" : "Tạo tài khoản mới"}
        </h1>

        {message && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}

        {authMode === "login" ? (
          <form className="form-stack" onSubmit={handleLogin}>
            <label>
              Email
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, email: e.target.value })
                }
                required
              />
            </label>
            <label>
              Mật khẩu
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                required
              />
            </label>
            <label>
              Thiết bị
              <input
                value={loginForm.device_name}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, device_name: e.target.value })
                }
              />
            </label>
            <button
              className="primary-action"
              type="submit"
              disabled={authLoading}
            >
              {authLoading ? (
                <Loader2 className="spin" size={18} aria-hidden="true" />
              ) : (
                <Lock size={18} aria-hidden="true" />
              )}
              Đăng nhập
            </button>
          </form>
        ) : (
          <form className="form-stack" onSubmit={handleRegister}>
            <label>
              Họ tên
              <input
                value={registerForm.full_name}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    full_name: e.target.value,
                  })
                }
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={registerForm.email}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, email: e.target.value })
                }
                required
              />
            </label>
            <label>
              Mật khẩu
              <input
                type="password"
                value={registerForm.password}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, password: e.target.value })
                }
                minLength={8}
                maxLength={72}
                required
              />
            </label>
            <button
              className="primary-action"
              type="submit"
              disabled={authLoading}
            >
              {authLoading ? (
                <Loader2 className="spin" size={18} aria-hidden="true" />
              ) : (
                <UserPlus size={18} aria-hidden="true" />
              )}
              Đăng ký
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
