/**
 * Script chạy 1 lần để "vá" các password cũ đang lưu dạng plaintext
 * (từ thời flow đăng ký cũ) sang dạng mã hoá bcrypt - để khớp với
 * auth.controller.js mới (dùng bcrypt.compare khi đăng nhập).
 *
 * An toàn để chạy nhiều lần: tài khoản nào password ĐÃ là bcrypt hash
 * rồi (dạng $2a$.../$2b$.../$2y$...) sẽ được BỎ QUA, không hash lại.
 *
 * Cách chạy (từ thư mục backend/):
 *   node scripts/migratePasswords.js
 */
import bcrypt from "bcryptjs";
import sql, { getPool } from "../src/config/db.js";
import env from "../src/config/env.js";

const bcryptHashPattern = /^\$2[aby]\$\d{2}\$.{53}$/;

const run = async () => {
  const pool = await getPool();
  const result = await pool
    .request()
    .query("SELECT user_id, email, [password] FROM dbo.Users");

  const users = result.recordset;
  let migrated = 0;
  let skipped = 0;

  for (const user of users) {
    if (bcryptHashPattern.test(user.password || "")) {
      skipped += 1;
      continue;
    }

    const newHash = await bcrypt.hash(user.password, env.bcryptRounds);
    await pool
      .request()
      .input("user_id", sql.Int, user.user_id)
      .input("password", sql.NVarChar(255), newHash)
      .query("UPDATE dbo.Users SET [password] = @password WHERE user_id = @user_id");

    console.log(`✅ Đã mã hoá lại password cho: ${user.email}`);
    migrated += 1;
  }

  console.log("=================================================");
  console.log(`Hoàn tất. Đã vá: ${migrated} tài khoản. Bỏ qua (đã hash sẵn): ${skipped} tài khoản.`);
  console.log("=================================================");
  process.exit(0);
};

run().catch((err) => {
  console.error("❌ Lỗi khi migrate password:", err);
  process.exit(1);
});
