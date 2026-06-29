import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { NOTE_COLORS, getLabelColor } from "../constants/noteColors.js";

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

// toolbar array — Quill tự render toolbar vào trong .ql-container
// tránh bị clip bởi overflow:hidden của .note-edit-modal
const toolbarOptions = [
  [{ header: [1, 2, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ color: colorList }, { background: colorList }],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ align: [] }],
  ["clean"],
];

export default function NoteEditModal({
  note,
  onClose,
  onPin,
  onReminder,
  onShare,
  onLabel,
}) {
  const [title, setTitle] = useState(note.title || "");
  const [content, setContent] = useState(note.content || "");
  const [color, setColor] = useState(note.color || "#ffffff");
  const [dueTime, setDueTime] = useState(
    note.due_time ? note.due_time.slice(0, 16) : "",
  );
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const dirtyRef = useRef(false);

  const [datePickerPos, setDatePickerPos] = useState({ top: 0, left: 0 });
  const [colorPickerPos, setColorPickerPos] = useState({ top: 0, left: 0 });
  const dateTriggerRef = useRef(null);
  const colorTriggerRef = useRef(null);

  const openDatePicker = () => {
    const rect = dateTriggerRef.current?.getBoundingClientRect();
    if (rect) {
      setDatePickerPos({ top: rect.bottom + 6, left: rect.left });
    }
    setDatePickerOpen(true);
  };

  const openColorPicker = () => {
    const rect = colorTriggerRef.current?.getBoundingClientRect();
    if (rect) {
      const popupHeight = 210;
      const top =
        rect.top - popupHeight > 0
          ? rect.top - popupHeight - 8
          : rect.bottom + 8;
      setColorPickerPos({ top, left: rect.left });
    }
    setColorPickerOpen((v) => !v);
  };

  const toolbarId = useRef(`ql-toolbar-modal-${note.note_id}`).current;

  const isDeleted = note.status === "Deleted";
  const isArchived = note.status === "Archived";

  const isReadOnly = note.permission === "view";
  const isSharedUser = note.permission !== undefined; // KIỂM TRA NGƯỜI ĐƯỢC CHIA SẺ

  // modules dùng toolbar array — stable, không tạo lại mỗi render
  const modules = React.useMemo(
    () => ({
      toolbar: isReadOnly ? false : { container: toolbarOptions },
    }),
    [isReadOnly],
  );

  const markDirty = () => {
    dirtyRef.current = true;
  };

  const buildPayload = () => ({
    title,
    content,
    color,
    due_time: dueTime || null,
  });

  const handleClose = () => {
    if (!isReadOnly && dirtyRef.current) onClose(buildPayload());
    else onClose(null);
  };

  const handleStatusClick = (status) => {
    if (!isReadOnly && dirtyRef.current) onClose(buildPayload(), status);
    else onClose(null, status);
  };

  // 👑 TRẢ VỀ FORM GỐC NGUYÊN BẢN 100% CHO CẢ ĐÔI BÊN (CHỈ KHÁC BIỆT LOGIC BÊN TRONG)
  return (
    <div className="modal-overlay note-edit-overlay" onClick={handleClose}>
      <div
        className="note-edit-modal"
        style={{ backgroundColor: color }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header: Giữ nguyên form gốc (Ẩn nút ghim nếu là người được chia sẻ) ─────────────────────────── */}
        {/* ⚡ SỬA LẠI KHỐI ĐOẠN ĐẦU TRONG NOTEEDITMODAL.JSX */}
        <div className="note-edit-header">
          <input
            className="note-edit-title"
            placeholder="Tiêu đề"
            value={title}
            // ⚡ ĐÃ SỬA: Bỏ điều kiện || isSharedUser đi để mở khóa tiêu đề cho người nhận quyền sửa/toàn quyền
            disabled={isReadOnly}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
          />
          {!isDeleted && !isReadOnly && !isSharedUser && (
            <button
              className="icon-btn"
              title={note.is_pinned ? "Bỏ ghim" : "Ghim"}
              onClick={() => onPin(note.note_id)}
            >
              <img
                src="/images/pin.png"
                alt="Ghim"
                style={{ width: 18, height: 18, objectFit: "contain" }}
              />
            </button>
          )}
          <button className="icon-btn" title="Đóng" onClick={handleClose}>
            ✖
          </button>
        </div>

        {/* Toolbar do Quill tự render bên trong .note-edit-body */}

        {/* ── Body: Form gốc soạn thảo văn bản ── */}
        <div className="note-edit-body">
          <ReactQuill
            theme="snow"
            value={content}
            readOnly={isReadOnly}
            onChange={(val) => {
              // ⚡ LUẬT CHO NGƯỜI ĐƯỢC CHIA SẺ: Chỉ được thêm nội dung, chặn xóa nội dung cũ
              if (isSharedUser) {
                const cleanOld = (note.content || "")
                  .replace(/<[^>]*>/g, "")
                  .trim();
                const cleanNew = val.replace(/<[^>]*>/g, "").trim();

                if (cleanNew.length < cleanOld.length) {
                  return;
                }
              }

              setContent(val);
              markDirty();
            }}
            placeholder="Ghi chú..."
            modules={modules}
            formats={formats}
          />

          {/* Hạn chót: Chỉ hiển thị và quản lý đối với Chủ sở hữu (Owner) */}
          {!isSharedUser && (
            <>
              {note.due_time && !dueTime && !datePickerOpen && !isReadOnly && (
                <div
                  ref={dateTriggerRef}
                  className="note-due-time"
                  style={{ cursor: "pointer", marginLeft: 4 }}
                  onClick={openDatePicker}
                >
                  <img
                    src="/images/timer.png"
                    alt="Thông báo"
                    style={{ width: 18, height: 18, objectFit: "contain" }}
                  />{" "}
                  {new Date(note.due_time).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
              {dueTime && !datePickerOpen && (
                <div
                  ref={dateTriggerRef}
                  className="note-due-time"
                  style={{
                    cursor: isReadOnly ? "default" : "pointer",
                    marginLeft: 4,
                  }}
                  onClick={() => !isReadOnly && openDatePicker()}
                >
                  <img
                    src="/images/timer.png"
                    alt="Thông báo"
                    style={{ width: 18, height: 18, objectFit: "contain" }}
                  />{" "}
                  {new Date(dueTime).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
              {!note.due_time && !dueTime && !datePickerOpen && !isReadOnly && (
                <button
                  ref={dateTriggerRef}
                  className="card-btn"
                  style={{
                    marginLeft: 4,
                    marginBottom: 4,
                    fontSize: "0.82rem",
                    color: "#5f6368",
                  }}
                  title="Thêm hạn chót"
                  onClick={openDatePicker}
                >
                  + Thêm hạn chót
                </button>
              )}
            </>
          )}

          {datePickerOpen &&
            !isReadOnly &&
            !isSharedUser &&
            createPortal(
              <div
                className="date-picker-popup"
                style={{ top: datePickerPos.top, left: datePickerPos.left }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="date-picker-header">
                  <span>← Chọn ngày và giờ</span>
                </div>
                <div className="date-picker-body">
                  <input
                    type="date"
                    className="date-input"
                    value={dueTime.split("T")[0] || ""}
                    onChange={(e) =>
                      setDueTime(
                        e.target.value +
                          "T" +
                          (dueTime.split("T")[1] || "00:00"),
                      )
                    }
                  />
                  <input
                    type="time"
                    className="time-input"
                    value={dueTime.split("T")[1] || ""}
                    onChange={(e) =>
                      setDueTime(
                        (dueTime.split("T")[0] || "") + "T" + e.target.value,
                      )
                    }
                  />
                </div>
                <div className="date-picker-footer">
                  <button
                    className="close-btn"
                    onClick={() => {
                      setDueTime("");
                      setDatePickerOpen(false);
                      markDirty();
                    }}
                  >
                    Xóa
                  </button>
                  <button
                    className="btn-share"
                    onClick={() => {
                      setDatePickerOpen(false);
                      markDirty();
                    }}
                  >
                    Lưu
                  </button>
                </div>
              </div>,
              document.body,
            )}
        </div>

        {/* ── Footer: Giữ nguyên form các nút bấm ── */}
        <div className="note-edit-footer">
          <div
            style={{
              display: "flex",
              gap: 4,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {!isReadOnly && (
              <>
                {/* 👑 ĐÃ SỬA: Đưa ô đổi màu nền ra ngoài điều kiện !isSharedUser để CHỦ SỞ HỮU dùng được bình thường */}
                <div style={{ position: "relative" }}>
                  <button
                    ref={colorTriggerRef}
                    className="icon-btn"
                    title="Đổi màu"
                    onClick={openColorPicker}
                  >
                    <img
                      src="/images/palette.png"
                      alt="Màu"
                      style={{ width: 18, height: 18, objectFit: "contain" }}
                    />
                  </button>
                  {colorPickerOpen &&
                    createPortal(
                      <div
                        className="color-picker-popup"
                        style={{
                          top: colorPickerPos.top,
                          left: colorPickerPos.left,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {NOTE_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            title={c.name}
                            className={`color-dot ${color === c.value ? "selected" : ""}`}
                            style={{ backgroundColor: c.value }}
                            onClick={() => {
                              setColor(c.value);
                              markDirty();
                              setColorPickerOpen(false);
                            }}
                          />
                        ))}
                      </div>,
                      document.body,
                    )}
                </div>

                {/* Các chức năng Nhắc nhở, Chia sẻ, Gắn nhãn này vẫn ẩn đối với người được chia sẻ */}
                {!isSharedUser && (
                  <>
                    {/* Nhắc nhở */}
                    <button
                      className="icon-btn"
                      title="Đặt nhắc nhở"
                      onClick={() => onReminder && onReminder(note.note_id)}
                    >
                      <img
                        src="/images/bell.png"
                        alt="Nhắc nhở"
                        style={{ width: 18, height: 18, objectFit: "contain" }}
                      />
                    </button>
                    {/* Chia sẻ */}
                    <button
                      className="icon-btn"
                      title="Chia sẻ"
                      onClick={() => onShare && onShare(note.note_id)}
                    >
                      <img
                        src="/images/share.png"
                        alt="Chia sẻ"
                        style={{ width: 18, height: 18, objectFit: "contain" }}
                      />
                    </button>
                    {/* Nhãn */}
                    <button
                      className="icon-btn"
                      title="Gắn nhãn"
                      onClick={() =>
                        onLabel && onLabel(note.note_id, note.labels || [])
                      }
                    >
                      <img
                        src="/images/label.png"
                        alt="Nhãn"
                        style={{ width: 18, height: 18, objectFit: "contain" }}
                      />
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Nút trạng thái cuối form */}
          <div style={{ display: "flex", gap: 6 }}>
            {!isReadOnly && !isSharedUser && (
              <>
                {isDeleted ? (
                  <>
                    <button
                      className="card-btn"
                      onClick={() => handleStatusClick("Active")}
                    >
                      <img
                        src="/images/reload.png"
                        alt="Nhãn"
                        style={{ width: 18, height: 18, objectFit: "contain" }}
                      />{" "}
                      Khôi phục
                    </button>
                    <button
                      className="card-btn"
                      style={{ color: "#d32f2f" }}
                      onClick={() => handleStatusClick("PermanentlyDeleted")}
                    >
                      <img
                        src="/images/trash.png"
                        alt="Nhãn"
                        style={{ width: 18, height: 18, objectFit: "contain" }}
                      />{" "}
                      Xóa vĩnh viễn
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="card-btn"
                      onClick={() =>
                        handleStatusClick(isArchived ? "Active" : "Archived")
                      }
                    >
                      <img
                        src="/images/archive.png"
                        alt="Nhãn"
                        style={{
                          width: 18,
                          height: 18,
                          objectFit: "contain",
                        }}
                      />{" "}
                      {isArchived ? "Bỏ lưu trữ" : "Lưu trữ"}
                    </button>
                    <button
                      className="card-btn"
                      onClick={() => setDeleteConfirmOpen(true)}
                    >
                      <img
                        src="/images/trash.png"
                        alt="Nhãn"
                        style={{ width: 18, height: 18, objectFit: "contain" }}
                      />
                      Xóa
                    </button>
                  </>
                )}
              </>
            )}
            <button className="close-btn" onClick={handleClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Xác nhận xóa */}
      {deleteConfirmOpen &&
        !isSharedUser &&
        createPortal(
          <div
            className="modal-overlay"
            style={{ zIndex: 700 }}
            onClick={() => setDeleteConfirmOpen(false)}
          >
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <span>Xóa ghi chú</span>
                <button
                  className="icon-btn"
                  onClick={() => setDeleteConfirmOpen(false)}
                >
                  ✖
                </button>
              </div>
              <div className="modal-body">
                <p style={{ margin: 0 }}>
                  Bạn có chắc muốn xóa ghi chú này không?
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="close-btn"
                  onClick={() => setDeleteConfirmOpen(false)}
                >
                  Hủy
                </button>
                <button
                  className="btn-share"
                  style={{ background: "#d64545" }}
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    handleStatusClick("Deleted");
                  }}
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
