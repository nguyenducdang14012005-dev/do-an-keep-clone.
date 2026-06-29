import { useState } from "react";
import { Bell, Check, Clock } from "lucide-react";

export default function ReminderPopup({ reminders, onConfirm, onReschedule }) {
  const [rescheduleId, setRescheduleId] = useState(null);
  const [newTime, setNewTime] = useState("");

  const handleReschedule = (id) => {
    if (!newTime) return;
    if (new Date(newTime) <= new Date()) {
      alert("Vui lòng chọn thời gian trong tương lai!");
      return;
    }
    onReschedule(id, newTime);
    setRescheduleId(null);
    setNewTime("");
  };

  if (!reminders || reminders.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        left: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        zIndex: 99999,
      }}
    >
      {reminders.slice(0, 3).map((r) => (
        <div
          key={r.reminder_id}
          style={{
            width: "320px",
            background: "white",
            borderRadius: "14px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            overflow: "hidden",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#6c63ff",
              color: "white",
              padding: "10px 14px",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            <Bell size={18} /> <span>Nhắc nhở</span>
          </div>

          {/* Body */}
          <div
            style={{
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 700,
                margin: 0,
                color: "#1e1e2e",
              }}
            >
              {r.title || "Không có tiêu đề"}
            </h3>
            <div
              style={{
                fontSize: "13px",
                color: "#4a4a6a",
                maxHeight: "120px",
                overflowY: "auto",
                lineHeight: 1.5,
              }}
              dangerouslySetInnerHTML={{ __html: r.content || "" }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                color: "#6e7191",
              }}
            >
              <Clock size={13} />
              {new Date(
                r.remind_time.endsWith("Z")
                  ? r.remind_time
                  : r.remind_time + "Z",
              ).toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>

          {/* Đặt lại giờ */}
          {rescheduleId === r.reminder_id && (
            <div
              style={{
                padding: "10px 14px",
                background: "#f8f9fa",
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <input
                type="datetime-local"
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
                value={newTime}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => setNewTime(e.target.value)}
              />
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "flex-end",
                  marginTop: "8px",
                }}
              >
                <button
                  onClick={() => {
                    setRescheduleId(null);
                    setNewTime("");
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "1px solid #e0e0e0",
                    background: "white",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleReschedule(r.reminder_id)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#6c63ff",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Lưu
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              padding: "10px 14px",
              borderTop: "1px solid #f0f0f0",
            }}
          >
            <button
              onClick={() => onConfirm(r.reminder_id)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                background: "#1aa260",
                color: "white",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Check size={15} /> Xác nhận
            </button>
            <button
              onClick={() => setRescheduleId(r.reminder_id)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                background: "#6c63ff",
                color: "white",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Bell size={15} /> Đặt lại giờ
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
