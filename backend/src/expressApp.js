import express from "express";
import cors from "cors";
import labelRoutes from "./routes/labels.js";
import noteRoutes from "./routes/notes.js";
import reminderRoutes from "./routes/reminders.js";
import shareRoutes from "./routes/shares.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { sendError } from "./utils/responses.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.use("/api/labels", labelRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/shares", shareRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("API đang chạy...");
});

// 404 cho route không tồn tại
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Khong tim thay route",
    code: "NOT_FOUND",
  });
});

// Error handler tập trung: mọi lỗi (ApiError hoặc lỗi bất ngờ) đều trả JSON đồng nhất
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }
  sendError(res, err);
});

export default app;
