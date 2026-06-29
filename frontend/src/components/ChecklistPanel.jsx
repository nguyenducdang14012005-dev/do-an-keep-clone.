// ChecklistPanel.jsx
// Component hiển thị và quản lý checklist trong NoteEditModal.
// - Tự động tải checklist khi mount.
// - Hỗ trợ thêm, sửa, xóa, đánh dấu hoàn thành, kéo-thả sắp xếp.
// - Nếu ghi chú không có item nào: hiển thị nút "+ Thêm checklist".
// - Tương thích với chế độ readOnly (chỉ xem).

import React, { useState, useEffect, useRef, useCallback } from "react";
import checklistService from "../services/checklistService.js";

// ─── Styles nội tuyến để không làm ảnh hưởng CSS hiện tại ─────────────────────
const styles = {
  wrapper: {
    marginTop: 8,
    marginBottom: 4,
    borderTop: "1px solid rgba(0,0,0,0.08)",
    paddingTop: 8,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#5f6368",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  progress: {
    fontSize: 11,
    color: "#5f6368",
    fontWeight: 500,
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
    background: "rgba(0,0,0,0.1)",
    marginBottom: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    background: "var(--primary, #6c63ff)",
    transition: "width 0.3s ease",
  },
  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 0",
    borderRadius: 6,
    cursor: "default",
  },
  dragHandle: {
    cursor: "grab",
    color: "#bbb",
    fontSize: 14,
    padding: "0 2px",
    userSelect: "none",
    flexShrink: 0,
  },
  checkbox: {
    width: 16,
    height: 16,
    flexShrink: 0,
    cursor: "pointer",
    accentColor: "var(--primary, #6c63ff)",
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: "var(--text-primary, #1e1e2e)",
    lineHeight: 1.4,
    wordBreak: "break-word",
    background: "transparent",
    border: "none",
    outline: "none",
    padding: "2px 4px",
    borderRadius: 4,
    fontFamily: "inherit",
    resize: "none",
    overflow: "hidden",
  },
  itemTextCompleted: {
    textDecoration: "line-through",
    color: "#9aa0a6",
  },
  itemTextEdit: {
    background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(108,99,255,0.3)",
  },
  deleteBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#bbb",
    fontSize: 16,
    padding: "0 2px",
    borderRadius: 4,
    lineHeight: 1,
    flexShrink: 0,
    transition: "color 0.15s",
  },
  addRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  addInput: {
    flex: 1,
    fontSize: 14,
    color: "var(--text-primary, #1e1e2e)",
    background: "transparent",
    border: "none",
    borderBottom: "1px dashed rgba(0,0,0,0.2)",
    outline: "none",
    padding: "2px 4px",
    fontFamily: "inherit",
  },
  addBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--primary, #6c63ff)",
    fontSize: 20,
    lineHeight: 1,
    padding: "0 2px",
    borderRadius: 4,
    fontWeight: 700,
  },
  triggerBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    color: "#5f6368",
    padding: "4px 8px",
    borderRadius: 6,
    marginTop: 4,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
};

// ─── Component chính ───────────────────────────────────────────────────────────
export default function ChecklistPanel({ noteId, readOnly = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [addText, setAddText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  // Drag-and-drop state
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // ─── Load checklist khi mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!noteId) return;
    loadChecklist();
  }, [noteId]);

  const loadChecklist = useCallback(async () => {
    try {
      const data = await checklistService.getChecklist(noteId);
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => a.position - b.position)
        : [];
      setItems(sorted);
      if (sorted.length > 0) setShowPanel(true);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  // ─── Thêm item mới ───────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const text = addText.trim();
    if (!text) return;
    try {
      const newItem = await checklistService.addChecklistItem(noteId, text);
      setItems((prev) => [...prev, newItem]);
      setAddText("");
      setShowPanel(true);
    } catch {
      // silent — không ảnh hưởng UX chính
    }
  };

  const handleAddKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === "Escape") setAddText("");
  };

  // ─── Toggle hoàn thành ────────────────────────────────────────────────────────
  const handleToggle = async (item) => {
    if (readOnly) return;
    const newVal = !item.is_completed;
    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.item_id === item.item_id ? { ...i, is_completed: newVal } : i,
      ),
    );
    try {
      await checklistService.updateChecklistItem(noteId, item.item_id, {
        is_completed: newVal,
      });
    } catch {
      // Rollback
      setItems((prev) =>
        prev.map((i) =>
          i.item_id === item.item_id
            ? { ...i, is_completed: item.is_completed }
            : i,
        ),
      );
    }
  };

  // ─── Sửa nội dung item ───────────────────────────────────────────────────────
  const startEdit = (item) => {
    if (readOnly) return;
    setEditingId(item.item_id);
    setEditText(item.content);
  };

  const commitEdit = async (item) => {
    const text = editText.trim();
    setEditingId(null);
    if (!text || text === item.content) return;
    setItems((prev) =>
      prev.map((i) =>
        i.item_id === item.item_id ? { ...i, content: text } : i,
      ),
    );
    try {
      await checklistService.updateChecklistItem(noteId, item.item_id, {
        content: text,
      });
    } catch {
      // Rollback
      setItems((prev) =>
        prev.map((i) =>
          i.item_id === item.item_id ? { ...i, content: item.content } : i,
        ),
      );
    }
  };

  const handleEditKeyDown = (e, item) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit(item);
    }
    if (e.key === "Escape") setEditingId(null);
  };

  // ─── Xóa item ────────────────────────────────────────────────────────────────
  const handleDelete = async (item) => {
    if (readOnly) return;
    setItems((prev) => prev.filter((i) => i.item_id !== item.item_id));
    try {
      await checklistService.deleteChecklistItem(noteId, item.item_id);
    } catch {
      // Rollback
      setItems((prev) => {
        const restored = [...prev, item].sort(
          (a, b) => a.position - b.position,
        );
        return restored;
      });
    }
  };

  // ─── Drag & Drop để sắp xếp ──────────────────────────────────────────────────
  const handleDragStart = (e, idx) => {
    dragItem.current = idx;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (idx) => {
    dragOverItem.current = idx;
    if (dragItem.current === idx) return;
    setItems((prev) => {
      const next = [...prev];
      const dragged = next.splice(dragItem.current, 1)[0];
      next.splice(idx, 0, dragged);
      dragItem.current = idx;
      return next;
    });
  };

  const handleDragEnd = async () => {
    dragItem.current = null;
    dragOverItem.current = null;
    // Cập nhật position mới trên server
    const reorderPayload = items.map((item, idx) => ({
      item_id: item.item_id,
      position: idx + 1,
    }));
    try {
      await checklistService.reorderChecklist(noteId, reorderPayload);
      // Cập nhật position local cho đồng bộ
      setItems((prev) =>
        prev.map((item, idx) => ({ ...item, position: idx + 1 })),
      );
    } catch {
      // silent
    }
  };

  // ─── Tính toán progress ──────────────────────────────────────────────────────
  const total = items.length;
  const done = items.filter((i) => i.is_completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // ─── Chưa load xong ──────────────────────────────────────────────────────────
  if (loading) return null;

  // ─── Chưa có checklist và readOnly: không hiển thị gì ───────────────────────
  if (items.length === 0 && readOnly) return null;

  // ─── Chưa có checklist và chưa muốn mở panel ────────────────────────────────
  if (!showPanel && !readOnly) {
    return (
      <button
        style={styles.triggerBtn}
        title="Thêm checklist vào ghi chú"
        onClick={() => setShowPanel(true)}
      >
        ☑ + Thêm checklist
      </button>
    );
  }

  // ─── Panel checklist đầy đủ ──────────────────────────────────────────────────
  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>☑ Checklist</span>
        {total > 0 && (
          <span style={styles.progress}>
            {done}/{total}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${pct}%` }} />
        </div>
      )}

      {/* Danh sách items */}
      {items.map((item, idx) => {
        const isEditing = editingId === item.item_id;
        return (
          <div
            key={item.item_id}
            style={styles.itemRow}
            draggable={!readOnly && !isEditing}
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragEnter={() => handleDragEnter(idx)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
          >
            {/* Drag handle */}
            {!readOnly && (
              <span style={styles.dragHandle} title="Kéo để sắp xếp">
                ⋮⋮
              </span>
            )}

            {/* Checkbox */}
            <input
              type="checkbox"
              style={styles.checkbox}
              checked={!!item.is_completed}
              onChange={() => handleToggle(item)}
              disabled={readOnly}
            />

            {/* Nội dung — click để sửa */}
            {isEditing ? (
              <input
                style={{ ...styles.itemText, ...styles.itemTextEdit }}
                value={editText}
                autoFocus
                onChange={(e) => setEditText(e.target.value)}
                onBlur={() => commitEdit(item)}
                onKeyDown={(e) => handleEditKeyDown(e, item)}
              />
            ) : (
              <span
                style={{
                  ...styles.itemText,
                  ...(item.is_completed ? styles.itemTextCompleted : {}),
                  cursor: readOnly ? "default" : "text",
                }}
                onClick={() => startEdit(item)}
                title={readOnly ? "" : "Nhấp để sửa"}
              >
                {item.content}
              </span>
            )}

            {/* Nút xóa */}
            {!readOnly && (
              <button
                style={styles.deleteBtn}
                title="Xóa item"
                onClick={() => handleDelete(item)}
                onMouseEnter={(e) => (e.target.style.color = "#d32f2f")}
                onMouseLeave={(e) => (e.target.style.color = "#bbb")}
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      {/* Hàng thêm item mới */}
      {!readOnly && (
        <div style={styles.addRow}>
          <span style={{ color: "#bbb", fontSize: 14, flexShrink: 0 }}>+</span>
          <input
            style={styles.addInput}
            placeholder="Thêm công việc..."
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            onKeyDown={handleAddKeyDown}
          />
          {addText.trim() && (
            <button style={styles.addBtn} onClick={handleAdd} title="Thêm">
              ↵
            </button>
          )}
        </div>
      )}
    </div>
  );
}
