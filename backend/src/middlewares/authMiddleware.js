import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// Auth middleware: verify JWT in production; allow safe dev override when configured
export default (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    try {
      const decode = jwt.verify(token, process.env.JWT_SECRET);
      // ⚡ Chuẩn hóa: luôn đảm bảo req.user.user_id tồn tại để khớp với các controller
      // (đề phòng token được sign với field "id" thay vì "user_id")
      req.user = {
        ...decode,
        // Token đăng nhập mới (auth.controller.js) ký với field "sub" (user_id dạng string).
        // Token cũ có thể ký với "user_id" hoặc "id". Chuẩn hóa hết về user_id (number).
        user_id: decode.user_id ?? decode.id ?? (decode.sub ? Number(decode.sub) : undefined),
      };
      return next();
    } catch (error) {
      return res.status(401).json({ message: "Token khong hop le" });
    }
  }

  // No token: allow dev override when explicitly enabled
  const devOverride = process.env.DEV_OVERRIDE === "true";
  const nodeEnv = process.env.NODE_ENV || "development";
  if (nodeEnv === "development" && devOverride) {
    const devUserId = process.env.DEV_USER_ID
      ? parseInt(process.env.DEV_USER_ID, 10)
      : 1;
    req.user = {
      id: devUserId,
      user_id: devUserId,
      email: process.env.DEV_USER_EMAIL || "dev@example.com",
    };
    return next();
  }

  return res.status(401).json({ message: "Token required" });
};
