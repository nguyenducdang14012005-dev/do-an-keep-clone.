import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Ban,
  CheckCircle2,
  DatabaseBackup,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  XCircle,
} from "lucide-react";
import { api, getApiError } from "../api";
import "./admin.css";

const statusOptions = ["All", "Active", "Inactive", "Banned"];
const statusLabels = {
  All: "Tất cả",
  Active: "Active",
  Inactive: "Inactive",
  Banned: "Banned",
};

const formatDate = (value) => {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const numberValue = (value) => Number(value || 0).toLocaleString("vi-VN");

export default function AdminDashboardPage({ onBack, authToken, authUser, onLogout }) {
  // --- Auth: dùng chung token/user đã đăng nhập ở trang chính (Single Sign-On) ---
  // Không còn đăng nhập riêng cho Admin — nếu tài khoản đang đăng nhập có quyền
  // Admin, HomePage mới cho phép bấm vào trang này, nên ở đây chỉ cần dùng lại
  // token + user đã có sẵn.
  const token = authToken || "";
  const adminUser = authUser || null;

  // --- Dashboard state ---
  const [message, setMessage] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [userKeyword, setUserKeyword] = useState("");
  const [appliedUserKeyword, setAppliedUserKeyword] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [appliedAuditAction, setAppliedAuditAction] = useState("");
  const [stats, setStats] = useState(null);
  const [roles, setRoles] = useState([]);
  const [usersData, setUsersData] = useState({ data: [], pagination: null });
  const [auditData, setAuditData] = useState({ data: [], pagination: null });
  const [devicesData, setDevicesData] = useState({ data: [], pagination: null });
  const [backupsData, setBackupsData] = useState({ data: [], pagination: null });
  const [backupPath, setBackupPath] = useState(
    `D:\\backup_${new Date().toISOString().slice(0, 10).replaceAll("-", "")}.bak`
  );
  const [executeBackup, setExecuteBackup] = useState(false);
  const [workingKey, setWorkingKey] = useState("");

  const isAdmin = adminUser?.roles?.includes("Admin");

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  const statItems = useMemo(
    () => [
      { key: "total_users", label: "Tổng người dùng", icon: Users, tone: "teal" },
      { key: "active_users", label: "Active", icon: CheckCircle2, tone: "green" },
      { key: "inactive_users", label: "Inactive", icon: XCircle, tone: "amber" },
      { key: "banned_users", label: "Banned", icon: Ban, tone: "red" },
      { key: "total_roles", label: "Vai trò", icon: ShieldCheck, tone: "indigo" },
      { key: "total_devices", label: "Thiết bị", icon: KeyRound, tone: "amber" },
      { key: "total_audit_logs", label: "Audit logs", icon: Activity, tone: "gray" },
      { key: "total_backups", label: "Bản backup", icon: DatabaseBackup, tone: "teal" },
    ],
    []
  );

  // Đăng xuất = đăng xuất khỏi toàn bộ app (vì giờ chỉ có 1 session chung)
  const handleLogout = () => {
    onLogout?.();
  };

  const loadAdminData = useCallback(
    async (headers = authHeaders) => {
      setDashboardLoading(true);
      setMessage(null);
      try {
        const userParams = new URLSearchParams({ page: "1", limit: "20" });
        if (statusFilter !== "All") userParams.set("status", statusFilter);
        if (appliedUserKeyword) userParams.set("keyword", appliedUserKeyword);

        const auditParams = new URLSearchParams({ page: "1", limit: "10" });
        if (appliedAuditAction) auditParams.set("action", appliedAuditAction);

        const [
          statsRes,
          usersRes,
          rolesRes,
          logsRes,
          devicesRes,
          backupsRes,
        ] = await Promise.all([
          api.get("/admin/dashboard", { headers }),
          api.get(`/admin/users?${userParams}`, { headers }),
          api.get("/admin/roles", { headers }),
          api.get(`/admin/audit-logs?${auditParams}`, { headers }),
          api.get("/admin/devices?page=1&limit=8", { headers }),
          api.get("/admin/backups?page=1&limit=6", { headers }),
        ]);

        setStats(statsRes.data.data);
        setUsersData({ data: usersRes.data.data, pagination: usersRes.data.pagination });
        setRoles(rolesRes.data.data);
        setAuditData({ data: logsRes.data.data, pagination: logsRes.data.pagination });
        setDevicesData({ data: devicesRes.data.data, pagination: devicesRes.data.pagination });
        setBackupsData({ data: backupsRes.data.data, pagination: backupsRes.data.pagination });
      } catch (error) {
        setMessage({ type: "error", text: getApiError(error) });
      } finally {
        setDashboardLoading(false);
      }
    },
    [appliedAuditAction, appliedUserKeyword, authHeaders, statusFilter]
  );

  useEffect(() => {
    if (isAdmin) void loadAdminData();
  }, [isAdmin, loadAdminData]);

  // --- Handlers ---
  const handleUserSearch = (e) => {
    e.preventDefault();
    setAppliedUserKeyword(userKeyword.trim());
  };

  const handleAuditSearch = (e) => {
    e.preventDefault();
    setAppliedAuditAction(auditAction.trim());
  };

  const updateUserStatus = async (targetUserId, nextStatus) => {
    setWorkingKey(`status:${targetUserId}:${nextStatus}`);
    setMessage(null);
    try {
      await api.patch(
        `/admin/users/${targetUserId}/status`,
        { status: nextStatus },
        { headers: authHeaders }
      );
      await loadAdminData();
      setMessage({ type: "success", text: `Đã chuyển tài khoản sang ${nextStatus}.` });
    } catch (error) {
      setMessage({ type: "error", text: getApiError(error) });
    } finally {
      setWorkingKey("");
    }
  };

  const updateUserRoles = async (targetUser, roleName, enabled) => {
    const nextRoles = enabled
      ? [...new Set([...targetUser.roles, roleName])]
      : targetUser.roles.filter((r) => r !== roleName);
    if (nextRoles.length === 0) {
      setMessage({ type: "error", text: "Người dùng phải có ít nhất một vai trò." });
      return;
    }
    setWorkingKey(`roles:${targetUser.user_id}:${roleName}`);
    setMessage(null);
    try {
      await api.put(
        `/admin/users/${targetUser.user_id}/roles`,
        { roles: nextRoles },
        { headers: authHeaders }
      );
      await loadAdminData();
      setMessage({ type: "success", text: `Đã cập nhật vai trò cho ${targetUser.email}.` });
    } catch (error) {
      setMessage({ type: "error", text: getApiError(error) });
    } finally {
      setWorkingKey("");
    }
  };

  const createBackup = async (e) => {
    e.preventDefault();
    setDashboardLoading(true);
    setMessage(null);
    try {
      await api.post(
        "/admin/backups",
        { file_path: backupPath, execute_backup: executeBackup },
        { headers: authHeaders }
      );
      await loadAdminData();
      setMessage({
        type: "success",
        text: executeBackup ? "Đã tạo và ghi nhận backup." : "Đã ghi nhận bản sao lưu.",
      });
    } catch (error) {
      setMessage({ type: "error", text: getApiError(error) });
      void loadAdminData();
    } finally {
      setDashboardLoading(false);
    }
  };

  // ============================================================
  // RENDER: Login screen
  // ============================================================
  // Trường hợp hiếm: vào được trang này nhưng tài khoản lại không có quyền Admin
  // (về lý thuyết HomePage đã ẩn nút này nếu không có quyền, đây chỉ là lớp bảo vệ thêm)
  if (!token || !isAdmin) {
    return (
      <main className="auth-shell">
        <section className="auth-panel" aria-labelledby="auth-title">
          <button
            className="ghost-action"
            type="button"
            onClick={onBack}
            style={{ marginBottom: 12, alignSelf: "flex-start" }}
          >
            <ArrowLeft size={16} />
            Về trang chủ
          </button>

          <div className="brand-mark">
            <ShieldCheck size={30} aria-hidden="true" />
            <div>
              <span>Google Keep Clone</span>
              <strong>Admin Security</strong>
            </div>
          </div>

          <h1 id="auth-title">Không có quyền truy cập</h1>
          <p>Tài khoản hiện tại không có quyền Admin.</p>
        </section>
      </main>
    );
  }

  // ============================================================
  // RENDER: Dashboard
  // ============================================================
  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="brand-mark compact">
          <ShieldCheck size={28} aria-hidden="true" />
          <div>
            <span>Admin</span>
            <strong>{adminUser.full_name}</strong>
          </div>
        </div>
        <nav className="side-nav" aria-label="Admin">
          <a href="#dashboard" className="active">
            <LayoutDashboard size={18} />
            Dashboard
          </a>
          <a href="#users">
            <Users size={18} />
            Người dùng
          </a>
          <a href="#devices">
            <HardDrive size={18} />
            Thiết bị
          </a>
          <a href="#audit">
            <Activity size={18} />
            Audit Logs
          </a>
          <a href="#backup">
            <DatabaseBackup size={18} />
            Backup
          </a>
        </nav>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Nút quay về HomePage */}
          <button className="ghost-action" type="button" onClick={onBack}>
            <ArrowLeft size={18} />
            Về trang chủ
          </button>
          <button className="ghost-action" type="button" onClick={handleLogout}>
            <LogOut size={18} />
            Đăng xuất Admin
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Quản trị hệ thống</p>
            <h1>Dashboard bảo mật cốt lõi</h1>
          </div>
          <div className="account-chip">
            <strong>{adminUser.full_name}</strong>
            <span>{adminUser.roles?.join(", ")}</span>
          </div>
        </header>

        {message && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}

        {!isAdmin ? (
          <section className="empty-state">
            <ShieldCheck size={34} />
            <h2>Tài khoản chưa có quyền Admin</h2>
            <p>{adminUser.email}</p>
          </section>
        ) : (
          <>
            {/* ── STATS ── */}
            <section className="stats-grid" id="dashboard">
              {statItems.map(({ key, label, icon: Icon, tone }) => (
                <article className={`stat-card ${tone}`} key={key}>
                  <Icon size={22} />
                  <span>{label}</span>
                  <strong>{numberValue(stats?.[key])}</strong>
                </article>
              ))}
              <article className="stat-card wide">
                <DatabaseBackup size={22} />
                <span>Backup gần nhất</span>
                <strong>{formatDate(stats?.last_backup_at)}</strong>
              </article>
              <article className="stat-card wide">
                <Activity size={22} />
                <span>Audit gần nhất</span>
                <strong>{formatDate(stats?.last_audit_at)}</strong>
              </article>
            </section>

            {/* ── USERS ── */}
            <section className="table-section" id="users">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Users, Roles, User_Roles</p>
                  <h2>Danh sách người dùng</h2>
                </div>
                <div className="toolbar">
                  <div className="segmented">
                    {statusOptions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={statusFilter === s ? "active" : ""}
                        onClick={() => setStatusFilter(s)}
                      >
                        {statusLabels[s]}
                      </button>
                    ))}
                  </div>
                  <form className="search-form" onSubmit={handleUserSearch}>
                    <input
                      value={userKeyword}
                      onChange={(e) => setUserKeyword(e.target.value)}
                      placeholder="Email hoặc họ tên"
                    />
                    <button className="icon-action" type="submit">
                      <Search size={18} />
                      <span>Tìm</span>
                    </button>
                  </form>
                  <button
                    className="icon-action"
                    type="button"
                    onClick={() => loadAdminData()}
                    disabled={dashboardLoading}
                  >
                    <RefreshCw className={dashboardLoading ? "spin" : ""} size={18} />
                    <span>Làm mới</span>
                  </button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Họ tên</th>
                      <th>Vai trò</th>
                      <th>Trạng thái</th>
                      <th>Thiết bị</th>
                      <th>Đăng nhập</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData.data.map((item) => (
                      <tr key={item.user_id}>
                        <td>{item.email}</td>
                        <td>{item.full_name}</td>
                        <td>
                          <div className="role-editor">
                            {roles.map((role) => (
                              <label className="role-toggle" key={role.role_id}>
                                <input
                                  type="checkbox"
                                  checked={item.roles.includes(role.role_name)}
                                  disabled={Boolean(workingKey)}
                                  onChange={(e) =>
                                    updateUserRoles(item, role.role_name, e.target.checked)
                                  }
                                />
                                <span>{role.role_name}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`status-pill ${String(item.status).toLowerCase()}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>{numberValue(item.total_devices)}</td>
                        <td>{formatDate(item.last_login_at)}</td>
                        <td>
                          <div className="row-actions">
                            {item.status !== "Active" ? (
                              <button
                                className="row-action activate"
                                type="button"
                                disabled={Boolean(workingKey)}
                                onClick={() => updateUserStatus(item.user_id, "Active")}
                              >
                                <CheckCircle2 size={16} />
                                Active
                              </button>
                            ) : (
                              <>
                                <button
                                  className="row-action inactive"
                                  type="button"
                                  disabled={Boolean(workingKey)}
                                  onClick={() => updateUserStatus(item.user_id, "Inactive")}
                                >
                                  <XCircle size={16} />
                                  Inactive
                                </button>
                                <button
                                  className="row-action ban"
                                  type="button"
                                  disabled={Boolean(workingKey)}
                                  onClick={() => updateUserStatus(item.user_id, "Banned")}
                                >
                                  <Ban size={16} />
                                  Ban
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="table-note">
                Tổng: {numberValue(usersData.pagination?.total ?? usersData.data.length)} tài khoản
              </p>
            </section>

            {/* ── DEVICES ── */}
            <section className="table-section" id="devices">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">User_Devices</p>
                  <h2>Thiết bị đăng nhập</h2>
                </div>
              </div>
              <div className="table-wrap compact-table">
                <table>
                  <thead>
                    <tr>
                      <th>Người dùng</th>
                      <th>Thiết bị</th>
                      <th>IP</th>
                      <th>User agent</th>
                      <th>Đăng nhập</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devicesData.data.map((device) => (
                      <tr key={device.device_id}>
                        <td>{device.email}</td>
                        <td>{device.device_name}</td>
                        <td>{device.ip_address || "N/A"}</td>
                        <td className="muted-cell">{device.user_agent || "N/A"}</td>
                        <td>{formatDate(device.last_login_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="table-note">
                Tổng: {numberValue(devicesData.pagination?.total ?? devicesData.data.length)} thiết bị
              </p>
            </section>

            {/* ── AUDIT + BACKUP ── */}
            <section className="split-section">
              <div className="table-section" id="audit">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Audit_Logs</p>
                    <h2>Nhật ký gần đây</h2>
                  </div>
                  <form className="search-form compact-search" onSubmit={handleAuditSearch}>
                    <input
                      value={auditAction}
                      onChange={(e) => setAuditAction(e.target.value)}
                      placeholder="Action"
                    />
                    <button className="icon-action" type="submit">
                      <SlidersHorizontal size={18} />
                      <span>Lọc</span>
                    </button>
                  </form>
                </div>
                <div className="log-list">
                  {auditData.data.map((log) => (
                    <article className="log-item" key={log.log_id}>
                      <div>
                        <strong>{log.action}</strong>
                        <span>
                          {log.email || "system"} · {log.ip_address || "N/A"}
                        </span>
                      </div>
                      <time>{formatDate(log.timestamp)}</time>
                    </article>
                  ))}
                </div>
                <p className="table-note">
                  Tổng: {numberValue(auditData.pagination?.total ?? auditData.data.length)} log
                </p>
              </div>

              <div className="table-section" id="backup">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Backups</p>
                    <h2>Sao lưu dữ liệu</h2>
                  </div>
                </div>
                <form className="backup-form" onSubmit={createBackup}>
                  <label>
                    Đường dẫn file
                    <input
                      value={backupPath}
                      onChange={(e) => setBackupPath(e.target.value)}
                      required
                    />
                  </label>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={executeBackup}
                      onChange={(e) => setExecuteBackup(e.target.checked)}
                    />
                    <span>Chạy BACKUP DATABASE</span>
                  </label>
                  <button className="primary-action" type="submit" disabled={dashboardLoading}>
                    {dashboardLoading ? (
                      <Loader2 className="spin" size={18} />
                    ) : (
                      <DatabaseBackup size={18} />
                    )}
                    Backup
                  </button>
                </form>
                <div className="backup-list">
                  {backupsData.data.map((backup) => (
                    <article className="backup-item" key={backup.backup_id}>
                      <div>
                        <strong>{backup.file_path}</strong>
                        <span>
                          {backup.created_by_email || "system"} ·{" "}
                          {formatDate(backup.created_at)}
                        </span>
                      </div>
                      <span className={`status-pill ${String(backup.status).toLowerCase()}`}>
                        {backup.status}
                      </span>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
