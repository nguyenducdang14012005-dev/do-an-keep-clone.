import sql, { getPool } from '../config/db.js';
import env from '../config/env.js';
import ApiError from '../utils/apiError.js';
import { sendSuccess } from '../utils/responses.js';
import { cleanString, getClientIp, getUserAgent } from '../utils/request.js';
import { writeAuditLog } from '../utils/audit.js';

const validStatuses = new Set(['Active', 'Inactive', 'Banned']);
const validBackupStatuses = new Set(['Recorded', 'Completed', 'Failed']);

const parsePage = (value, fallback = 1) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseLimit = (value, fallback = 20) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 100);
};

const parseDate = (value, code) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, 'Moc thoi gian loc khong hop le', code);
  }

  return date;
};

const splitRoles = (roles) => {
  if (!roles) return [];
  return String(roles)
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);
};

const normalizeRoles = (roles) => {
  if (!Array.isArray(roles)) return [];
  return [...new Set(roles.map((role) => cleanString(role, 50)).filter(Boolean))];
};

const mapUser = (user) => ({
  ...user,
  roles: splitRoles(user.roles),
});

const getRolesByUserId = async (pool, userId) => {
  const result = await pool
    .request()
    .input('user_id', sql.Int, userId)
    .query(`
      SELECT r.role_name
      FROM dbo.User_Roles ur
      JOIN dbo.Roles r ON r.role_id = ur.role_id
      WHERE ur.user_id = @user_id
      ORDER BY r.role_name
    `);

  return result.recordset.map((row) => row.role_name);
};

const getUserById = async (pool, userId) => {
  const result = await pool
    .request()
    .input('user_id', sql.Int, userId)
    .query(`
      SELECT user_id, email, full_name, status, created_at, roles, total_devices, last_login_at
      FROM dbo.vw_Admin_User_List
      WHERE user_id = @user_id
    `);

  return result.recordset[0] ? mapUser(result.recordset[0]) : null;
};

const getAdminCount = async (pool, onlyActive = false) => {
  const result = await pool.request().query(`
    SELECT COUNT(1) AS total
    FROM dbo.Users u
    JOIN dbo.User_Roles ur ON ur.user_id = u.user_id
    JOIN dbo.Roles r ON r.role_id = ur.role_id
    WHERE r.role_name = N'Admin'
      ${onlyActive ? "AND u.status = N'Active'" : ''}
  `);

  return result.recordset[0].total;
};

const dashboard = async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query('SELECT TOP (1) * FROM dbo.vw_Admin_Dashboard_Stats');

  await writeAuditLog(pool, {
    userId: req.user.user_id,
    action: 'ADMIN_VIEW_DASHBOARD',
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  sendSuccess(res, result.recordset[0] || {});
};

const listUsers = async (req, res) => {
  const status = cleanString(req.query.status, 50);
  const keyword = cleanString(req.query.keyword, 100);
  const page = parsePage(req.query.page);
  const limit = parseLimit(req.query.limit);
  const offset = (page - 1) * limit;

  if (status && !validStatuses.has(status)) {
    throw new ApiError(400, 'Trang thai loc khong hop le', 'ADMIN_STATUS_INVALID');
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('status', sql.NVarChar(50), status)
    .input('keyword', sql.NVarChar(110), keyword ? `%${keyword}%` : null)
    .input('offset', sql.Int, offset)
    .input('limit', sql.Int, limit)
    .query(`
      SELECT user_id, email, full_name, status, created_at, roles, total_devices, last_login_at
      FROM dbo.vw_Admin_User_List
      WHERE (@status IS NULL OR status = @status)
        AND (
          @keyword IS NULL
          OR email LIKE @keyword
          OR full_name LIKE @keyword
        )
      ORDER BY created_at DESC, user_id DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

      SELECT COUNT(1) AS total
      FROM dbo.vw_Admin_User_List
      WHERE (@status IS NULL OR status = @status)
        AND (
          @keyword IS NULL
          OR email LIKE @keyword
          OR full_name LIKE @keyword
        );
    `);

  await writeAuditLog(pool, {
    userId: req.user.user_id,
    action: 'ADMIN_VIEW_USERS',
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  sendSuccess(res, result.recordsets[0].map(mapUser), 200, {
    pagination: {
      page,
      limit,
      total: result.recordsets[1][0].total,
    },
  });
};

const listRoles = async (_req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      r.role_id,
      r.role_name,
      COUNT(ur.user_id) AS total_users
    FROM dbo.Roles r
    LEFT JOIN dbo.User_Roles ur ON ur.role_id = r.role_id
    GROUP BY r.role_id, r.role_name
    ORDER BY r.role_name;
  `);

  sendSuccess(res, result.recordset);
};

const setUserStatus = async (req, res) => {
  const targetUserId = Number.parseInt(req.params.id, 10);
  const status = cleanString(req.body.status, 50);
  const reason = cleanString(req.body.reason, 120);

  if (!Number.isFinite(targetUserId)) {
    throw new ApiError(400, 'Ma nguoi dung khong hop le', 'ADMIN_USER_ID_INVALID');
  }

  if (!validStatuses.has(status)) {
    throw new ApiError(400, 'Trang thai tai khoan khong hop le', 'ADMIN_STATUS_INVALID');
  }

  if (targetUserId === req.user.user_id && status !== 'Active') {
    throw new ApiError(400, 'Admin khong the tu khoa tai khoan dang dang nhap', 'ADMIN_SELF_BAN_DENIED');
  }

  const pool = await getPool();
  const targetUser = await getUserById(pool, targetUserId);
  if (!targetUser) {
    throw new ApiError(404, 'Khong tim thay nguoi dung', 'ADMIN_USER_NOT_FOUND');
  }

  if (targetUser.roles.includes('Admin') && targetUser.status === 'Active' && status !== 'Active') {
    const activeAdminCount = await getAdminCount(pool, true);
    if (activeAdminCount <= 1) {
      throw new ApiError(400, 'Khong the khoa admin active cuoi cung cua he thong', 'ADMIN_LAST_ACTIVE_ADMIN_DENIED');
    }
  }

  const updated = await pool
    .request()
    .input('user_id', sql.Int, targetUserId)
    .input('status', sql.NVarChar(50), status)
    .query(`
      UPDATE dbo.Users
      SET status = @status
      OUTPUT INSERTED.user_id, INSERTED.email, INSERTED.full_name, INSERTED.status, INSERTED.created_at
      WHERE user_id = @user_id
    `);

  const user = updated.recordset[0];
  const reasonPart = reason ? ` reason=${reason}` : '';
  await writeAuditLog(pool, {
    userId: req.user.user_id,
    action: `ADMIN_SET_USER_STATUS target=${user.email} status=${status}${reasonPart}`,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  sendSuccess(res, user);
};

const updateUserRoles = async (req, res) => {
  const targetUserId = Number.parseInt(req.params.id, 10);
  const roleNames = normalizeRoles(req.body.roles);

  if (!Number.isFinite(targetUserId)) {
    throw new ApiError(400, 'Ma nguoi dung khong hop le', 'ADMIN_USER_ID_INVALID');
  }

  if (roleNames.length === 0) {
    throw new ApiError(400, 'Nguoi dung phai co it nhat mot vai tro', 'ADMIN_ROLES_REQUIRED');
  }

  if (targetUserId === req.user.user_id && !roleNames.includes('Admin')) {
    throw new ApiError(400, 'Admin khong the tu go quyen Admin cua chinh minh', 'ADMIN_SELF_ROLE_DENIED');
  }

  const pool = await getPool();
  const targetUser = await getUserById(pool, targetUserId);
  if (!targetUser) {
    throw new ApiError(404, 'Khong tim thay nguoi dung', 'ADMIN_USER_NOT_FOUND');
  }

  const rolesResult = await pool.request().query('SELECT role_id, role_name FROM dbo.Roles ORDER BY role_name');
  const roleByName = new Map(rolesResult.recordset.map((role) => [role.role_name, role]));
  const missingRoles = roleNames.filter((roleName) => !roleByName.has(roleName));
  if (missingRoles.length > 0) {
    throw new ApiError(400, `Vai tro khong ton tai: ${missingRoles.join(', ')}`, 'ADMIN_ROLE_NOT_FOUND');
  }

  const currentRoles = await getRolesByUserId(pool, targetUserId);
  if (currentRoles.includes('Admin') && !roleNames.includes('Admin')) {
    const adminCount = await getAdminCount(pool);
    if (adminCount <= 1) {
      throw new ApiError(400, 'Khong the go quyen Admin cuoi cung cua he thong', 'ADMIN_LAST_ADMIN_DENIED');
    }
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    await new sql.Request(transaction)
      .input('user_id', sql.Int, targetUserId)
      .query('DELETE FROM dbo.User_Roles WHERE user_id = @user_id');

    for (const roleName of roleNames) {
      const role = roleByName.get(roleName);
      await new sql.Request(transaction)
        .input('user_id', sql.Int, targetUserId)
        .input('role_id', sql.Int, role.role_id)
        .query('INSERT INTO dbo.User_Roles(user_id, role_id) VALUES (@user_id, @role_id)');
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  await writeAuditLog(pool, {
    userId: req.user.user_id,
    action: `ADMIN_UPDATE_USER_ROLES target=${targetUser.email} roles=${roleNames.join('|')}`,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  sendSuccess(res, await getUserById(pool, targetUserId));
};

const listAuditLogs = async (req, res) => {
  const action = cleanString(req.query.action, 100);
  const userId = req.query.user_id ? Number.parseInt(req.query.user_id, 10) : null;
  const from = parseDate(req.query.from, 'ADMIN_AUDIT_FROM_INVALID');
  const to = parseDate(req.query.to, 'ADMIN_AUDIT_TO_INVALID');
  const page = parsePage(req.query.page);
  const limit = parseLimit(req.query.limit);
  const offset = (page - 1) * limit;

  if (req.query.user_id && !Number.isFinite(userId)) {
    throw new ApiError(400, 'Ma nguoi dung khong hop le', 'ADMIN_USER_ID_INVALID');
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('action', sql.NVarChar(110), action ? `%${action}%` : null)
    .input('user_id', sql.Int, userId)
    .input('from', sql.DateTime, from)
    .input('to', sql.DateTime, to)
    .input('offset', sql.Int, offset)
    .input('limit', sql.Int, limit)
    .query(`
      SELECT
        l.log_id,
        l.[timestamp],
        l.user_id,
        u.email,
        u.full_name,
        l.action,
        l.ip_address,
        l.user_agent,
        l.device_id
      FROM dbo.Audit_Logs l
      LEFT JOIN dbo.Users u ON u.user_id = l.user_id
      WHERE (@action IS NULL OR l.action LIKE @action)
        AND (@user_id IS NULL OR l.user_id = @user_id)
        AND (@from IS NULL OR l.[timestamp] >= @from)
        AND (@to IS NULL OR l.[timestamp] <= @to)
      ORDER BY [timestamp] DESC, log_id DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

      SELECT COUNT(1) AS total
      FROM dbo.Audit_Logs l
      WHERE (@action IS NULL OR l.action LIKE @action)
        AND (@user_id IS NULL OR l.user_id = @user_id)
        AND (@from IS NULL OR l.[timestamp] >= @from)
        AND (@to IS NULL OR l.[timestamp] <= @to);
    `);

  sendSuccess(res, result.recordsets[0], 200, {
    pagination: {
      page,
      limit,
      total: result.recordsets[1][0].total,
    },
  });
};

const listUserDevices = async (req, res) => {
  const userId = req.query.user_id ? Number.parseInt(req.query.user_id, 10) : null;
  const page = parsePage(req.query.page);
  const limit = parseLimit(req.query.limit);
  const offset = (page - 1) * limit;

  if (req.query.user_id && !Number.isFinite(userId)) {
    throw new ApiError(400, 'Ma nguoi dung khong hop le', 'ADMIN_USER_ID_INVALID');
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('user_id', sql.Int, userId)
    .input('offset', sql.Int, offset)
    .input('limit', sql.Int, limit)
    .query(`
      SELECT
        d.device_id,
        d.user_id,
        u.email,
        u.full_name,
        d.device_name,
        d.ip_address,
        d.user_agent,
        d.created_at,
        d.last_login_at
      FROM dbo.User_Devices d
      JOIN dbo.Users u ON u.user_id = d.user_id
      WHERE (@user_id IS NULL OR d.user_id = @user_id)
      ORDER BY d.last_login_at DESC, d.device_id DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

      SELECT COUNT(1) AS total
      FROM dbo.User_Devices d
      WHERE (@user_id IS NULL OR d.user_id = @user_id);
    `);

  sendSuccess(res, result.recordsets[0], 200, {
    pagination: {
      page,
      limit,
      total: result.recordsets[1][0].total,
    },
  });
};

const listBackups = async (req, res) => {
  const status = cleanString(req.query.status, 50);
  const page = parsePage(req.query.page);
  const limit = parseLimit(req.query.limit);
  const offset = (page - 1) * limit;

  if (status && !validBackupStatuses.has(status)) {
    throw new ApiError(400, 'Trang thai backup khong hop le', 'BACKUP_STATUS_INVALID');
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('status', sql.NVarChar(50), status)
    .input('offset', sql.Int, offset)
    .input('limit', sql.Int, limit)
    .query(`
      SELECT
        b.backup_id,
        b.created_at,
        b.file_path,
        b.status,
        b.created_by,
        u.email AS created_by_email,
        u.full_name AS created_by_name
      FROM dbo.Backups b
      LEFT JOIN dbo.Users u ON u.user_id = b.created_by
      WHERE (@status IS NULL OR b.status = @status)
      ORDER BY b.created_at DESC, b.backup_id DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

      SELECT COUNT(1) AS total
      FROM dbo.Backups b
      WHERE (@status IS NULL OR b.status = @status);
    `);

  sendSuccess(res, result.recordsets[0], 200, {
    pagination: {
      page,
      limit,
      total: result.recordsets[1][0].total,
    },
  });
};

const runDatabaseBackup = async (pool, filePath) => {
  await pool
    .request()
    .input('database_name', sql.NVarChar(128), env.db.database)
    .input('file_path', sql.NVarChar(4000), filePath)
    .query(`
      DECLARE @statement NVARCHAR(MAX);
      SET @statement = N'BACKUP DATABASE ' + QUOTENAME(@database_name) + N' TO DISK = @backup_path WITH INIT, CHECKSUM';

      EXEC sys.sp_executesql
        @statement,
        N'@backup_path NVARCHAR(4000)',
        @backup_path = @file_path;
    `);
};

const recordBackup = async (req, res) => {
  const filePath = cleanString(req.body.file_path || req.body.filePath, 500);
  const executeBackup = Boolean(req.body.execute_backup || req.body.executeBackup);
  if (!filePath) {
    throw new ApiError(400, 'Duong dan file backup la bat buoc', 'BACKUP_FILE_PATH_REQUIRED');
  }

  const pool = await getPool();
  let backupStatus = executeBackup ? 'Completed' : 'Recorded';
  let backupError = null;

  if (executeBackup) {
    try {
      await runDatabaseBackup(pool, filePath);
    } catch (error) {
      backupStatus = 'Failed';
      backupError = error;
    }
  }

  const result = await pool
    .request()
    .input('file_path', sql.NVarChar(sql.MAX), filePath)
    .input('status', sql.NVarChar(50), backupStatus)
    .input('created_by', sql.Int, req.user.user_id)
    .query(`
      INSERT INTO dbo.Backups(file_path, status, created_by)
      OUTPUT INSERTED.backup_id, INSERTED.created_at, INSERTED.file_path, INSERTED.status, INSERTED.created_by
      VALUES (@file_path, @status, @created_by)
    `);

  const backup = result.recordset[0];
  await writeAuditLog(pool, {
    userId: req.user.user_id,
    action: `${backupStatus === 'Failed' ? 'BACKUP_FAILED' : 'BACKUP_CREATED'} path=${filePath} status=${backupStatus}`,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  if (backupError) {
    throw new ApiError(
      500,
      `SQL Server khong tao duoc file backup: ${backupError.message}`,
      'BACKUP_EXECUTION_FAILED',
    );
  }

  sendSuccess(res, backup, 201);
};

export {
  dashboard,
  listUsers,
  listRoles,
  setUserStatus,
  updateUserRoles,
  listAuditLogs,
  listUserDevices,
  listBackups,
  recordBackup,
};
