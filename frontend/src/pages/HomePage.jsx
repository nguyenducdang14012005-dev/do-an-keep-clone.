import { useState, useEffect, useRef } from "react";
import "./HomePage.css";
import "./share.css";

import shareService, { getAcceptedSharedNotes } from "../services/shareService";
import TopBar from "../components/TopBar";
import SideBar from "../components/SideBar";
import NoteCard from "../components/NoteCard";
import NoteComposer from "../components/NoteComposer";
import NoteEditModal from "../components/NoteEditModal";
import ReminderModal from "../components/ReminderModal";
import ShareModal from "../components/ShareModal";
import LabelPickerModal from "../components/LabelPickerModal";
import ConfirmModal from "../components/ConfirmModal";
import ChangePasswordModal from "../components/ChangePasswordModal";
import Toast from "../components/Toast";
import ReminderPopup from "../components/ReminderPopup";

// ⚡ IMPORT: Admin Dashboard page
import AdminDashboardPage from "./AdminDashboardPage";

import noteService from "../services/noteService";
import labelService from "../services/labelService";
import reminderService from "../services/reminderService";

export default function HomePage({ isLogin, setIsLogin }) {
  useEffect(() => {
    Notification.requestPermission();
  }, []);

  // ⚡ STATE: Điều hướng sang trang Admin
  const [page, setPage] = useState("home"); // "home" | "admin"
  const [acceptedSharedNotes, setAcceptedSharedNotes] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen(!isOpen);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const isLogOut = () => setIsLogin(null);

  const [notes, setNotes] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("notes");
  const [keyword, setKeyword] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newDueTime, setNewDueTime] = useState("");
  const [newColor, setNewColor] = useState("#ffffff");
  const [toast, setToast] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderNoteId, setReminderNoteId] = useState(null);
  const [reminderTime, setReminderTime] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareNoteId, setShareNoteId] = useState(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState("view");
  const searchTimer = useRef(null);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [sortBy, setSortBy] = useState("newest");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedLabelName, setSelectedLabelName] = useState("");
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [labelPickerNoteId, setLabelPickerNoteId] = useState(null);
  const [labelPickerNoteLabels, setLabelPickerNoteLabels] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }
  const [viewingNote, setViewingNote] = useState(null);
  const [pendingShares, setPendingShares] = useState([]);
  const [mySharedNotes, setMySharedNotes] = useState([]);
  const [dueReminders, setDueReminders] = useState([]);
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showRegisterPass, setShowRegisterPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  useEffect(() => {
    loadNotes();
    loadLabels();
    loadPendingShares();
    loadMySharedNotes();
    loadAcceptedSharedNotes();
    const interval = setInterval(() => {
      checkReminders();
      loadPendingShares();
      loadMySharedNotes();
      loadAcceptedSharedNotes();
    }, 10000);
    return () => clearInterval(interval);
  }, [view, selectedLabel, sortBy, isLogin]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const loadNotes = async (kw = keyword, sort = sortBy) => {
    setLoading(true);
    try {
      if (!isLogin || !isLogin.userId) {
        setNotes([]);
        setLoading(false);
        return;
      }
      let data = [];
      if (view === "notes") {
        const activeNotes = await noteService.searchNotes({
          view: "notes",
          keyword: kw,
          label_id: selectedLabel,
          user_id: isLogin.userId,
        });
        const archivedNotes = await noteService.searchNotes({
          view: "archive",
          keyword: kw,
          label_id: selectedLabel,
          user_id: isLogin.userId,
        });
        const safeActive = Array.isArray(activeNotes) ? activeNotes : [];
        const safeArchived = Array.isArray(archivedNotes) ? archivedNotes : [];
        data = [...safeActive, ...safeArchived];
      } else if (view === "reminders") {
        const result = await reminderService.getReminders();
        data = Array.isArray(result) ? result : [];
      } else {
        const result = await noteService.searchNotes({
          view,
          keyword: kw,
          label_id: selectedLabel,
          user_id: isLogin.userId,
        });

        data = Array.isArray(result) ? result : [];
      }

      const sorted = [...data].sort((a, b) => {
        if (sortBy === "newest")
          return new Date(b.updated_at) - new Date(a.updated_at);
        if (sortBy === "oldest")
          return new Date(a.updated_at) - new Date(b.updated_at);
        if (sortBy === "az")
          return (a.title || "").localeCompare(b.title || "");
        if (sortBy === "za")
          return (b.title || "").localeCompare(a.title || "");

        // 🛠️ ĐÃ FIX: Đổi từ due_time sang remind_time cho đúng thực tế bảng Reminders
        if (sortBy === "due_asc") {
          return (
            new Date(a.remind_time || "9999") -
            new Date(b.remind_time || "9999")
          );
        }
        return 0;
      });
      setNotes(sorted);
    } catch {
      setNotes([]);
    }
    setLoading(false);
  };

  const loadLabels = async () => {
    try {
      const data = await labelService.getLabels();
      setLabels(Array.isArray(data) ? data : []);
    } catch {
      setLabels([]);
    }
  };

  const loadPendingShares = async () => {
    if (!isLogin || !isLogin.userId) {
      setPendingShares([]);
      return;
    }
    try {
      const data = await shareService.getPendingShares();
      setPendingShares(Array.isArray(data) ? data : []);
    } catch {
      setPendingShares([]);
    }
  };

  const handleChangePermission = async (shareId, newPermission) => {
    try {
      await shareService.updateSharePermission(shareId, newPermission);
      showToast("Đã cập nhật quyền và gửi thông báo chuông thành công!");
      loadMySharedNotes();
      loadNotes();
      loadAcceptedSharedNotes(); // ⚡ BỔ SUNG: Đồng bộ danh sách nhận chia sẻ ngay lập tức
    } catch (err) {
      showToast("Lỗi khi thay đổi quyền truy cập");
    }
  };

  const loadMySharedNotes = async () => {
    if (!isLogin || !isLogin.userId) {
      setMySharedNotes([]);
      return;
    }
    try {
      const data = await shareService.getMySharedNotes();
      setMySharedNotes(Array.isArray(data) ? data : []);
    } catch {
      setMySharedNotes([]);
    }
  };

  const handleAcceptShare = async (share_id) => {
    try {
      await shareService.acceptShare(share_id);
      showToast("Đã chấp nhận chia sẻ");
      loadPendingShares();
      loadAcceptedSharedNotes(); // ⚡ BỔ SUNG: Cập nhật lưới note chia sẻ mới nhận
    } catch {
      showToast("Lỗi khi chấp nhận chia sẻ");
    }
  };

  const handleRejectShare = async (share_id) => {
    try {
      await shareService.rejectShare(share_id);
      showToast("Đã từ chối chia sẻ");
      loadPendingShares();
    } catch {
      showToast("Lỗi khi từ chối chia sẻ");
    }
  };

  const handleRevokeShare = async (share_id) => {
    try {
      await shareService.removeShare(share_id);
      showToast("Đã dừng chia sẻ ghi chú");
      loadMySharedNotes();
    } catch {
      showToast("Lỗi khi dừng chia sẻ");
    }
  };

  const handleOpenNotifications = async () => {
    try {
      await shareService.markNotificationsSeen();
      loadPendingShares();
    } catch {
      // ignore
    }
  };

  const loadAcceptedSharedNotes = async () => {
    if (!isLogin?.userId) {
      setAcceptedSharedNotes([]);
      return;
    }
    try {
      const data = await shareService.getAcceptedSharedNotes();
      setAcceptedSharedNotes(Array.isArray(data) ? data : []);
    } catch {
      setAcceptedSharedNotes([]);
    }
  };

  const checkReminders = async () => {
    try {
      const data = await reminderService.getReminders();
      const now = new Date();
      const due = data
        .filter((r) => {
          // SQL Server trả về chuỗi không có timezone suffix (vd: "2026-06-28T15:30:00.000")
          // Nếu không gắn "Z", browser VN sẽ parse sai thành giờ local thay vì UTC
          const timeStr =
            r.remind_time.endsWith("Z") || r.remind_time.includes("+")
              ? r.remind_time
              : r.remind_time + "Z";
          const t = new Date(timeStr);
          return t <= now && r.status == 0;
        })
        .slice(0, 3); // Chỉ hiện tối đa 3 popup
      setDueReminders(due);
    } catch (err) {
      console.log("Lỗi checkReminders:", err);
    }
  };

  const handleSearch = (val) => {
    setKeyword(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadNotes(val), 400);
  };

  const handleSetReminder = async () => {
    if (!reminderTime) return showToast("Vui lòng chọn thời gian");
    try {
      const data = await reminderService.getReminders();

      // Tìm reminder đang active của đúng note này
      const existing = data.find(
        (r) => r.note_id === reminderNoteId && r.status == 0,
      );

      if (existing) {
        // Note đã có reminder → UPDATE thay vì tạo mới
        await reminderService.updateReminder(existing.reminder_id, {
          remind_time: reminderTime,
        });
        showToast("Đã cập nhật nhắc nhở");
      } else {
        // Chưa có reminder → tạo mới
        await reminderService.createReminder({
          note_id: reminderNoteId,
          remind_time: reminderTime,
        });
        showToast("Đã đặt nhắc nhở");
      }

      setReminderOpen(false);
      setReminderTime("");
    } catch {
      showToast("Lỗi khi đặt nhắc nhở");
    }
  };

  const handleShare = async () => {
    if (!shareEmail) return showToast("Vui lòng nhập email");
    try {
      await shareService.shareNote(shareNoteId, {
        email: shareEmail,
        permission: sharePermission,
      });
      showToast("Đã gửi lời mời chia sẻ, đang chờ người nhận phản hồi");
      setShareOpen(false);
      setShareEmail("");
      setSharePermission("view");
      loadMySharedNotes();
    } catch (err) {
      const errMsg = err?.message || "";
      if (errMsg.includes("tìm thấy") || errMsg.includes("không tồn tại")) {
        showToast(
          "Người này không sử dụng ứng dụng, vui lòng liên hệ với bạn của bạn để làm rõ",
        );
      } else {
        showToast(errMsg || "Lỗi khi chia sẻ");
      }
    }
  };

  const createNote = async () => {
    if (!newTitle && !newContent) {
      setComposerOpen(false);
      return;
    }
    try {
      const created = await noteService.createNote({
        title: newTitle,
        content: newContent,
        color: newColor !== "#ffffff" ? newColor : null,
      });

      // ⚡ Nếu có hẹn giờ → tạo reminder gắn với note vừa tạo
      const noteId = created?.note_id ?? created?.data?.note_id;
      let hasReminderError = false;

      if (newDueTime && noteId) {
        try {
          await reminderService.createReminder({
            note_id: noteId,
            remind_time: newDueTime,
          });
        } catch (err) {
          hasReminderError = true;
          showToast("Lưu ghi chú thành công nhưng lỗi đặt hẹn giờ");
        }
      }

      // 🛠️ ĐÃ SỬA: Bắn thông báo Toast TRƯỚC KHI xóa sạch state
      if (!hasReminderError) {
        showToast(
          newDueTime ? "Đã lưu ghi chú và đặt hẹn giờ 🔔" : "Đã lưu ghi chú",
        );
      }

      // Xóa state sau khi đã dùng xong cho thông báo
      setNewTitle("");
      setNewContent("");
      setNewDueTime("");
      setNewColor("#ffffff");
      setComposerOpen(false);

      // Tải lại danh sách
      loadNotes();
    } catch (error) {
      showToast("Lỗi khi lưu ghi chú");
    }
  };
  const togglePin = async (id) => {
    try {
      await noteService.togglePin(id);
      loadNotes();
    } catch {}
  };

  const doChangeStatus = async (id, status) => {
    try {
      await noteService.changeStatus(id, status);
      const msg =
        status === "Archived"
          ? "Đã lưu trữ"
          : status === "Deleted"
            ? "Đã chuyển vào thùng rác"
            : status === "Active"
              ? "Đã khôi phục ghi chú"
              : "";
      if (msg) showToast(msg);
      loadNotes();
    } catch {}
  };

  const changeStatus = async (id, status) => {
    const note = notes.find((n) => n.note_id === id);
    const isArchiveAction = status === "Archived";
    const isUnarchiveAction =
      status === "Active" && note?.status === "Archived";
    const isDeleteAction = status === "Deleted";

    if (isArchiveAction || isUnarchiveAction || isDeleteAction) {
      setConfirmDialog({
        title: isArchiveAction
          ? "Lưu trữ ghi chú"
          : isDeleteAction
            ? "Xóa ghi chú"
            : "Hủy lưu trữ",
        message: isArchiveAction
          ? "Sau khi lưu trữ, ghi chú này sẽ không còn hiển thị ở trang chính nữa (trừ khi được ghim). Bạn có chắc muốn lưu trữ?"
          : isDeleteAction
            ? "Bạn có chắc muốn xóa ghi chú này không?"
            : "Ghi chú sẽ hiển thị lại ở trang chính sau khi hủy lưu trữ. Bạn có chắc muốn tiếp tục?",
        onConfirm: () => {
          setConfirmDialog(null);
          doChangeStatus(id, status);
        },
      });
      return;
    }

    doChangeStatus(id, status);
  };

  const toggleLabelOnNote = async (note_id, label_id, currentLabels) => {
    const isAttached = currentLabels.some((l) => l.label_id === label_id);
    if (isAttached) {
      const label = currentLabels.find((l) => l.label_id === label_id);
      setConfirmDialog({
        title: "Xóa nhãn",
        message: `Bạn có chắc muốn xóa nhãn "${label?.label_name || ""}" khỏi ghi chú này?`,
        onConfirm: async () => {
          setConfirmDialog(null);
          await labelService.detachLabel(note_id, label_id);
          setLabelPickerNoteLabels((prev) =>
            prev.filter((l) => l.label_id !== label_id),
          );
          loadNotes();
        },
      });
      return;
    }
    await labelService.attachLabel(note_id, label_id);
    loadNotes();
  };

  const addLabel = async (labelName) => {
    if (!labelName) return;
    await labelService.createLabel({ label_name: labelName });
    loadLabels();
  };

  const updateLabel = async (id, newName) => {
    if (!newName || newName.trim() === "") return;
    try {
      await labelService.updateLabel(id, { label_name: newName });
      showToast("Đã cập nhật tên nhãn");
      loadLabels();
    } catch {
      showToast("Lỗi khi cập nhật nhãn");
    }
  };

  const deleteLabel = async (id) => {
    await labelService.deleteLabel(id);
    loadLabels();
  };

  // ⚡ ĐÃ SỬA LỖI: Gọi cả loadAcceptedSharedNotes() để làm mới giao diện người được chia sẻ
  const handleCloseViewingNote = async (payload, statusChange) => {
    const id = viewingNote?.note_id;
    setViewingNote(null);
    if (!id) return;
    try {
      if (payload) {
        await noteService.updateNote(id, payload);
      }
      if (statusChange) {
        await noteService.changeStatus(id, statusChange);
        const msg =
          statusChange === "Archived"
            ? "Đã lưu trữ"
            : statusChange === "Deleted"
              ? "Đã chuyển vào thùng rác"
              : statusChange === "Active"
                ? "Đã khôi phục ghi chú"
                : statusChange === "PermanentlyDeleted"
                  ? "Đã xóa vĩnh viễn"
                  : "";
        if (msg) showToast(msg);
      } else if (payload) {
        showToast("Đã lưu thay đổi");
      }
      loadNotes();
      loadAcceptedSharedNotes(); // ⚡ BẮT BUỘC: Đồng bộ lưới note của đối tác, bẻ gãy cache 304 Browser!
    } catch {
      showToast("Lỗi khi lưu ghi chú");
    }
  };

  const handleConfirmReminder = async (id) => {
    try {
      await reminderService.updateReminder(id, {
        status: 1,
        remind_time: new Date().toISOString(),
      });
      setDueReminders((prev) => prev.filter((r) => r.reminder_id !== id));
    } catch {}
  };

  const handleRescheduleReminder = async (id, newTime) => {
    try {
      await reminderService.updateReminder(id, {
        status: 0,
        remind_time: newTime,
      });
      setDueReminders((prev) => prev.filter((r) => r.reminder_id !== id));
    } catch {}
  };

  // 1. Tạo một danh sách chứa tất cả ID của ghi chú đã được nhận chia sẻ
  const sharedNoteIds = acceptedSharedNotes.map((n) => n.note_id);

  // 2. Lọc danh sách ghim: Phải là của mình (không nằm trong danh sách được chia sẻ)
  const pinnedNotes = notes.filter(
    (n) => n.is_pinned && !sharedNoteIds.includes(n.note_id),
  );

  // 3. Lọc danh sách thường: Không ghim, hợp trạng thái view VÀ không nằm trong danh sách được chia sẻ
  const otherNotes = notes.filter((n) => {
    if (n.is_pinned) return false;
    if (view === "notes" && n.status === "Archived") return false;
    if (sharedNoteIds.includes(n.note_id)) return false; // ⚡ BỔ SUNG: Chặn không cho hiện ở vùng lưu trữ thông thường
    return true;
  });
  const isAdmin =
    isLogin?.roles?.includes("Admin") || isLogin?.role === "Admin";

  if (page === "admin") {
    return (
      <AdminDashboardPage
        authToken={localStorage.getItem("token")}
        authUser={isLogin}
        onBack={() => setPage("home")}
        onLogout={isLogOut}
      />
    );
  }

  return (
    <div className="app">
      <TopBar
        keyword={keyword}
        onSearch={handleSearch}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onRefresh={() => {
          loadNotes();
          loadAcceptedSharedNotes();
        }}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isOpen={isOpen}
        toggleMenu={toggleMenu}
        isLogin={isLogin}
        isLogOut={isLogOut}
        pendingShares={pendingShares}
        onAcceptShare={handleAcceptShare}
        onRejectShare={handleRejectShare}
        mySharedNotes={mySharedNotes}
        onRevokeShare={handleRevokeShare}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
        onOpenNotifications={handleOpenNotifications}
        acceptedSharedNotes={acceptedSharedNotes}
        onChangePermission={handleChangePermission}
        adminButton={
          isAdmin ? (
            <button
              className="icon-btn admin-btn"
              title="Trang quản trị Admin"
              onClick={() => setPage("admin")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                background: "#1a73e8",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              🛡 Admin
            </button>
          ) : null
        }
      />

      {isAdmin && (
        <button
          onClick={() => setPage("admin")}
          title="Mở trang quản trị"
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: 24,
            background: "#1a73e8",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 14,
            boxShadow: "0 4px 16px rgba(26,115,232,0.35)",
          }}
        >
          🛡 Quản trị Admin
        </button>
      )}

      <div className="main">
        {sidebarOpen && (
          <SideBar
            labels={labels}
            view={view}
            setView={(v) => {
              setView(v);
              if (v !== "notes") {
                setSelectedLabel(null);
                setSelectedLabelName("");
              }
            }}
            selectedLabel={selectedLabel}
            onSelectLabel={(id, name) => {
              setSelectedLabel(id);
              setSelectedLabelName(name || "");
              setView("notes");
            }}
            onAddLabel={addLabel}
            onDeleteLabel={deleteLabel}
          />
        )}

        <div className="content">
          <NoteComposer
            view={view}
            composerOpen={composerOpen}
            setComposerOpen={setComposerOpen}
            newTitle={newTitle}
            setNewTitle={setNewTitle}
            newContent={newContent}
            setNewContent={setNewContent}
            newDueTime={newDueTime}
            setNewDueTime={setNewDueTime}
            newColor={newColor}
            setNewColor={setNewColor}
            createNote={createNote}
          />
          {view === "notes" && acceptedSharedNotes.length > 0 && (
            <>
              <div className="shared-section-label">
                👥 Được chia sẻ với tôi
              </div>
              <div className="notes-grid">
                {acceptedSharedNotes.map((n) => (
                  <div
                    key={n.note_id}
                    className="note-card shared-card"
                    onClick={() => setViewingNote(n)}
                  >
                    <div className="shared-badge">
                      👥{" "}
                      {n.permission === "view"
                        ? "Chỉ xem"
                        : n.permission === "edit"
                          ? "Chỉnh sửa"
                          : "Toàn quyền"}
                    </div>
                    {n.title && (
                      <div
                        className="note-title"
                        dangerouslySetInnerHTML={{ __html: n.title }}
                      />
                    )}
                    <div
                      className="note-content"
                      dangerouslySetInnerHTML={{ __html: n.content }}
                    />

                    {n.due_time && (
                      <div
                        className="note-deadline-badge"
                        style={{
                          fontSize: "12px",
                          color: "#d93025",
                          marginTop: "10px",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        ⏰ Hạn chót:{" "}
                        {new Date(n.due_time).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {view === "labels" ? (
            <div className="label-manager">
              <div className="label-manager-header">
                <h3>Quản lý nhãn</h3>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <input
                    id="newLabelInput"
                    className="modal-input"
                    placeholder="Tên nhãn mới..."
                  />
                  <button
                    className="btn-share"
                    onClick={async () => {
                      const val =
                        document.getElementById("newLabelInput").value;
                      if (!val) return;
                      await addLabel(val);
                      document.getElementById("newLabelInput").value = "";
                    }}
                  >
                    Thêm
                  </button>
                </div>
              </div>

              {labels.map((l) => (
                <div
                  key={l.label_id}
                  className="label-edit-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span>🏷</span>
                  <input
                    type="text"
                    defaultValue={l.label_name}
                    className="modal-input"
                    style={{
                      flex: 1,
                      border: "none",
                      background: "transparent",
                      padding: "4px 8px",
                    }}
                    onBlur={(e) => {
                      if (e.target.value !== l.label_name) {
                        updateLabel(l.label_id, e.target.value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateLabel(l.label_id, e.target.value);
                        e.target.blur();
                      }
                    }}
                  />
                  <button
                    className="card-btn"
                    onClick={() => deleteLabel(l.label_id)}
                    title="Xóa nhãn"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          ) : loading ? (
            <div className="empty-state">
              <p>Đang tải...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="empty-state">
              <p>
                {view === "archive"
                  ? "Không có ghi chú được lưu trữ"
                  : view === "trash"
                    ? "Thùng rác trống"
                    : "Bản ghi chú mà bạn thêm sẽ xuất hiện tại đây"}
              </p>
            </div>
          ) : (
            <>
              {pinnedNotes.length > 0 && (
                <>
                  <div className="section-label">Được ghim</div>
                  <div className="notes-grid">
                    {(view === "reminders"
                      ? pinnedNotes.filter((n) => n.remind_time)
                      : pinnedNotes
                    ).map((n) => (
                      <NoteCard
                        key={n.note_id}
                        note={n}
                        onPin={(id) => togglePin(id)}
                        onStatus={(id, s) => changeStatus(id, s)}
                        onReminder={(id) => {
                          setReminderNoteId(id);
                          setReminderOpen(true);
                        }}
                        onShare={(id) => {
                          setShareNoteId(id);
                          setShareOpen(true);
                        }}
                        onLabel={(id, noteLabels) => {
                          setLabelPickerNoteId(id);
                          setLabelPickerNoteLabels(noteLabels);
                          setLabelPickerOpen(true);
                        }}
                        onViewDetails={(note) => setViewingNote(note)}
                      />
                    ))}
                  </div>
                  {otherNotes.length > 0 && (
                    <div className="section-label" style={{ marginTop: 16 }}>
                      Khác
                    </div>
                  )}
                </>
              )}
              <div className="notes-grid">
                {(view === "reminders"
                  ? otherNotes.filter((n) => n.remind_time)
                  : otherNotes
                ).map((n) => (
                  <NoteCard
                    key={n.note_id}
                    note={n}
                    onPin={(id) => togglePin(id)}
                    onStatus={(id, s) => changeStatus(id, s)}
                    onReminder={(id) => {
                      setReminderNoteId(id);
                      setReminderOpen(true);
                    }}
                    onShare={(id) => {
                      setShareNoteId(id);
                      setShareOpen(true);
                    }}
                    onLabel={(id, noteLabels) => {
                      setLabelPickerNoteId(id);
                      setLabelPickerNoteLabels(noteLabels);
                      setLabelPickerOpen(true);
                    }}
                    onViewDetails={(note) => setViewingNote(note)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {labelPickerOpen && (
        <LabelPickerModal
          labels={labels}
          noteLabels={labelPickerNoteLabels}
          onClose={() => setLabelPickerOpen(false)}
          onToggle={(labelId) =>
            toggleLabelOnNote(labelPickerNoteId, labelId, labelPickerNoteLabels)
          }
        />
      )}

      {toast && <Toast message={toast} />}

      {confirmDialog && (
        <ConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {changePasswordOpen && (
        <ChangePasswordModal onClose={() => setChangePasswordOpen(false)} />
      )}

      {reminderOpen && (
        <ReminderModal
          reminderTime={reminderTime}
          setReminderTime={setReminderTime}
          onClose={() => setReminderOpen(false)}
          onSave={handleSetReminder}
        />
      )}

      {shareOpen && (
        <ShareModal
          noteId={shareNoteId}
          email={shareEmail}
          setEmail={setShareEmail}
          permission={sharePermission}
          setPermission={setSharePermission}
          onClose={() => setShareOpen(false)}
          onSave={handleShare}
        />
      )}

      {viewingNote && (
        <NoteEditModal
          key={viewingNote.note_id}
          note={viewingNote}
          onClose={handleCloseViewingNote}
          onPin={(id) => {
            togglePin(id);
            setViewingNote((prev) =>
              prev ? { ...prev, is_pinned: !prev.is_pinned } : prev,
            );
          }}
          onReminder={(id) => {
            setReminderNoteId(id);
            setReminderOpen(true);
          }}
          onShare={(id) => {
            setShareNoteId(id);
            setShareOpen(true);
          }}
          onLabel={(id, noteLabels) => {
            setLabelPickerNoteId(id);
            setLabelPickerNoteLabels(noteLabels);
            setLabelPickerOpen(true);
          }}
        />
      )}
      <ReminderPopup
        reminders={dueReminders}
        onConfirm={handleConfirmReminder}
        onReschedule={handleRescheduleReminder}
      />
    </div>
  );
}
