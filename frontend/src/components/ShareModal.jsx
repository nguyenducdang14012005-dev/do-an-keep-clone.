import { useEffect, useState } from "react";
import { getShares, removeShare } from "../services/shareService";

const PERMISSION_LABEL = {
  view: "Chỉ xem",
  edit: "Chỉnh sửa",
  delete: "Toàn quyền",
};

export default function ShareModal({
  noteId,
  email,
  setEmail,
  permission,
  setPermission,
  onClose,
  onSave,
}) {
  const [sharedList, setSharedList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [revoking, setRevoking] = useState(null); // share_id đang xử lý

  // Load danh sách người đang được chia sẻ
  const loadList = async () => {
    if (!noteId) return;
    setListLoading(true);
    try {
      const data = await getShares(noteId);
      setSharedList(Array.isArray(data) ? data : []);
    } catch {
      setSharedList([]);
    }
    setListLoading(false);
  };

  useEffect(() => {
    loadList();
  }, [noteId]);

  const handleRevoke = async (share_id) => {
    setRevoking(share_id);
    try {
      await removeShare(share_id);
      setSharedList((prev) => prev.filter((s) => s.share_id !== share_id));
    } catch {
      // ignore
    }
    setRevoking(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ width: 440, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <span>Chia sẻ ghi chú</span>
          <button className="icon-btn" onClick={onClose}>✖</button>
        </div>

        {/* Form gửi lời mời */}
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 13, color: "#5f6368" }}>Email người dùng:</label>
          <input
            className="modal-input"
            type="email"
            placeholder="Nhập email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label style={{ fontSize: 13, color: "#5f6368" }}>Quyền truy cập:</label>
          <select
            className="modal-select"
            value={permission}
            onChange={(e) => setPermission(e.target.value)}
          >
            <option value="view">Chỉ xem</option>
            <option value="edit">Chỉnh sửa</option>
            <option value="delete">Toàn quyền (có thể xóa)</option>
          </select>
        </div>

        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>Hủy</button>
          <button className="btn-share" onClick={onSave}>Gửi lời mời</button>
        </div>

        {/* Danh sách đang được chia sẻ */}
        <div
          style={{
            borderTop: "1px solid #e8eaed",
            padding: "14px 16px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#3c4043" }}>
            Đang chia sẻ với
          </p>

          {listLoading ? (
            <p style={{ fontSize: 13, color: "#80868b", margin: "6px 0" }}>Đang tải...</p>
          ) : sharedList.length === 0 ? (
            <p style={{ fontSize: 13, color: "#80868b", margin: "6px 0" }}>
              Chưa chia sẻ với ai.
            </p>
          ) : (
            sharedList.map((s) => (
              <div
                key={s.share_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "#f8f9fa",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#3c4043" }}>
                    {s.email || s.full_name || "—"}
                  </span>
                  <span style={{ fontSize: 12, color: "#80868b" }}>
                    {PERMISSION_LABEL[s.permission] || s.permission} ·{" "}
                    <span
                      style={{
                        color:
                          s.share_status === "Accepted"
                            ? "#1aa260"
                            : s.share_status === "Rejected"
                            ? "#d64545"
                            : "#c98a02",
                      }}
                    >
                      {s.share_status === "Accepted"
                        ? "Đã chấp nhận"
                        : s.share_status === "Rejected"
                        ? "Đã từ chối"
                        : "Đang chờ"}
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => handleRevoke(s.share_id)}
                  disabled={revoking === s.share_id}
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid #e8eaed",
                    background: "white",
                    color: "#d64545",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {revoking === s.share_id ? "..." : "Dừng chia sẻ"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
