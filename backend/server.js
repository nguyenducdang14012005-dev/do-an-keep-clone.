import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import app from "./src/expressApp.js";
import { connectDB, getPool } from "./src/config/db.js";
import cron from "node-cron";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(` Server dang chay tai port: ${PORT}`);
      console.log(`=================================================`);
    });

    server.on("error", (err) => {
      console.error(" Server failed to start:", err);
    });

    cron.schedule("* * * * *", async () => {
      try {
        // Dùng lại pool đã kết nối sẵn, không mở pool mới mỗi lần chạy cron
        const pool = await getPool();
        const result = await pool
          .request()
          .query(
            `DELETE FROM Notes WHERE status = 'Deleted' AND deleted_at < DATEADD(DAY, -30, GETDATE())`,
          );
        console.log(` Đã xóa ${result.rowsAffected[0]} ghi chú quá 30 ngày`);
      } catch (error) {
        console.log("Lỗi dọn thùng rác:", error.message);
      }
    });
  })
  .catch((err) => {
    console.error("❌ Khong khoi dong duoc server vi loi ket noi DB:", err.message);
    process.exit(1);
  });
