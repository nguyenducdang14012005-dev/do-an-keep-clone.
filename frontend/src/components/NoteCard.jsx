import React, { useState, useEffect } from "react";
import { getLabelColor } from "../constants/noteColors.js";
import checklistService from "../services/checklistService.js";

// ─── Hiển thị tóm tắt checklist trên card (lazy load) ─────────────────────────
function ChecklistSummary({ noteId }) {
  const [summary, setSummary] = useState(null); // null = chưa load, { done, total } = đã load

  useEffect(() => {
    let cancelled = false;
    checklistService
      .getChecklist(noteId)
      .then((items) => {
        if (cancelled || !Array.isArray(items) || items.length === 0) return;
        const done = items.filter((i) => i.is_completed).length;
        setSummary({ done, total: items.length });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  if (!summary) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginTop: 6,
        fontSize: 12,
        color: "#5f6368",
        fontWeight: 500,
      }}
    >
      <div
        style={{
          flex: 1,
          height: 4,
          borderRadius: 2,
          background: "rgba(0,0,0,0.1)",
          overflow: "hidden",
          maxWidth: 80,
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 2,
            background:
              summary.done === summary.total && summary.total > 0
                ? "#34a853"
                : "var(--primary, #6c63ff)",
            width: `${summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0}%`,
          }}
        />
      </div>
      <span>
        ☑ {summary.done}/{summary.total}
      </span>
    </div>
  );
}

export default function NoteCard({
  note,
  onPin,
  onStatus,
  onReminder,
  onShare,
  onLabel,
  onViewDetails,
}) {
  const [hovered, setHovered] = useState(false);
  const bg =
    note.color && note.color !== "#FFFFFF" && note.color !== "#ffffff"
      ? note.color
      : "#fff";

  // Kiểm tra xem ghi chú này có đang nằm trong Thùng rác (Deleted) hay không
  const isDeleted = note.status === "Deleted";

  return (
    <div
      className="note-card"
      data-status={note.status} // Hỗ trợ CSS nhận diện nét đứt cho ghi chú Archived
      style={{ backgroundColor: bg }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onViewDetails && onViewDetails(note)} // Gọi modal xem chi tiết
    >
      {note.is_pinned && !isDeleted && <div className="pin-badge">📌</div>}

      {note.title && (
        <div
          className="note-title"
          dangerouslySetInnerHTML={{ __html: note.title }}
        />
      )}

      <div
        className="note-content"
        dangerouslySetInnerHTML={{ __html: note.content }}
      />

      {/* ── Tóm tắt checklist: chỉ hiển thị nếu ghi chú có items ── */}
      <ChecklistSummary noteId={note.note_id} />

      {/* 1. Khu vực hiển thị Hạn Chót */}
      {note.due_time && (
        <div className="note-due-time">
          ⏰ Hạn chót:{" "}
          {new Date(note.due_time).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}

      {/* ⚡ Badge nhắc nhở — hiện khi note có reminder, dùng remind_time từ JOIN */}
      {note.remind_time && (
        <div
          className="note-reminder-badge"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "rgba(26, 115, 232, 0.1)",
            padding: "4px 8px",
            borderRadius: "12px",
            fontSize: "12px",
            color: "#1a73e8",
            marginTop: "6px",
            width: "fit-content",
            fontWeight: "500",
            border: "1px solid rgba(26, 115, 232, 0.2)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          🔔{" "}
          {new Date(new Date(note.remind_time).getTime()).toLocaleString(
            "vi-VN",
            {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            },
          )}
        </div>
      )}

      {/* 3. Khu vực hiển thị Nhãn danh mục */}
      {note.labels && note.labels.length > 0 && (
        <div className="label-list" style={{ marginTop: "8px" }}>
          {note.labels.map((l) => {
            const lc = getLabelColor(l.label_id);
            return (
              <span
                key={l.label_id}
                className="label-badge"
                style={{
                  backgroundColor: lc.bg,
                  border: `1px solid ${lc.border}`,
                  color: lc.text,
                }}
              >
                <img
                  src="/images/label.png"
                  alt="Nhãn"
                  style={{
                    width: "18px",
                    height: "18px",
                    objectFit: "contain",
                  }}
                />{" "}
                {l.label_name}
              </span>
            );
          })}
        </div>
      )}

      {/* 4. Thanh tác vụ khi hover chuột */}
      {hovered && (
        <div className="card-actions">
          {isDeleted ? (
            /* ⚡ CHỈ HIỆN 2 NÚT NÀY KHI Ở TRONG THÙNG RÁC */
            <>
              <button
                className="card-btn"
                title="Khôi phục ghi chú"
                onClick={(e) => {
                  e.stopPropagation();
                  const confirmed = window.confirm(
                    "Bạn có chắc chắn muốn khôi phục ghi chú này không ?",
                  );

                  if (!confirmed) return;
                  onStatus(note.note_id, "Active");
                }}
              >
                <img
                  src="/images/history.png"
                  alt="Khôi phục"
                  style={{
                    width: "18px",
                    height: "18px",
                    objectFit: "contain",
                  }}
                />
                Khôi phục
              </button>
              <button
                className="card-btn"
                title="Xóa vĩnh viễn"
                onClick={(e) => {
                  e.stopPropagation();
                  const confirmed = window.confirm(
                    "Bạn có chắc chắn muốn xóa vĩnh viễn ghi chú này không? Hành động này không thể hoàn tác.",
                  );

                  if (!confirmed) return;
                  onStatus(note.note_id, "PermanentlyDeleted");
                }}
                style={{ color: "var(--accent)" }}
              >
                <img
                  src="/images/trash.png"
                  alt="Xóa vĩnh viễn"
                  style={{
                    width: "18px",
                    height: "18px",
                    objectFit: "contain",
                  }}
                />{" "}
                Xóa vĩnh viễn
              </button>
            </>
          ) : (
            /* ⚡ HIỆN ĐẦY ĐỦ CÁC NÚT KHI Ở TRẠNG THÁI BÌNH THƯỜNG */
            <>
              <button
                className="card-btn"
                title={note.is_pinned ? "Bỏ ghim" : "Ghim"}
                onClick={(e) => {
                  e.stopPropagation();
                  onPin(note.note_id);
                }}
              >
                <img
                  src="/images/pin.png"
                  alt="Ghim"
                  style={{
                    width: "18px",
                    height: "18px",
                    objectFit: "contain",
                  }}
                />
              </button>
              <button
                className="card-btn"
                title="Nhắc nhở"
                onClick={(e) => {
                  e.stopPropagation();
                  onReminder(note.note_id);
                }}
              >
                <img
                  src="/images/timer.png"
                  alt="Thông báo"
                  style={{
                    width: "18px",
                    height: "18px",
                    objectFit: "contain",
                  }}
                />
              </button>
              <button
                className="card-btn"
                title="Gán nhãn"
                onClick={(e) => {
                  e.stopPropagation();
                  onLabel(note.note_id, note.labels || []);
                }}
              >
                <img
                  src="/images/label.png"
                  alt="Gắn nhãn"
                  style={{
                    width: "18px",
                    height: "18px",
                    objectFit: "contain",
                  }}
                />
              </button>
              <button
                className="card-btn"
                title="Chia sẻ"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(note.note_id);
                }}
              >
                <img
                  src="/images/share (1).png"
                  alt="Chia sẻ"
                  style={{
                    width: "18px",
                    height: "18px",
                    objectFit: "contain",
                  }}
                />
              </button>
              <button
                className="card-btn"
                title={note.status === "Archived" ? "Hủy lưu trữ" : "Lưu trữ"}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatus(
                    note.note_id,
                    note.status === "Archived" ? "Active" : "Archived",
                  );
                }}
              >
                <img
                  src="/images/archive.png"
                  alt="Lưu trữ"
                  style={{
                    width: "18px",
                    height: "18px",
                    objectFit: "contain",
                  }}
                />
              </button>
              <button
                className="card-btn"
                title="Xóa"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatus(note.note_id, "Deleted");
                }}
              >
                <img
                  src="/images/trash.png"
                  alt="Xóa"
                  style={{
                    width: "18px",
                    height: "18px",
                    objectFit: "contain",
                  }}
                />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
