import { useState, useEffect, useRef } from "react";

import {
  MdMenu, MdSearch, MdRefresh, MdSettings,
  MdOutlineLightbulb, MdOutlineNotifications, MdOutlineEdit,
  MdOutlineArchive, MdDeleteOutline, MdOutlineLabel,
  MdPushPin, MdOutlinePushPin, MdCheckBox, MdBrush, MdImage,
  MdClose
} from "react-icons/md";
import "./HomePage.css";

const API = "http://localhost:5000/api";

export default function HomePage() {
  useEffect(() => {
    Notification.requestPermission();
}, []);
  const [notes, setNotes] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("notes");
  const [keyword, setKeyword] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newDueTime, setNewDueTime] = useState("");
  const [toast, setToast] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderNoteId, setReminderNoteId] = useState(null);
  const [reminderTime, setReminderTime] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareNoteId, setShareNoteId] = useState(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState("View");
  const searchTimer = useRef(null);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [sortBy, setSortBy] = useState("newest");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedLabelName, setSelectedLabelName] = useState("");
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
const [labelPickerNoteId, setLabelPickerNoteId] = useState(null);
const [labelPickerNoteLabels, setLabelPickerNoteLabels] = useState([]);
 useEffect(() => {
    loadNotes();
    loadLabels();
    const interval = setInterval(checkReminders, 10000);
    return () => clearInterval(interval);
}, [view, selectedLabel, sortBy]); 

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 30000);
  };

  const loadNotes = async (kw = keyword, sort = sortBy) => {
    setLoading(true);
    try {
      let url = `${API}/notes/search?`;
      if (view === "archive") url += "status=Archived";
      else if (view === "trash") url += "status=Deleted";
      else if (view === "reminders") url += "status=Active";
      else url += "status=Active";
      if (kw) url += `&keyword=${encodeURIComponent(kw)}`;
      if (selectedLabel) url += `&label_id=${selectedLabel}`; 
      const res = await fetch(url);
      const data = await res.json();
    
    const notesWithLabels = await Promise.all(
            (Array.isArray(data) ? data : []).map(async (note) => {
                const labelRes = await fetch(`${API}/notes/${note.note_id}/labels`);
                const labels = await labelRes.json();
                return { ...note, labels };
            })
        );
        const sorted = [...notesWithLabels].sort((a, b) => {
            if (sortBy === "newest") 
                return new Date(b.updated_at) - new Date(a.updated_at);
            if (sortBy === "oldest") 
                return new Date(a.updated_at) - new Date(b.updated_at);
            if (sortBy === "az") 
                return (a.title || "").localeCompare(b.title || "");
            if (sortBy === "za") 
                return (b.title || "").localeCompare(a.title || "");
              if (sortBy === "due_asc")
    return new Date(a.due_time || "9999") - new Date(b.due_time || "9999");
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
      const res = await fetch(`${API}/labels`);
      const data = await res.json();
      setLabels(Array.isArray(data) ? data : []);
    } catch {
      setLabels([]);
    }
  };
  const checkReminders = async () => {
    try {
        const res = await fetch(`${API}/reminders`);
        const data = await res.json();
        const now = new Date();

        data.forEach((r) => {
            const remindTime = new Date(r.remind_time);
            const diff = remindTime - now;
            remindTime.setHours(remindTime.getHours() + 7);
            if (diff > 0 && diff <= 10000) {
               
                showToast(" Đã đến giờ nhắc nhở!");
            }
        });
    } catch {}
};

  const handleSearch = (val) => {
    setKeyword(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadNotes(val), 400);
  };

  const handleSetReminder = async () => {
    if (!reminderTime) return showToast("Vui lòng chọn thời gian");
    
   
    try {
        const res = await fetch(`${API}/reminders`);
        const data = await res.json();
        const trung = data.find(r => {
            const dbTime = new Date(r.remind_time);
            dbTime.setHours(dbTime.getHours() + 7);
            return dbTime.toISOString().slice(0, 16) === reminderTime;
        });
        if (trung) return showToast(" Đã có nhắc nhở vào giờ này rồi!");
    } catch {}

    try {
        await fetch(`${API}/reminders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note_id: reminderNoteId, remind_time: reminderTime }),
        });
        showToast("Đã đặt nhắc nhở");
        setReminderOpen(false);
        setReminderTime("");
    } catch {
        showToast("Lỗi khi đặt nhắc nhở");
    }
};

  const handleShare = async () => {
  if (!shareEmail) return showToast("Vui lòng nhập email");
  try {
    await fetch(`${API}/shares/${shareNoteId}`, {  
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: shareEmail, permission: sharePermission }),
    });
    showToast("Đã chia sẻ ghi chú!");
    setShareOpen(false);
    setShareEmail("");
  } catch {
    showToast("Lỗi khi chia sẻ");
  }
};
  const createNote = async () => {
    if (!newTitle && !newContent) {
      setComposerOpen(false);
      return;
    }
    if (newDueTime) {
        
const trung = notes.find(n => {
    if (!n.due_time) return false;
    const dbTime = new Date(n.due_time);
    // Cộng thêm 7 tiếng (UTC+7)
    dbTime.setHours(dbTime.getHours() + 7);
    return dbTime.toISOString().slice(0, 16) === newDueTime;
});
        if (trung) {
            showToast(`Trùng giờ với ghi chú "${trung.title || "không tên"}"!`);
            return; // chặn không cho lưu
        }
    }
    console.log("due_time:", newDueTime);
    try {
      await fetch(`${API}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, content: newContent, due_time: newDueTime ? newDueTime : null }),
      });
      setNewTitle("");
      setNewContent("");
      setNewDueTime("");
      setComposerOpen(false);
      showToast("Đã lưu ghi chú");
      loadNotes();
    } catch {
      showToast("Lỗi khi lưu ghi chú");
    }
  };

  const togglePin = async (id) => {
    try {
      await fetch(`${API}/notes/${id}/pin`, { method: "PUT" });
      loadNotes();
    } catch {}
  };

  const changeStatus = async (id, status) => {
    try {
      await fetch(`${API}/notes/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      showToast(status === "Archived" ? "Đã lưu trữ" : "Đã chuyển vào thùng rác");
      loadNotes();
    } catch {}
  };
  const toggleLabelOnNote = async (note_id, label_id, currentLabels) => {
    const isAttached = currentLabels.some(l => l.label_id === label_id);
    if (isAttached) {
        await fetch(`${API}/labels/detach`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note_id, label_id })
        });
    } else {
        await fetch(`${API}/labels/attach`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note_id, label_id })
        });
    }
    loadNotes();
};

  const pinnedNotes = notes.filter((n) => n.is_pinned);
  const otherNotes = notes.filter((n) => !n.is_pinned);

  return (
    <div className="app">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <button className="icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <MdMenu size={24} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#6C63FF" }}>
        {selectedLabel ? selectedLabelName :
         view === "notes" ? "Ghi chú" :
         view === "reminders" ? "Lời nhắc" :
         view === "labels" ? "Chỉnh sửa nhãn" :
         view === "archive" ? "Lưu trữ" :
         view === "trash" ? "Thùng rác" : "Ghi chú"}
    </span>
        </div>

        <div className="search-bar">
          <MdSearch size={20} color="#5f6368" />
          <input
            className="search-input"
            placeholder="Tìm kiếm"
            value={keyword}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {keyword && (
            <button className="icon-btn" onClick={() => handleSearch("")}>
              <MdClose size={18} />
            </button>
          )}
        </div>

        <div className="topbar-right">
          <select 
        className="sort-select"
        value={sortBy} 
        onChange={(e) => setSortBy(e.target.value)}
    >
        <option value="newest">Mới nhất</option>
        <option value="oldest">Cũ nhất</option>
        <option value="az">Tên A-Z</option>
        <option value="za">Tên Z-A</option>
        <option value="due_asc">những việc cần làm bây giờ</option> 
    </select>
          <button className="icon-btn" onClick={() => loadNotes()} title="Làm mới">
            <MdRefresh size={22} />
          </button>
          <button className="icon-btn" title="Cài đặt">
            <MdSettings size={22} />
          </button>
        </div>
      </div>

      <div className="main">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="sidebar">
            <NavItem 
    icon={<MdOutlineLightbulb size={20} />} 
    label="Ghi chú" 
    active={view === "notes"} 
    onClick={() => { 
        setView("notes"); 
        setSelectedLabel(null);
    }} 
/>
            <NavItem icon={<MdOutlineNotifications size={20} />} label="Lời nhắc" active={view === "reminders"} onClick={() => setView("reminders")} />
            <NavItem icon={<MdOutlineEdit size={20} />} label="Chỉnh sửa nhãn" active={view === "labels"} onClick={() => setView("labels")} />
            {labels.length > 0 && (
              <>
                <div className="sidebar-section">Nhãn</div>
             {labels.map((l) => (
    <NavItem key={l.label_id} icon={<MdOutlineLabel size={20} />} label={l.label_name} 
        active={selectedLabel === l.label_id}
        onClick={() => { 
    setSelectedLabel(l.label_id); 
    setSelectedLabelName(l.label_name); 
    setView("notes"); 
}}
    />
))}
              </>
            )}
            <NavItem icon={<MdOutlineArchive size={20} />} label="Lưu trữ" 
    active={view === "archive"} 
    onClick={() => { setView("archive"); setSelectedLabel(null); setSelectedLabelName(""); }} />

<NavItem icon={<MdDeleteOutline size={20} />} label="Thùng rác" 
    active={view === "trash"} 
    onClick={() => { setView("trash"); setSelectedLabel(null); setSelectedLabelName(""); }} /> 
            <div className="sidebar-footer">Giấy phép nguồn mở</div>
          </div>
        )}

        {/* Content */}
        <div className="content">
          {/* Composer */}
          {view === "notes" && (
            <div className="composer-wrapper">
              {!composerOpen ? (
                <div className="composer-collapsed" onClick={() => setComposerOpen(true)}>
                  <span>Ghi chú...</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="icon-btn"><MdCheckBox size={22} color="#5f6368" /></button>
                    <button className="icon-btn"><MdBrush size={22} color="#5f6368" /></button>
                    <button className="icon-btn"><MdImage size={22} color="#5f6368" /></button>
                  </div>
                </div>
              ) : (
                <div className="composer-expanded">
                  <input className="composer-title" placeholder="Tiêu đề" value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)} autoFocus />
                  <input className="composer-content" placeholder="Ghi chú..." value={newContent}
                    onChange={(e) => setNewContent(e.target.value)} />
                  
<button 
    className="deadline-btn"
    onClick={() => setDatePickerOpen(!datePickerOpen)}
>
    {newDueTime ? new Date(newDueTime).toLocaleString("vi-VN") : "Chọn ngày và giờ"}
</button>

{datePickerOpen && (
    <div className="date-picker-popup">
        <div className="date-picker-header">
            <span>← Chọn ngày và giờ</span>
        </div>
        <div className="date-picker-body">
            <input 
                type="date"
                className="date-input"
                value={newDueTime.split("T")[0] || ""}
                onChange={(e) => setNewDueTime(e.target.value + "T" + (newDueTime.split("T")[1] || "00:00"))}
            />
            <input 
                type="time"
                className="time-input"
                value={newDueTime.split("T")[1] || ""}
                onChange={(e) => setNewDueTime((newDueTime.split("T")[0] || "") + "T" + e.target.value)}
            />
        </div>
        <div className="date-picker-footer">
            <button className="btn-share" onClick={() => setDatePickerOpen(false)}>Lưu</button>
        </div>
    </div>
)}
                    <div className="composer-actions-left">
                      <button className="icon-btn"><MdCheckBox size={20} color="#5f6368" /></button>
                      <button className="icon-btn"><MdBrush size={20} color="#5f6368" /></button>
                      <button className="icon-btn"><MdImage size={20} color="#5f6368" /></button>
                    </div>
                    <button className="close-btn" onClick={createNote}>Đóng</button>
                  </div>
                
              )}
            </div>
          )}

          {/* Notes */}
        {view === "labels" ? (
    <div className="label-manager">
        <div className="label-manager-header">
            <h3>Chỉnh sửa nhãn</h3>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input 
                    id="newLabelInput"
                    className="modal-input" 
                    placeholder="Tên nhãn mới..." 
                />
                <button className="btn-share" onClick={async () => {
                    const val = document.getElementById("newLabelInput").value;
                    if (!val) return;
                    await fetch(`${API}/labels`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ label_name: val })
                    });
                    loadLabels();
                }}>Thêm</button>
            </div>
        </div>
        {labels.map(l => (
            <div key={l.label_id} className="label-edit-row">
                <MdOutlineLabel size={20} color="#5f6368" />
                <span style={{ flex: 1 }}>{l.label_name}</span>
                <button className="card-btn" onClick={async () => {
                    await fetch(`${API}/labels/${l.label_id}`, { method: "DELETE" });
                    loadLabels();
                }}><MdDeleteOutline size={18} /></button>
            </div>
        ))}
    </div>
) :loading ? (
            <div className="empty-state"><p>Đang tải...</p></div>
          ) : notes.length === 0 ? (
            <div className="empty-state">
              <MdOutlineLightbulb size={80} color="#e0e0e0" />
              <p>
                {view === "archive" ? "Không có ghi chú được lưu trữ" :
                 view === "trash" ? "Thùng rác trống" :
                 "Bản ghi chú mà bạn thêm sẽ xuất hiện tại đây"}
              </p>
            </div>
          ) : (
            <>
             {pinnedNotes.length > 0 && (
    <>
        <div className="section-label">Được ghim</div>
        <div className="notes-grid">
           {(view === "reminders" ? pinnedNotes.filter(n => n.due_time) : pinnedNotes).map((n) => (
    <NoteCard key={n.note_id} note={n} onPin={togglePin} onStatus={changeStatus}
        onReminder={(id) => { setReminderNoteId(id); setReminderOpen(true); }}
        onShare={(id) => { setShareNoteId(id); setShareOpen(true); }}
        onLabel={(id, noteLabels) => { setLabelPickerNoteId(id); setLabelPickerNoteLabels(noteLabels); setLabelPickerOpen(true); }}
    />
))}
        </div>
        {otherNotes.length > 0 && <div className="section-label" style={{ marginTop: 16 }}>Khác</div>}
    </>
)}
<div className="notes-grid">
    {(view === "reminders" ? otherNotes.filter(n => n.due_time) : otherNotes).map((n) => (  // ✅ sửa chỗ này
        <NoteCard key={n.note_id} note={n} onPin={togglePin} onStatus={changeStatus}
            onReminder={(id) => { setReminderNoteId(id); setReminderOpen(true); }}
            onShare={(id) => { setShareNoteId(id); setShareOpen(true); }}
            onLabel={(id, noteLabels) => { setLabelPickerNoteId(id); setLabelPickerNoteLabels(noteLabels); setLabelPickerOpen(true); }}
        />
    ))}
</div>
            </>
          )}
        </div>
      </div>
          {labelPickerOpen && (
    <div className="modal-overlay" onClick={() => setLabelPickerOpen(false)}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <span>Gán nhãn</span>
                <button className="icon-btn" onClick={() => setLabelPickerOpen(false)}>
                    <MdClose size={20} />
                </button>
            </div>
            <div className="modal-body">
                {labels.map(l => {
                    const isAttached = labelPickerNoteLabels.some(nl => nl.label_id === l.label_id);
                    return (
                        <div key={l.label_id} 
                            className="label-picker-row"
                            onClick={() => toggleLabelOnNote(labelPickerNoteId, l.label_id, labelPickerNoteLabels)}
                        >
                            <span className={`label-picker-dot ${isAttached ? "attached" : ""}`}>
                                {isAttached ? "✓" : ""}
                            </span>
                            <span className="label-picker-name">{l.label_name}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
)}
      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Reminder Popup */}
      {reminderOpen && (
        <div className="modal-overlay" onClick={() => setReminderOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>Đặt nhắc nhở</span>
              <button className="icon-btn" onClick={() => setReminderOpen(false)}><MdClose size={20} /></button>
            </div>
            <div className="modal-body">
              <label style={{ fontSize: 13, color: "#5f6368" }}>Chọn ngày và giờ:</label>
              <input type="datetime-local" className="modal-input" value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)} />
            </div>
            <div className="modal-footer">
              <button className="close-btn" onClick={() => setReminderOpen(false)}>Hủy</button>
              <button className="btn-share" onClick={handleSetReminder}>Đặt nhắc nhở</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Popup */}
      {shareOpen && (
        <div className="modal-overlay" onClick={() => setShareOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>Chia sẻ ghi chú</span>
              <button className="icon-btn" onClick={() => setShareOpen(false)}><MdClose size={20} /></button>
            </div>
            <div className="modal-body">
              <label style={{ fontSize: 13, color: "#5f6368" }}>Email người dùng:</label>
              <input className="modal-input" placeholder="Nhập email..." value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)} />
              <label style={{ fontSize: 13, color: "#5f6368" }}>Quyền truy cập:</label>
              <select className="modal-select" value={sharePermission}
                onChange={(e) => setSharePermission(e.target.value)}>
                <option value="View">Chỉ xem</option>
                <option value="Edit">Chỉnh sửa</option>
              </select>
            </div>
            <div className="modal-footer">
              <button className="close-btn" onClick={() => setShareOpen(false)}>Hủy</button>
              <button className="btn-share" onClick={handleShare}>Chia sẻ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div onClick={onClick} className={`nav-item ${active ? "active" : ""}`}>
      <span className="nav-icon">{icon}</span>
      {label}
    </div>
  );
}

function NoteCard({ note, onPin, onStatus, onReminder, onShare, onLabel }) {
  const [hovered, setHovered] = useState(false);
  const bg = note.color && note.color !== "#FFFFFF" && note.color !== "#ffffff" ? note.color : "#fff";

  return (
    <div className="note-card" style={{ backgroundColor: bg }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      {note.is_pinned && (
        <div className="pin-badge"><MdPushPin size={16} color="#B85C00" /></div>
      )}
      {note.title && <div className="note-title">{note.title}</div>}
<div className="note-content">{note.content}</div>
{note.due_time && (
    <div className="note-due-time">
         {new Date(note.due_time).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit", 
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })}
    </div>
)}
      
      {note.labels && note.labels.length > 0 && (
    <div className="label-list">
        {note.labels.map(l => (
            <span key={l.label_id} className="label-badge">
                {l.label_name}
            </span>
        ))}
    </div>
)}
      {hovered && (
        <div className="card-actions">
          <button className="card-btn" title={note.is_pinned ? "Bỏ ghim" : "Ghim"}
            onClick={(e) => { e.stopPropagation(); onPin(note.note_id); }}>
            {note.is_pinned ? <MdPushPin size={16} /> : <MdOutlinePushPin size={16} />}
          </button>
          <button className="card-btn" title="Nhắc nhở"
            onClick={(e) => { e.stopPropagation(); onReminder(note.note_id); }}>
            <MdOutlineNotifications size={16} />
          </button>
           <button className="card-btn" title="Gán nhãn"
        onClick={(e) => { e.stopPropagation(); onLabel(note.note_id, note.labels || []); }}>
        <MdOutlineLabel size={16} />
    </button> 
          <button className="card-btn" title="Chia sẻ"
            onClick={(e) => { e.stopPropagation(); onShare(note.note_id); }}>
            <MdOutlineEdit size={16} />
          </button>
          <button className="card-btn" title="Lưu trữ"
            onClick={(e) => { e.stopPropagation(); onStatus(note.note_id, "Archived"); }}>
            <MdOutlineArchive size={16} />
          </button>
          <button className="card-btn" title="Xóa"
            onClick={(e) => { e.stopPropagation(); onStatus(note.note_id, "Deleted"); }}>
            <MdDeleteOutline size={16} />
          </button>
        </div>
      )}
      
    </div>
    
  );
  
}
