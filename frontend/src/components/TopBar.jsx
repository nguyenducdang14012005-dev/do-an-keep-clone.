import React, { useState, useEffect, useRef } from "react";

export default function TopBar({
  keyword,
  onSearch,
  sortBy,
  setSortBy,
  onRefresh,
  toggleSidebar,
  isOpen,
  toggleMenu,
  isLogin,
  isLogOut,
  pendingShares = [],
  onAcceptShare,
  onRejectShare,
  mySharedNotes = [],
  onRevokeShare,
  adminButton,
  onOpenChangePassword,
  onOpenNotifications,
  acceptedSharedNotes = [],
  onChangePermission = { handleChangePermission },
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [sharedListOpen, setSharedListOpen] = useState(false);
  const notifRef = useRef(null);
  const sharedRef = useRef(null);
  const settingsRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setNotifOpen(false);
      if (sharedRef.current && !sharedRef.current.contains(e.target))
        setSharedListOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const permissionLabel = (p) =>
    ({ view: "Chỉ xem", edit: "Chỉnh sửa", delete: "Toàn quyền" })[p] || p;

  const statusLabel = (s) =>
    ({
      Pending: "Đang chờ",
      Accepted: "Đã chấp nhận",
      Rejected: "Đã từ chối",
      Revoked: "Đã dừng chia sẻ",
    })[s] || s;

  const statusClass = (s) =>
    ({
      Accepted: "status-accepted",
      Rejected: "status-rejected",
      Pending: "status-pending",
      Revoked: "status-revoked",
    })[s] || "";

  // ⚡ ĐÃ CẬP NHẬT: Đếm cả thông báo đổi quyền (Accepted nhưng seen = 0) chưa đọc
  const notifBadgeCount = pendingShares.filter(
    (s) =>
      s.share_status === "Pending" ||
      ((s.share_status === "Revoked" || s.share_status === "Accepted") &&
        !s.seen),
  ).length;

  // ⚡ XỬ LÝ DỮ LIỆU: Lọc ra danh sách những ai đang thực tế phối hợp ghi chú với mình
  const uniqueSharers = Array.from(
    new Set(
      acceptedSharedNotes
        .filter((n) => n.share_status === "Accepted")
        .map((n) => n.shared_by_name || n.shared_by_email)
        .filter(Boolean),
    ),
  );

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button
          className="icon-btn"
          onClick={toggleSidebar}
          title="Mở/đóng sidebar"
        >
          ☰
        </button>
        <span className="topbar-brand">Ghi chú</span>
      </div>

      <div className="search-bar">
        <input
          className="search-input"
          placeholder="Tìm kiếm ghi chú..."
          value={keyword}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* ⚡ HIỂN THỊ THÔNG TIN NGƯỜI CHIA SẺ VỚI MÌNH TRÊN TOPBAR */}
      {uniqueSharers.length > 0 && (
        <div
          className="topbar-sharers"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginLeft: "12px",
            marginRight: "auto",
          }}
        >
          <span
            style={{ fontSize: "13px", color: "#5f6368", fontWeight: "500" }}
            title="Những người đang chia sẻ ghi chú với bạn"
          >
            👥 Đối tác:
          </span>
          {uniqueSharers.map((sharer, index) => (
            <span
              key={index}
              className="sharer-badge"
              title={`Đang nhận chia sẻ từ: ${sharer}`}
              style={{
                background: "#e8f0fe",
                color: "#1a73e8",
                padding: "4px 10px",
                borderRadius: "14px",
                fontSize: "12px",
                fontWeight: "600",
                maxWidth: "120px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {sharer.includes("@") ? sharer.split("@")[0] : sharer}
            </span>
          ))}
        </div>
      )}

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
          <option value="due_asc">Deadline gần nhất</option>
        </select>

        <button className="icon-btn" onClick={onRefresh} title="Làm mới">
          <img
            src="/images/reload.png"
            alt="Thông báo"
            style={{
              width: "18px",
              height: "18px",
              objectFit: "contain",
            }}
          />
        </button>

        {/* ── CHUÔNG: danh sách thông báo chia sẻ ── */}
        <div className="tb-dropdown-wrap" ref={notifRef}>
          <button
            className="icon-btn tb-notif-btn"
            title="Thông báo chia sẻ"
            onClick={() => {
              const next = !notifOpen;
              setNotifOpen(next);
              setSharedListOpen(false);
              if (next) onOpenNotifications?.();
            }}
          >
            <img
              src="/images/bell.png"
              alt="Thông báo"
              style={{
                width: "18px",
                height: "18px",
                objectFit: "contain",
              }}
            />

            {notifBadgeCount > 0 && (
              <span className="tb-badge">{notifBadgeCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="tb-dropdown">
              <div className="tb-dropdown-header">
                <span>Thông báo chia sẻ</span>
                <span className="tb-dropdown-count">
                  {pendingShares.length}
                </span>
              </div>

              {pendingShares.length === 0 ? (
                <div className="tb-dropdown-empty">Không có thông báo mới</div>
              ) : (
                <div className="tb-dropdown-list">
                  {pendingShares.map((s) => {
                    // ⚡ TRƯỜNG HỢP 1: Bị dừng chia sẻ
                    if (s.share_status === "Revoked") {
                      return (
                        <div key={s.share_id} className="tb-share-item">
                          <div className="tb-share-meta">
                            <span className="tb-share-title">
                              <b>{s.shared_by_name || s.shared_by_email}</b> đã{" "}
                              <b>dừng chia sẻ</b>{" "}
                              <b>"{s.title || "Không có tiêu đề"}"</b> với bạn
                            </span>
                            <span className="tb-share-perm">
                              Bạn không còn quyền truy cập ghi chú này
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // ⚡ TRƯỜNG HỢP 2: Thay đổi quyền truy cập (ĐÃ THÊM Ở ĐÂY)
                    if (s.share_status === "Accepted") {
                      return (
                        <div key={s.share_id} className="tb-share-item">
                          <div className="tb-share-meta">
                            <span className="tb-share-title">
                              <b>{s.shared_by_name || s.shared_by_email}</b> đã{" "}
                              <b>thay đổi quyền hạn</b> ghi chú{" "}
                              <b>"{s.title || "Không có tiêu đề"}"</b> của bạn
                              thành <b>{permissionLabel(s.permission)}</b>
                            </span>
                            <span className="tb-share-perm">
                              Giao diện đã cập nhật theo quyền mới
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // TRƯỜNG HỢP 3: Lời mời chia sẻ mới (Pending)
                    return (
                      <div key={s.share_id} className="tb-share-item">
                        <div className="tb-share-meta">
                          <span className="tb-share-title">
                            <b>{s.shared_by_name || s.shared_by_email}</b> chia
                            sẻ <b>"{s.title || "Không có tiêu đề"}"</b>
                          </span>

                          <span className="tb-share-perm">
                            Quyền: {permissionLabel(s.permission)}
                          </span>
                        </div>

                        <div className="tb-share-actions">
                          <button
                            className="tb-btn-accept"
                            onClick={() => {
                              onAcceptShare?.(s.share_id);
                              setNotifOpen(false);
                            }}
                          >
                            Chấp nhận
                          </button>

                          <button
                            className="tb-btn-reject"
                            onClick={() => {
                              onRejectShare?.(s.share_id);
                              setNotifOpen(false);
                            }}
                          >
                            Từ chối
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── NGƯỜI: note mình đã chia sẻ ── */}
        <div className="tb-dropdown-wrap" ref={sharedRef}>
          <button
            className="icon-btn"
            title="Ghi chú đã chia sẻ"
            onClick={() => {
              setSharedListOpen(!sharedListOpen);
              setNotifOpen(false);
            }}
          >
            <img
              src="/images/friends.png"
              alt="Thông báo"
              style={{
                width: "18px",
                height: "18px",
                objectFit: "contain",
              }}
            />
          </button>

          {sharedListOpen && (
            <div className="tb-dropdown tb-dropdown--wide">
              <div className="tb-dropdown-header">
                <span>Ghi chú tôi đã chia sẻ</span>
                <span className="tb-dropdown-count">
                  {mySharedNotes.length}
                </span>
              </div>

              {mySharedNotes.length === 0 ? (
                <div className="tb-dropdown-empty">
                  Bạn chưa chia sẻ ghi chú nào
                </div>
              ) : (
                <div className="tb-dropdown-list">
                  {mySharedNotes.map((s) => (
                    <div key={s.share_id} className="tb-share-item">
                      <div className="tb-share-meta">
                        <span className="tb-share-title">
                          <b>"{s.title || "Không có tiêu đề"}"</b>
                          {" → "}
                          {s.shared_with_name || s.shared_with_email}
                        </span>

                        {/* ⚡ Dropdown Select cho phép sửa quyền trực tiếp */}
                        <span
                          className="tb-share-perm"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            marginTop: "4px",
                          }}
                        >
                          <select
                            value={s.permission}
                            disabled={
                              s.share_status === "Revoked" ||
                              s.share_status === "Rejected"
                            }
                            onChange={async (e) => {
                              const newPerm = e.target.value;
                              if (onChangePermission) {
                                await onChangePermission(s.share_id, newPerm);
                              } else {
                                console.log(
                                  "Cập nhật quyền:",
                                  s.share_id,
                                  "thành",
                                  newPerm,
                                );
                              }
                            }}
                            style={{
                              padding: "2px 4px",
                              borderRadius: "4px",
                              border: "1px solid #dadce0",
                              fontSize: "12px",
                              background: "#fff",
                              color: "#3c4043",
                              cursor: "pointer",
                            }}
                          >
                            <option value="view">Chỉ xem</option>
                            <option value="edit">Chỉnh sửa</option>
                            <option value="delete">Toàn quyền</option>
                          </select>

                          {" · "}
                          <span className={statusClass(s.share_status)}>
                            {statusLabel(s.share_status)}
                          </span>
                        </span>
                      </div>
                      <button
                        className="tb-btn-revoke"
                        onClick={() => onRevokeShare?.(s.share_id)}
                        disabled={s.share_status === "Revoked"}
                      >
                        {s.share_status === "Revoked" ? "Đã dừng" : "Dừng"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── CÀI ĐẶT ── */}
        {adminButton}

        <div className="tb-dropdown-wrap" ref={settingsRef}>
          <button className="icon-btn" title="Cài đặt" onClick={toggleMenu}>
            <img
              src="/images/settings.png"
              alt="Thông báo"
              style={{
                width: "18px",
                height: "18px",
                objectFit: "contain",
              }}
            />
          </button>

          {isOpen && (
            <div className="tb-dropdown">
              <div className="tb-dropdown-header">
                <span>Tài khoản</span>
              </div>
              {isLogin ? (
                <>
                  <div className="tb-user-info">
                    <div className="tb-user-avatar">
                      {(isLogin.fullName ||
                        isLogin.full_name ||
                        "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="tb-user-name">
                        {isLogin.fullName || isLogin.full_name}
                      </div>
                      <div className="tb-user-email">{isLogin.email}</div>
                    </div>
                  </div>
                  <div className="tb-dropdown-divider" />
                  <button
                    className="tb-menu-item"
                    onClick={() => {
                      onOpenChangePassword?.();
                      toggleMenu();
                    }}
                  >
                    <img
                      src="/images/reset-password.png"
                      alt="Đổi mật khẩu"
                      style={{
                        width: "18px",
                        height: "18px",
                        objectFit: "contain",
                      }}
                    />{" "}
                    Đổi mật khẩu
                  </button>
                  <button
                    className="tb-menu-item tb-menu-item--danger"
                    onClick={() => {
                      isLogOut();
                      toggleMenu();
                    }}
                  >
                    <img
                      src="/images/logout.png"
                      alt="Thông báo"
                      style={{
                        width: "18px",
                        height: "18px",
                        objectFit: "contain",
                      }}
                    />{" "}
                    Đăng xuất
                  </button>
                </>
              ) : (
                <button className="tb-menu-item" onClick={toggleMenu}>
                  <img
                    src="/images/log-in.png"
                    alt="Thông báo"
                    style={{
                      width: "18px",
                      height: "18px",
                      objectFit: "contain",
                    }}
                  />{" "}
                  Đăng nhập
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
