import React, { useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { NOTE_COLORS } from "../constants/noteColors.js";

const colorList = [
  "#000000",
  "#e60000",
  "#ff9900",
  "#ffff00",
  "#008a00",
  "#0066cc",
  "#9933ff",
  "#ffffff",
  "#facccc",
  "#ffebcc",
  "#ffffcc",
  "#cce8cc",
  "#cce0f5",
  "#ebd6ff",
  "#bbbbbb",
  "#f06666",
  "#ffc266",
  "#ffff66",
  "#66b966",
  "#66a3e0",
  "#c285ff",
];

// Dùng toolbar array thay vì container:"#id"
// Quill tự render toolbar vào trong .ql-container — picker hoạt động đúng
// (container:"#id" bị clip bởi overflow:hidden của parent)
const modules = {
  toolbar: {
    container: [
      [{ header: [1, 2, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: colorList }, { background: colorList }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      ["clean"],
    ],
  },
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "list",
  "bullet",
  "align",
];

const getLocalDateTimeString = () => {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
};

export default function NoteComposer({
  view,
  composerOpen,
  setComposerOpen,
  newTitle,
  setNewTitle,
  newContent,
  setNewContent,
  newDueTime,
  setNewDueTime,
  newColor,
  setNewColor,
  createNote,
  remind_time, // 🛠️ ĐÃ THÊM: Nhận lịch từ DB đổ về
}) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [showDuePicker, setShowDuePicker] = useState(false);

  if (view !== "notes") return null;
  const color = newColor || "#ffffff";

  const handleCancel = () => {
    setNewTitle("");
    setNewContent("");
    setNewDueTime("");
    setShowDuePicker(false);
    if (setNewColor) setNewColor("#ffffff");
    setComposerOpen(false);
  };

  return (
    <div className="composer-wrapper">
      <style>{`.ql-snow .ql-picker.ql-color-picker .ql-picker-options { z-index: 9999 !important; pointer-events: auto !important; }`}</style>
      {!composerOpen ? (
        <div
          className="composer-collapsed"
          onClick={() => setComposerOpen(true)}
        >
          <span>
            {newContent ? newContent.replace(/<[^>]*>/g, "") : "Ghi chú..."}
          </span>
        </div>
      ) : (
        <div className="composer-expanded" style={{ backgroundColor: color }}>
          <input
            className="composer-title"
            placeholder="Tiêu đề"
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />

          {/* Toolbar do Quill tự render bên trong — không cần custom HTML */}

          <div className="composer-body" style={{ display: "block" }}>
            <div className="quill-wrapper-direct" style={{ color: "initial" }}>
              <ReactQuill
                theme="snow"
                value={newContent}
                onChange={setNewContent}
                placeholder="Ghi chú..."
                modules={modules}
                formats={formats}
              />
            </div>

            {/* Do Picker */}
            {showDuePicker ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 0",
                  borderTop: "1px solid var(--border)",
                  marginTop: 4,
                }}
              >
                <img
                  src="/images/timer.png"
                  alt="Lịch"
                  style={{
                    width: 16,
                    height: 16,
                    objectFit: "contain",
                    opacity: 0.6,
                  }}
                />
                <input
                  type="datetime-local"
                  className="modal-input"
                  style={{
                    fontSize: 13,
                    padding: "4px 8px",
                    flex: 1,
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                  value={newDueTime}
                  min={getLocalDateTimeString()}
                  onChange={(e) => setNewDueTime(e.target.value)}
                  autoFocus
                />
                <button
                  className="icon-btn"
                  style={{
                    fontSize: 12,
                    color: "#d32f2f",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setNewDueTime("");
                    setShowDuePicker(false);
                  }}
                >
                  ✕ Hủy
                </button>
              </div>
            ) : (
              // 🛠️ ĐÃ FIX: Đọc mượt mà cả lịch mới chọn hoặc lịch từ DB đổ về
              (newDueTime || remind_time) && (
                <div
                  title="Bấm để sửa lịch hẹn"
                  onClick={() => setShowDuePicker(true)}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 0",
                    fontSize: 13,
                    color: "#1a73e8",
                    borderTop: "1px solid var(--border)",
                    marginTop: 4,
                  }}
                >
                  📅 Lịch hẹn:{" "}
                  {new Date(newDueTime || remind_time).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  <button
                    className="icon-btn"
                    style={{
                      fontSize: 11,
                      marginLeft: "auto",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewDueTime("");
                    }}
                  >
                    ✕
                  </button>
                </div>
              )
            )}
          </div>

          {/* Actions */}
          <div className="composer-actions">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className="card-btn"
                title="Đặt lịch hẹn"
                onClick={() => setShowDuePicker((v) => !v)}
                style={{
                  color: newDueTime || remind_time ? "#1a73e8" : undefined,
                }}
              >
                <img
                  src="/images/timer.png"
                  alt="Lịch"
                  style={{
                    width: 18,
                    height: 18,
                    objectFit: "contain",
                    filter:
                      newDueTime || remind_time
                        ? "invert(30%) sepia(100%) saturate(500%) hue-rotate(200deg)"
                        : undefined,
                  }}
                />
              </button>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className="card-btn"
                  title="Chọn màu"
                  onClick={() => setColorPickerOpen((v) => !v)}
                >
                  <img
                    src="/images/palette.png"
                    alt="Màu"
                    style={{ width: 18, height: 18, objectFit: "contain" }}
                  />
                </button>
                {colorPickerOpen && (
                  <div className="color-picker-popup">
                    {NOTE_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        title={c.name}
                        className={`color-dot ${color === c.value ? "selected" : ""}`}
                        style={{ backgroundColor: c.value }}
                        onClick={() => {
                          if (setNewColor) setNewColor(c.value);
                          setColorPickerOpen(false);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <button
                className="close-btn"
                style={{ background: "#f1f3f4", color: "#5f6368" }}
                onClick={handleCancel}
              >
                Hủy
              </button>
              <button className="btn-share" onClick={createNote}>
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
