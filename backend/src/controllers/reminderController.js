import sql from "../config/db.js";

// Nhận chuỗi datetime-local từ frontend (vd: "2026-06-28T22:30")
// Gắn offset +07:00 để JS tự convert sang UTC chuẩn trước khi lưu vào SQL Server
function parseLocalTime(localStr) {
  if (!localStr) return null;
  // Nếu đã có timezone info thì parse trực tiếp
  if (localStr.includes("+") || localStr.endsWith("Z")) {
    return new Date(localStr);
  }
  // Gắn +07:00 (giờ Việt Nam) vào chuỗi datetime-local
  return new Date(localStr + ":00+07:00");
}

// POST /api/reminders
export const setReminder = async (req, res) => {
  try {
    const { note_id, remind_time } = req.body;
    if (!note_id) return res.status(400).json({ message: "note_id không có" });
    if (!remind_time)
      return res.status(400).json({ message: "remind_time không có" });

    const utcTime = parseLocalTime(remind_time);
    await sql.query`
      INSERT INTO Reminders (note_id, remind_time, status)
      VALUES (${note_id}, ${utcTime}, 0)
    `;
    return res.status(200).json({ message: "Đặt giờ thành công" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// GET /api/reminders
export const getReminders = async (req, res) => {
  try {
    console.log("USER:", req.user);
    console.log("AUTH:", req.headers.authorization);
    const user_id = req.user?.user_id ?? req.user?.id;
    if (!user_id)
      return res
        .status(401)
        .json({ message: "Không xác định được người dùng" });

    const result = await sql.query`
  SELECT r.reminder_id, r.remind_time, r.status,
         n.note_id, n.title, n.content, n.color, n.is_pinned
  FROM Reminders r
  INNER JOIN Notes n ON r.note_id = n.note_id
  WHERE n.user_id = ${user_id}
    AND r.status = 0
    AND n.deleted_at IS NULL
  ORDER BY r.remind_time ASC
`;
    return res.status(200).json(result.recordset);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// PUT /api/reminders/:id
export const updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { remind_time, status } = req.body;
    const utcTime = remind_time ? parseLocalTime(remind_time) : null;

    // 🛠️ ĐÃ FIX: Dùng ISNULL chuẩn SQL Server
    await sql.query`
      UPDATE Reminders
      SET remind_time = ISNULL(${utcTime}, remind_time),
          status      = ISNULL(${status}, status)
      WHERE reminder_id = ${id}
    `;
    res.status(200).json({ message: "Cập nhật nhắc nhở thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/reminders/:id
export const deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    await sql.query`DELETE FROM Reminders WHERE reminder_id = ${id}`;
    res.status(200).json({ message: "Xóa nhắc nhở thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// GET /api/reminders/due-now — Lấy các lịch hẹn tới hạn để bắn thông báo
export const getDueReminders = async (req, res) => {
  try {
    const user_id = req.user?.user_id ?? req.user?.id;
    if (!user_id)
      return res
        .status(401)
        .json({ message: "Không xác định được người dùng" });

    const result = await sql.query`
      SELECT r.reminder_id, r.remind_time, r.status,
             n.note_id, n.title, n.content
      FROM Reminders r
      INNER JOIN Notes n ON r.note_id = n.note_id
      WHERE n.user_id = ${user_id}
AND r.status = 0
AND n.deleted_at IS NULL
        AND r.remind_time <= GETUTCDATE()
    `;
    return res.status(200).json(result.recordset);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// PUT /api/reminders/confirm/:id — Xác nhận đã nhắc nhở xong
export const confirmReminder = async (req, res) => {
  try {
    const { id } = req.params; // reminder_id
    await sql.query`UPDATE Reminders SET status = 1 WHERE reminder_id = ${id}`;
    return res.status(200).json({ message: "Xác nhận thành công" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
