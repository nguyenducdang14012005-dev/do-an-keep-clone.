import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Ban,
  CheckCircle2,
  DatabaseBackup,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react'
import { api, getApiError } from './api'
import './App.css'

const emptyLoginForm = {
  email: 'quocky@cnpm.local',
  password: 'Admin@123',
  device_name: 'Chrome on Windows - CNPM demo',
}

const emptyRegisterForm = {
  full_name: '',
  email: '',
  password: '',
}

const statusOptions = ['All', 'Active', 'Inactive', 'Banned']
const statusLabels = {
  All: 'Tất cả',
  Active: 'Active',
  Inactive: 'Inactive',
  Banned: 'Banned',
}

const formatDate = (value) => {
  if (!value) return 'Chưa có'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Chưa có'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

const numberValue = (value) => Number(value || 0).toLocaleString('vi-VN')

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('auth_token') || '')
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [loginForm, setLoginForm] = useState(emptyLoginForm)
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm)
  const [message, setMessage] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  const [userKeyword, setUserKeyword] = useState('')
  const [appliedUserKeyword, setAppliedUserKeyword] = useState('')
  const [auditAction, setAuditAction] = useState('')
  const [appliedAuditAction, setAppliedAuditAction] = useState('')
  const [stats, setStats] = useState(null)
  const [roles, setRoles] = useState([])
  const [usersData, setUsersData] = useState({ data: [], pagination: null })
  const [auditData, setAuditData] = useState({ data: [], pagination: null })
  const [devicesData, setDevicesData] = useState({ data: [], pagination: null })
  const [backupsData, setBackupsData] = useState({ data: [], pagination: null })
  const [backupPath, setBackupPath] = useState(
    `D:\\2026\\CNPM\\backup_google_keep_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.bak`,
  )
  const [executeBackup, setExecuteBackup] = useState(false)
  const [workingKey, setWorkingKey] = useState('')

  const isAdmin = user?.roles?.includes('Admin')

  const authHeaders = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [token])

  const statItems = useMemo(() => {
    return [
      { key: 'total_users', label: 'Tổng người dùng', icon: Users, tone: 'teal' },
      { key: 'active_users', label: 'Active', icon: CheckCircle2, tone: 'green' },
      { key: 'inactive_users', label: 'Inactive', icon: XCircle, tone: 'amber' },
      { key: 'banned_users', label: 'Banned', icon: Ban, tone: 'red' },
      { key: 'total_roles', label: 'Vai trò', icon: ShieldCheck, tone: 'indigo' },
      { key: 'total_devices', label: 'Thiết bị', icon: KeyRound, tone: 'amber' },
      { key: 'total_audit_logs', label: 'Audit logs', icon: Activity, tone: 'gray' },
      { key: 'total_backups', label: 'Bản backup', icon: DatabaseBackup, tone: 'teal' },
    ]
  }, [])

  const setSession = (nextToken, nextUser) => {
    setToken(nextToken)
    setUser(nextUser)
    sessionStorage.setItem('auth_token', nextToken)
  }

  const clearSession = () => {
    setToken('')
    setUser(null)
    setStats(null)
    setRoles([])
    setUsersData({ data: [], pagination: null })
    setAuditData({ data: [], pagination: null })
    setDevicesData({ data: [], pagination: null })
    setBackupsData({ data: [], pagination: null })
    sessionStorage.removeItem('auth_token')
  }

  const loadAdminData = useCallback(async (headers = authHeaders) => {
    setDashboardLoading(true)
    setMessage(null)
    try {
      const userParams = new URLSearchParams({ page: '1', limit: '20' })
      if (statusFilter !== 'All') userParams.set('status', statusFilter)
      if (appliedUserKeyword) userParams.set('keyword', appliedUserKeyword)

      const auditParams = new URLSearchParams({ page: '1', limit: '10' })
      if (appliedAuditAction) auditParams.set('action', appliedAuditAction)

      const [statsResponse, usersResponse, rolesResponse, logsResponse, devicesResponse, backupsResponse] =
        await Promise.all([
          api.get('/admin/dashboard', { headers }),
          api.get(`/admin/users?${userParams.toString()}`, { headers }),
          api.get('/admin/roles', { headers }),
          api.get(`/admin/audit-logs?${auditParams.toString()}`, { headers }),
          api.get('/admin/devices?page=1&limit=8', { headers }),
          api.get('/admin/backups?page=1&limit=6', { headers }),
        ])

      setStats(statsResponse.data.data)
      setUsersData({
        data: usersResponse.data.data,
        pagination: usersResponse.data.pagination,
      })
      setRoles(rolesResponse.data.data)
      setAuditData({
        data: logsResponse.data.data,
        pagination: logsResponse.data.pagination,
      })
      setDevicesData({
        data: devicesResponse.data.data,
        pagination: devicesResponse.data.pagination,
      })
      setBackupsData({
        data: backupsResponse.data.data,
        pagination: backupsResponse.data.pagination,
      })
    } catch (error) {
      setMessage({ type: 'error', text: getApiError(error) })
    } finally {
      setDashboardLoading(false)
    }
  }, [appliedAuditAction, appliedUserKeyword, authHeaders, statusFilter])

  useEffect(() => {
    if (!token || user) return

    let cancelled = false
    api
      .get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!cancelled) setUser(response.data.data)
      })
      .catch(() => {
        if (!cancelled) clearSession()
      })

    return () => {
      cancelled = true
    }
  }, [token, user])

  useEffect(() => {
    if (!isAdmin) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAdminData()
  }, [isAdmin, loadAdminData])

  const handleLogin = async (event) => {
    event.preventDefault()
    setAuthLoading(true)
    setMessage(null)
    try {
      const response = await api.post('/auth/login', loginForm)
      const data = response.data.data
      setSession(data.token, data.user)
      setMessage({ type: 'success', text: `Đăng nhập thành công: ${data.user.full_name}` })
    } catch (error) {
      setMessage({ type: 'error', text: getApiError(error) })
    } finally {
      setAuthLoading(false)
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    setAuthLoading(true)
    setMessage(null)
    try {
      await api.post('/auth/register', registerForm)
      setRegisterForm(emptyRegisterForm)
      setAuthMode('login')
      setMessage({ type: 'success', text: 'Tạo tài khoản thành công, có thể đăng nhập.' })
    } catch (error) {
      setMessage({ type: 'error', text: getApiError(error) })
    } finally {
      setAuthLoading(false)
    }
  }

  const handleUserSearch = (event) => {
    event.preventDefault()
    setAppliedUserKeyword(userKeyword.trim())
  }

  const handleAuditSearch = (event) => {
    event.preventDefault()
    setAppliedAuditAction(auditAction.trim())
  }

  const updateUserStatus = async (targetUserId, nextStatus) => {
    setWorkingKey(`status:${targetUserId}:${nextStatus}`)
    setMessage(null)
    try {
      await api.patch(
        `/admin/users/${targetUserId}/status`,
        { status: nextStatus },
        { headers: authHeaders },
      )
      await loadAdminData()
      setMessage({ type: 'success', text: `Đã chuyển tài khoản sang trạng thái ${nextStatus}.` })
    } catch (error) {
      setMessage({ type: 'error', text: getApiError(error) })
    } finally {
      setWorkingKey('')
    }
  }

  const updateUserRoles = async (targetUser, roleName, enabled) => {
    const nextRoles = enabled
      ? [...new Set([...targetUser.roles, roleName])]
      : targetUser.roles.filter((role) => role !== roleName)

    if (nextRoles.length === 0) {
      setMessage({ type: 'error', text: 'Người dùng phải có ít nhất một vai trò.' })
      return
    }

    setWorkingKey(`roles:${targetUser.user_id}:${roleName}`)
    setMessage(null)
    try {
      await api.put(`/admin/users/${targetUser.user_id}/roles`, { roles: nextRoles }, { headers: authHeaders })
      await loadAdminData()
      setMessage({ type: 'success', text: `Đã cập nhật vai trò cho ${targetUser.email}.` })
    } catch (error) {
      setMessage({ type: 'error', text: getApiError(error) })
    } finally {
      setWorkingKey('')
    }
  }

  const createBackup = async (event) => {
    event.preventDefault()
    setDashboardLoading(true)
    setMessage(null)
    try {
      await api.post(
        '/admin/backups',
        { file_path: backupPath, execute_backup: executeBackup },
        { headers: authHeaders },
      )
      await loadAdminData()
      setMessage({ type: 'success', text: executeBackup ? 'Đã tạo và ghi nhận backup.' : 'Đã ghi nhận bản sao lưu dữ liệu.' })
    } catch (error) {
      setMessage({ type: 'error', text: getApiError(error) })
      void loadAdminData()
    } finally {
      setDashboardLoading(false)
    }
  }

  if (!token || !user) {
    return (
      <main className="auth-shell">
        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="brand-mark">
            <ShieldCheck size={30} aria-hidden="true" />
            <div>
              <span>Google Keep Clone</span>
              <strong>Admin Security</strong>
            </div>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Chọn biểu mẫu">
            <button
              className={authMode === 'login' ? 'active' : ''}
              type="button"
              onClick={() => setAuthMode('login')}
            >
              <Lock size={18} aria-hidden="true" />
              Đăng nhập
            </button>
            <button
              className={authMode === 'register' ? 'active' : ''}
              type="button"
              onClick={() => setAuthMode('register')}
            >
              <UserPlus size={18} aria-hidden="true" />
              Đăng ký
            </button>
          </div>

          <h1 id="auth-title">{authMode === 'login' ? 'Đăng nhập hệ thống' : 'Tạo tài khoản mới'}</h1>

          {message && <div className={`message ${message.type}`}>{message.text}</div>}

          {authMode === 'login' ? (
            <form className="form-stack" onSubmit={handleLogin}>
              <label>
                Email
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                  required
                />
              </label>
              <label>
                Mật khẩu
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                  required
                />
              </label>
              <label>
                Thiết bị
                <input
                  value={loginForm.device_name}
                  onChange={(event) => setLoginForm({ ...loginForm, device_name: event.target.value })}
                />
              </label>
              <button className="primary-action" type="submit" disabled={authLoading}>
                {authLoading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Lock size={18} aria-hidden="true" />}
                Đăng nhập
              </button>
            </form>
          ) : (
            <form className="form-stack" onSubmit={handleRegister}>
              <label>
                Họ tên
                <input
                  value={registerForm.full_name}
                  onChange={(event) => setRegisterForm({ ...registerForm, full_name: event.target.value })}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })}
                  required
                />
              </label>
              <label>
                Mật khẩu
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
                  minLength={8}
                  maxLength={72}
                  required
                />
              </label>
              <button className="primary-action" type="submit" disabled={authLoading}>
                {authLoading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <UserPlus size={18} aria-hidden="true" />}
                Đăng ký
              </button>
            </form>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="brand-mark compact">
          <ShieldCheck size={28} aria-hidden="true" />
          <div>
            <span>Admin</span>
            <strong>Quốc Kỳ</strong>
          </div>
        </div>
        <nav className="side-nav" aria-label="Admin">
          <a href="#dashboard" className="active">
            <LayoutDashboard size={18} aria-hidden="true" />
            Dashboard
          </a>
          <a href="#users">
            <Users size={18} aria-hidden="true" />
            Người dùng
          </a>
          <a href="#devices">
            <HardDrive size={18} aria-hidden="true" />
            Thiết bị
          </a>
          <a href="#audit">
            <Activity size={18} aria-hidden="true" />
            Audit Logs
          </a>
          <a href="#backup">
            <DatabaseBackup size={18} aria-hidden="true" />
            Backup
          </a>
        </nav>
        <button className="ghost-action" type="button" onClick={clearSession}>
          <LogOut size={18} aria-hidden="true" />
          Đăng xuất
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Quản trị hệ thống</p>
            <h1>Dashboard bảo mật cốt lõi</h1>
          </div>
          <div className="account-chip">
            <strong>{user.full_name}</strong>
            <span>{user.roles.join(', ')}</span>
          </div>
        </header>

        {message && <div className={`message ${message.type}`}>{message.text}</div>}

        {!isAdmin ? (
          <section className="empty-state">
            <ShieldCheck size={34} aria-hidden="true" />
            <h2>Tài khoản chưa có quyền Admin</h2>
            <p>{user.email}</p>
          </section>
        ) : (
          <>
            <section className="stats-grid" id="dashboard" aria-label="Thống kê quản trị">
              {statItems.map((item) => {
                const Icon = item.icon
                return (
                  <article className={`stat-card ${item.tone}`} key={item.key}>
                    <Icon size={22} aria-hidden="true" />
                    <span>{item.label}</span>
                    <strong>{numberValue(stats?.[item.key])}</strong>
                  </article>
                )
              })}
              <article className="stat-card wide">
                <DatabaseBackup size={22} aria-hidden="true" />
                <span>Backup gần nhất</span>
                <strong>{formatDate(stats?.last_backup_at)}</strong>
              </article>
              <article className="stat-card wide">
                <Activity size={22} aria-hidden="true" />
                <span>Audit gần nhất</span>
                <strong>{formatDate(stats?.last_audit_at)}</strong>
              </article>
            </section>

            <section className="table-section" id="users">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Users, Roles, User_Roles</p>
                  <h2>Danh sách người dùng</h2>
                </div>
                <div className="toolbar">
                  <div className="segmented" aria-label="Lọc trạng thái">
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={statusFilter === status ? 'active' : ''}
                        onClick={() => setStatusFilter(status)}
                      >
                        {statusLabels[status]}
                      </button>
                    ))}
                  </div>
                  <form className="search-form" onSubmit={handleUserSearch}>
                    <input
                      value={userKeyword}
                      onChange={(event) => setUserKeyword(event.target.value)}
                      placeholder="Email hoặc họ tên"
                    />
                    <button className="icon-action" type="submit">
                      <Search size={18} aria-hidden="true" />
                      <span>Tìm</span>
                    </button>
                  </form>
                  <button className="icon-action" type="button" onClick={() => loadAdminData()} disabled={dashboardLoading}>
                    <RefreshCw className={dashboardLoading ? 'spin' : ''} size={18} aria-hidden="true" />
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
                      <th>Lần đăng nhập</th>
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
                                  onChange={(event) => updateUserRoles(item, role.role_name, event.target.checked)}
                                />
                                <span>{role.role_name}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`status-pill ${String(item.status).toLowerCase()}`}>{item.status}</span>
                        </td>
                        <td>{numberValue(item.total_devices)}</td>
                        <td>{formatDate(item.last_login_at)}</td>
                        <td>
                          <div className="row-actions">
                            {item.status !== 'Active' ? (
                              <button
                                className="row-action activate"
                                type="button"
                                disabled={Boolean(workingKey)}
                                onClick={() => updateUserStatus(item.user_id, 'Active')}
                              >
                                <CheckCircle2 size={16} aria-hidden="true" />
                                Active
                              </button>
                            ) : (
                              <>
                                <button
                                  className="row-action inactive"
                                  type="button"
                                  disabled={Boolean(workingKey)}
                                  onClick={() => updateUserStatus(item.user_id, 'Inactive')}
                                >
                                  <XCircle size={16} aria-hidden="true" />
                                  Inactive
                                </button>
                                <button
                                  className="row-action ban"
                                  type="button"
                                  disabled={Boolean(workingKey)}
                                  onClick={() => updateUserStatus(item.user_id, 'Banned')}
                                >
                                  <Ban size={16} aria-hidden="true" />
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
                      <th>Lần đăng nhập</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devicesData.data.map((device) => (
                      <tr key={device.device_id}>
                        <td>{device.email}</td>
                        <td>{device.device_name}</td>
                        <td>{device.ip_address || 'N/A'}</td>
                        <td className="muted-cell">{device.user_agent || 'N/A'}</td>
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
                      onChange={(event) => setAuditAction(event.target.value)}
                      placeholder="Action"
                    />
                    <button className="icon-action" type="submit">
                      <SlidersHorizontal size={18} aria-hidden="true" />
                      <span>Lọc</span>
                    </button>
                  </form>
                </div>
                <div className="log-list">
                  {auditData.data.map((log) => (
                    <article className="log-item" key={log.log_id}>
                      <div>
                        <strong>{log.action}</strong>
                        <span>{log.email || 'system'} · {log.ip_address || 'N/A'}</span>
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
                    <input value={backupPath} onChange={(event) => setBackupPath(event.target.value)} required />
                  </label>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={executeBackup}
                      onChange={(event) => setExecuteBackup(event.target.checked)}
                    />
                    <span>Chạy BACKUP DATABASE</span>
                  </label>
                  <button className="primary-action" type="submit" disabled={dashboardLoading}>
                    {dashboardLoading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <DatabaseBackup size={18} aria-hidden="true" />}
                    Backup
                  </button>
                </form>
                <div className="backup-list">
                  {backupsData.data.map((backup) => (
                    <article className="backup-item" key={backup.backup_id}>
                      <div>
                        <strong>{backup.file_path}</strong>
                        <span>{backup.created_by_email || 'system'} · {formatDate(backup.created_at)}</span>
                      </div>
                      <span className={`status-pill ${String(backup.status).toLowerCase()}`}>{backup.status}</span>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  )
}

export default App
