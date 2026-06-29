import sql from "../config/db.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export const registerUser = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({
        message: "Thiếu trường bắt buộc",
      });
    }

    const pool = await sql.connect();

    // Kiểm tra email tồn tại
    const existing = await pool.request().input("email", sql.NVarChar, email)
      .query(`
    SELECT user_id
    FROM Users
    WHERE email = @email
  `);

    if (existing.recordset.length > 0) {
      return res.status(409).json({
        message: "Email đã được đăng ký",
      });
    }

    // Lưu trực tiếp password (KHÔNG BĂM)
    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, password)
      .input("full_name", sql.NVarChar, fullName)
      .input("status", sql.NVarChar, "Active").query(`
    INSERT INTO Users
    (
      email,
      password,
      full_name,
      status,
      created_at
    )
    OUTPUT INSERTED.user_id
    VALUES
    (
      @email,
      @password,
      @full_name,
      @status,
      GETDATE()
    )
  `);

    const userId = result.recordset[0].user_id;

    // Gán mặc định role User
    await pool.request().input("user_id", sql.Int, userId).query(`
    INSERT INTO User_Roles
    (
      user_id,
      role_id
    )
    SELECT
      @user_id,
      role_id
    FROM Roles
    WHERE role_name = 'User'
  `);

    const token = jwt.sign(
      {
        id: userId,
        email,
        role: "User",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
      },
    );

    res.status(201).json({
      token,
      user: {
        userId,
        email,
        fullName,
        status: "Active",
        role: "User",
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: "Thiếu email hoặc password",
      });
    }

    const pool = await sql.connect();

    const result = await pool.request().input("email", sql.NVarChar, email)
      .query(` SELECT
      u.user_id,
      u.email,
      u.password,
      u.full_name,
      u.status,
      r.role_name
    FROM Users u
    LEFT JOIN User_Roles ur
      ON u.user_id = ur.user_id
    LEFT JOIN Roles r
      ON ur.role_id = r.role_id
    WHERE u.email = @email
   `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy tài khoản",
      });
    }

    const userRow = result.recordset[0];
    if (!userRow.role_name) {
      return res.status(403).json({
        message: "Tài khoản chưa được cấp quyền",
      });
    }
    // So sánh trực tiếp
    if (password !== userRow.password) {
      return res.status(401).json({
        message: "Sai tài khoản hoặc mật khẩu",
      });
    }

    const token = jwt.sign(
      {
        id: userRow.user_id,
        email: userRow.email,
        role: userRow.role_name,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
      },
    );

    res.status(200).json({
      token,
      user: {
        userId: userRow.user_id,
        email: userRow.email,
        fullName: userRow.full_name,
        status: userRow.status,
        role: userRow.role_name,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// ============================================================
// QUÊN MẬT KHẨU — Bước 1: Xác nhận email tồn tại
// POST /api/auth/forgot-password  { email }
// ============================================================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Vui lòng nhập email" });

    const pool = await sql.connect();
    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT user_id FROM Users WHERE email = @email");

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Email không tồn tại trong hệ thống" });
    }

    // Tạo token ngẫu nhiên 6 chữ số (OTP đơn giản)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    const userId = result.recordset[0].user_id;

    // Lưu OTP vào DB (cột reset_token, reset_token_expiry trong bảng Users)
    // Nếu chưa có 2 cột này, chạy migration bên dưới trước
    await pool
      .request()
      .input("token", sql.NVarChar, otp)
      .input("expiry", sql.DateTime, expiry)
      .input("user_id", sql.Int, userId)
      .query(
        "UPDATE Users SET reset_token = @token, reset_token_expiry = @expiry WHERE user_id = @user_id"
      );

    // In ra console để test (gắn nodemailer sau nếu cần)
    console.log(`[RESET PASSWORD] Email: ${email} | OTP: ${otp} | Hết hạn: ${expiry}`);

    res.json({ message: "Mã xác nhận đã được gửi. Vui lòng kiểm tra console server." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// QUÊN MẬT KHẨU — Bước 2: Đổi mật khẩu với OTP
// POST /api/auth/reset-password  { email, otp, newPassword }
// ============================================================
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    const pool = await sql.connect();
    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query(
        "SELECT user_id, reset_token, reset_token_expiry FROM Users WHERE email = @email"
      );

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Email không tồn tại" });
    }

    const user = result.recordset[0];

    if (!user.reset_token || user.reset_token !== otp) {
      return res.status(400).json({ message: "Mã xác nhận không đúng" });
    }

    if (new Date() > new Date(user.reset_token_expiry)) {
      return res.status(400).json({ message: "Mã xác nhận đã hết hạn (15 phút)" });
    }

    // Cập nhật mật khẩu mới và xoá token
    await pool
      .request()
      .input("password", sql.NVarChar, newPassword)
      .input("user_id", sql.Int, user.user_id)
      .query(
        "UPDATE Users SET password = @password, reset_token = NULL, reset_token_expiry = NULL WHERE user_id = @user_id"
      );

    res.json({ message: "Đổi mật khẩu thành công! Bạn có thể đăng nhập." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
