import jwt from 'jsonwebtoken';
import sql, { getPool } from '../config/db.js';
import env from '../config/env.js';
import ApiError from '../utils/apiError.js';

export const getRolesByUserId = async (pool, userId) => {
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

export const requireAuth = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Thieu token xac thuc', 'AUTH_TOKEN_MISSING');
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const pool = await getPool();
    const userResult = await pool
      .request()
      .input('user_id', sql.Int, Number(payload.sub))
      .query(`
        SELECT user_id, email, full_name, status, created_at
        FROM dbo.Users
        WHERE user_id = @user_id
      `);

    const user = userResult.recordset[0];
    if (!user) {
      throw new ApiError(401, 'Token khong hop le', 'AUTH_USER_NOT_FOUND');
    }

    if (user.status !== 'Active') {
      throw new ApiError(403, 'Tai khoan khong duoc phep truy cap', 'AUTH_ACCOUNT_BLOCKED');
    }

    const roles = await getRolesByUserId(pool, user.user_id);
    req.user = {
      ...user,
      roles,
    };
    req.auth = payload;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(new ApiError(401, 'Token da het han', 'AUTH_TOKEN_EXPIRED'));
      return;
    }

    if (error.name === 'JsonWebTokenError') {
      next(new ApiError(401, 'Token khong hop le', 'AUTH_TOKEN_INVALID'));
      return;
    }

    next(error);
  }
};

export const requireRole = (roleName) => (req, _res, next) => {
  if (!req.user?.roles?.includes(roleName)) {
    next(new ApiError(403, 'Khong co quyen thuc hien thao tac nay', 'AUTH_FORBIDDEN'));
    return;
  }

  next();
};
