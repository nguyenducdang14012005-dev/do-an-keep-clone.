import { useState } from "react";
import { changePassword } from "../services/authService";

export default function ChangePasswordModal({ onClose }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setSuccess("Đổi mật khẩu thành công!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Đổi mật khẩu thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Đổi mật khẩu</span>
          <button className="icon-btn" onClick={onClose}>
            ✖
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <label style={{ fontSize: 13, color: "#5f6368" }}>
            Mật khẩu hiện tại
          </label>
          <input
            type="password"
            className="modal-input"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />

          <label style={{ fontSize: 13, color: "#5f6368", marginTop: 10 }}>
            Mật khẩu mới
          </label>
          <input
            type="password"
            className="modal-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            maxLength={72}
            required
          />

          <label style={{ fontSize: 13, color: "#5f6368", marginTop: 10 }}>
            Xác nhận mật khẩu mới
          </label>
          <input
            type="password"
            className="modal-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            maxLength={72}
            required
          />

          {error && (
            <p style={{ color: "#d64545", fontSize: 13, marginTop: 10 }}>
              {error}
            </p>
          )}
          {success && (
            <p style={{ color: "#1aa260", fontSize: 13, marginTop: 10 }}>
              {success}
            </p>
          )}
        </form>

        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>
            Đóng
          </button>
          <button className="btn-share" onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
          </button>
        </div>
      </div>
    </div>
  );
}
