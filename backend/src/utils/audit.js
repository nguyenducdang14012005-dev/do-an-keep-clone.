import sql from '../config/db.js';

export const writeAuditLog = async (
  pool,
  { userId = null, action, ipAddress = null, userAgent = null, deviceId = null },
) => {
  await pool
    .request()
    .input('user_id', sql.Int, userId)
    .input('action', sql.NVarChar(255), String(action || '').slice(0, 255))
    .input('ip_address', sql.NVarChar(50), ipAddress)
    .input('user_agent', sql.NVarChar(255), userAgent)
    .input('device_id', sql.Int, deviceId)
    .query(`
      INSERT INTO dbo.Audit_Logs(user_id, action, ip_address, user_agent, device_id)
      VALUES (@user_id, @action, @ip_address, @user_agent, @device_id)
    `);
};
