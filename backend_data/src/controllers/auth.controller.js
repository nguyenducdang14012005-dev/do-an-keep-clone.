const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../config/db');
const env = require('../config/env');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/responses');
const { getClientIp, getUserAgent, cleanString } = require('../utils/request');
const { writeAuditLog } = require('../utils/audit');
const { getRolesByUserId } = require('../middleware/auth');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;

const publicUserFields = (user, roles = []) => ({
  user_id: user.user_id,
  email: user.email,
  full_name: user.full_name,
  status: user.status,
  roles,
  created_at: user.created_at,
});

const ensureUserRole = async (transaction, userId) => {
  await new sql.Request(transaction).query(`
    IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE role_name = N'User')
    BEGIN
      INSERT INTO dbo.Roles(role_name) VALUES (N'User');
    END
  `);

  const roleResult = await new sql.Request(transaction).query(
    'SELECT role_id FROM dbo.Roles WHERE role_name = N\'User\'',
  );
  const roleId = roleResult.recordset[0].role_id;
  await new sql.Request(transaction)
    .input('user_id', sql.Int, userId)
    .input('role_id', sql.Int, roleId)
    .query(`
      IF NOT EXISTS (
        SELECT 1 FROM dbo.User_Roles
        WHERE user_id = @user_id AND role_id = @role_id
      )
      BEGIN
        INSERT INTO dbo.User_Roles(user_id, role_id)
        VALUES (@user_id, @role_id);
      END
    `);
};

const register = async (req, res) => {
  const email = cleanString(req.body.email, 100)?.toLowerCase();
  const fullName = cleanString(req.body.full_name || req.body.fullName, 100);
  const password = String(req.body.password || '');

  if (!email || !emailPattern.test(email)) {
    throw new ApiError(400, 'Email khong hop le', 'AUTH_EMAIL_INVALID');
  }

  if (!fullName) {
    throw new ApiError(400, 'Ho ten khong duoc de trong', 'AUTH_FULL_NAME_REQUIRED');
  }

  if (!strongPasswordPattern.test(password)) {
    throw new ApiError(
      400,
      'Mat khau phai co 8-72 ky tu, gom chu hoa, chu thuong va chu so',
      'AUTH_PASSWORD_WEAK',
    );
  }

  const pool = await getPool();
  const existing = await pool
    .request()
    .input('email', sql.NVarChar(100), email)
    .query('SELECT user_id FROM dbo.Users WHERE email = @email');

  if (existing.recordset.length > 0) {
    throw new ApiError(409, 'Email da duoc su dung', 'AUTH_EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const userResult = await new sql.Request(transaction)
      .input('email', sql.NVarChar(100), email)
      .input('password', sql.NVarChar(255), passwordHash)
      .input('full_name', sql.NVarChar(100), fullName)
      .query(`
        INSERT INTO dbo.Users(email, [password], full_name, status)
        OUTPUT INSERTED.user_id, INSERTED.email, INSERTED.full_name, INSERTED.status, INSERTED.created_at
        VALUES (@email, @password, @full_name, N'Active')
      `);

    const user = userResult.recordset[0];
    await ensureUserRole(transaction, user.user_id);
    await new sql.Request(transaction)
      .input('user_id', sql.Int, user.user_id)
      .input('action', sql.NVarChar(255), 'AUTH_REGISTER')
      .input('ip_address', sql.NVarChar(50), getClientIp(req))
      .input('user_agent', sql.NVarChar(255), getUserAgent(req))
      .query(`
        INSERT INTO dbo.Audit_Logs(user_id, action, ip_address, user_agent)
        VALUES (@user_id, @action, @ip_address, @user_agent)
      `);

    await transaction.commit();
    sendSuccess(res, publicUserFields(user, ['User']), 201);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getOrCreateDevice = async (pool, userId, deviceName, ipAddress, userAgent) => {
  const normalizedDevice = cleanString(deviceName, 255) || 'Unknown device';
  const existing = await pool
    .request()
    .input('user_id', sql.Int, userId)
    .input('device_name', sql.NVarChar(255), normalizedDevice)
    .query(`
      SELECT TOP (1) device_id
      FROM dbo.User_Devices
      WHERE user_id = @user_id AND device_name = @device_name
      ORDER BY device_id DESC
    `);

  if (existing.recordset[0]) {
    const deviceId = existing.recordset[0].device_id;
    await pool
      .request()
      .input('device_id', sql.Int, deviceId)
      .input('ip_address', sql.NVarChar(50), ipAddress)
      .input('user_agent', sql.NVarChar(255), userAgent)
      .query(`
        UPDATE dbo.User_Devices
        SET last_login_at = GETDATE(),
            ip_address = @ip_address,
            user_agent = @user_agent
        WHERE device_id = @device_id
      `);

    return deviceId;
  }

  const created = await pool
    .request()
    .input('user_id', sql.Int, userId)
    .input('device_name', sql.NVarChar(255), normalizedDevice)
    .input('ip_address', sql.NVarChar(50), ipAddress)
    .input('user_agent', sql.NVarChar(255), userAgent)
    .query(`
      INSERT INTO dbo.User_Devices(user_id, device_name, ip_address, user_agent, last_login_at)
      OUTPUT INSERTED.device_id
      VALUES (@user_id, @device_name, @ip_address, @user_agent, GETDATE())
    `);

  return created.recordset[0].device_id;
};

const login = async (req, res) => {
  const email = cleanString(req.body.email, 100)?.toLowerCase();
  const password = String(req.body.password || '');
  const pool = await getPool();

  if (!email || !password) {
    throw new ApiError(400, 'Email va mat khau la bat buoc', 'AUTH_LOGIN_REQUIRED');
  }

  const userResult = await pool
    .request()
    .input('email', sql.NVarChar(100), email)
    .query(`
      SELECT user_id, email, [password] AS password_hash, full_name, status, created_at
      FROM dbo.Users
      WHERE email = @email
    `);

  const user = userResult.recordset[0];
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  if (!user) {
    await writeAuditLog(pool, {
      action: `AUTH_LOGIN_FAILED email=${email}`,
      ipAddress,
      userAgent,
    });
    throw new ApiError(401, 'Email hoac mat khau khong dung', 'AUTH_INVALID_CREDENTIALS');
  }

  const passwordMatched = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatched) {
    await writeAuditLog(pool, {
      userId: user.user_id,
      action: 'AUTH_LOGIN_FAILED',
      ipAddress,
      userAgent,
    });
    throw new ApiError(401, 'Email hoac mat khau khong dung', 'AUTH_INVALID_CREDENTIALS');
  }

  if (user.status !== 'Active') {
    await writeAuditLog(pool, {
      userId: user.user_id,
      action: `AUTH_LOGIN_BLOCKED status=${user.status}`,
      ipAddress,
      userAgent,
    });
    throw new ApiError(403, 'Tai khoan dang bi khoa hoac tam ngung', 'AUTH_ACCOUNT_BLOCKED');
  }

  const roles = await getRolesByUserId(pool, user.user_id);
  const deviceId = await getOrCreateDevice(
    pool,
    user.user_id,
    req.body.device_name || userAgent,
    ipAddress,
    userAgent,
  );
  const token = jwt.sign(
    {
      sub: String(user.user_id),
      email: user.email,
      roles,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );

  await writeAuditLog(pool, {
    userId: user.user_id,
    action: 'AUTH_LOGIN_SUCCESS',
    ipAddress,
    userAgent,
    deviceId,
  });

  sendSuccess(res, {
    token,
    expires_in: env.jwtExpiresIn,
    user: publicUserFields(user, roles),
  });
};

const me = async (req, res) => {
  sendSuccess(res, publicUserFields(req.user, req.user.roles));
};

module.exports = {
  register,
  login,
  me,
};
