import React from "react";

export default function ReminderModal({
  reminderTime,
  setReminderTime,
  onClose,
  onSave,
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Đặt nhắc nhở</span>
          <button className="icon-btn" onClick={onClose}>
            ✖
          </button>
        </div>
        <div className="modal-body">
          <label style={{ fontSize: 13, color: "#5f6368" }}>
            Chọn ngày và giờ:
          </label>
          <input
            type="datetime-local"
            className="modal-input"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
          />
        </div>
        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>
            Hủy
          </button>
          <button className="btn-share" onClick={onSave}>
            Đặt nhắc nhở
          </button>
        </div>
      </div>
    </div>
  );
}
