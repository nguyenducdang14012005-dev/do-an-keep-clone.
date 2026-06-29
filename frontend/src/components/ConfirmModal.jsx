import React from "react";

// ⚡ Modal xác nhận chung, dùng cho các hành động "nguy hiểm" cần người dùng
// bấm xác nhận trước khi thực hiện (ví dụ: xóa nhãn khỏi ghi chú).
export default function ConfirmModal({
  title = "Xác nhận",
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  onConfirm,
  onCancel,
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{title}</span>
          <button className="icon-btn" onClick={onCancel}>
            ✖
          </button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="close-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="btn-share" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
