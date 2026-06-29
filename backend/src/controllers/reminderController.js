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

// 🆕 Helper: tạo Reminder_Users cho chủ note + toàn bộ người được Accepted
// chia sẻ note đó, ứng với một reminder_id vừa tạo/đang tồn tại.
// (Bỏ qua nếu bản ghi đã tồn tại để tránh lỗi trùng khóa chính)
async function syncReminderUsersForReminder(reminder_id, note_id) {
  const noteResult =
    await sql.query`SELECT user_id FROM Notes WHERE note_id = ${note_id}`;
  if (noteResult.recordset.length === 0) return;
  const ownerId = noteResult.recordset[0].user_id;

  // Chủ sở hữu note luôn nhận reminder
  await sql.query`
    IF NOT EXISTS (SELECT 1 FROM Reminder_Users WHERE reminder_id = ${reminder_id} AND user_id = ${ownerId})
      INSERT INTO Reminder_Users (reminder_id, user_id, is_read)
      VALUES (${reminder_id}, ${ownerId}, 0)
  `;

  // Toàn bộ người đã Accepted chia sẻ note cũng nhận reminder
  const acceptedUsers = await sql.query`
    SELECT user_id FROM Note_Shares WHERE note_id = ${note_id} AND share_status = 'Accepted'
  `;
  for (const row of acceptedUsers.recordset) {
    await sql.query`
      IF NOT EXISTS (SELECT 1 FROM Reminder_Users WHERE reminder_id = ${reminder_id} AND user_id = ${row.user_id})
        INSERT INTO Reminder_Users (reminder_id, user_id, is_read)
        VALUES (${reminder_id}, ${row.user_id}, 0)
    `;
  }
}

// POST /api/reminders
export const setReminder = async (req, res) => {
  try {
    const { note_id, remind_time } = req.body;
    if (!note_id) return res.status(400).json({ message: "note_id không có" });
    if (!remind_time)
      return res.status(400).json({ message: "remind_time không có" });

    const utcTime = parseLocalTime(remind_time);
    const insertResult = await sql.query`
      INSERT INTO Reminders (note_id, remind_time, status)
      OUTPUT INSERTED.reminder_id
      VALUES (${note_id}, ${utcTime}, 0)
    `;
    const reminder_id = insertResult.recordset?.[0]?.reminder_id;

    // 🆕 Tạo Reminder_Users cho owner + những người đã Accepted chia sẻ note
    // (để mọi người đang có quyền truy cập note đều nhận được reminder này)
    if (reminder_id) {
      await syncReminderUsersForReminder(reminder_id, note_id);
    }

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

    // 🆕 Truy vấn theo Reminder_Users.user_id (không còn theo Notes.user_id)
    // để mỗi người (owner lẫn người được chia sẻ) chỉ thấy reminder nào
    // họ chưa tự đánh dấu "đã đọc" (is_read = 0 của riêng họ).
    const result = await sql.query`
  SELECT r.reminder_id, r.remind_time, r.status,
         n.note_id, n.title, n.content, n.color, n.is_pinned
  FROM Reminder_Users ru
  INNER JOIN Reminders r ON r.reminder_id = ru.reminder_id
  INNER JOIN Notes n ON r.note_id = n.note_id
  WHERE ru.user_id = ${user_id}
    AND ru.is_read = 0
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

    // 🆕 Khi đổi giờ nhắc (đặt lại giờ), reminder coi như "mới" với mọi người
    // đang nhận nó -> reset is_read về 0 để A, B, C đều được nhắc lại đúng giờ mới.
    if (utcTime) {
      await sql.query`UPDATE Reminder_Users SET is_read = 0 WHERE reminder_id = ${id}`;
    }

    res.status(200).json({ message: "Cập nhật nhắc nhở thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/reminders/:id
export const deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    // 🆕 Xóa Reminder_Users trước, rồi mới xóa Reminders để không vi phạm khóa ngoại
    await sql.query`DELETE FROM Reminder_Users WHERE reminder_id = ${id}`;
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

    // 🆕 Đồng bộ với getReminders: lấy theo Reminder_Users.user_id để mỗi
    // người (owner lẫn người được chia sẻ) chỉ thấy reminder họ chưa đọc.
    const result = await sql.query`
      SELECT r.reminder_id, r.remind_time, r.status,
             n.note_id, n.title, n.content
      FROM Reminder_Users ru
      INNER JOIN Reminders r ON r.reminder_id = ru.reminder_id
      INNER JOIN Notes n ON r.note_id = n.note_id
      WHERE ru.user_id = ${user_id}
        AND ru.is_read = 0
        AND r.status = 0
        AND n.deleted_at IS NULL
        AND r.remind_time <= GETUTCDATE()
    `;
    return res.status(200).json(result.recordset);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// PUT /api/reminders/confirm/:id — Đánh dấu "đã xem" reminder CHO RIÊNG người dùng hiện tại
// 🆕 Đã đổi hành vi: chỉ update Reminder_Users.is_read của người gọi, KHÔNG update
// bảng Reminders (status) như trước nữa, để việc 1 người xác nhận không làm mất
// thông báo của những người khác cũng nhận note được chia sẻ này.
export const confirmReminder = async (req, res) => {
  try {
    const { id } = req.params; // reminder_id
    const user_id = req.user?.user_id ?? req.user?.id;
    if (!user_id)
      return res
        .status(401)
        .json({ message: "Không xác định được người dùng" });

    await sql.query`
      IF EXISTS (SELECT 1 FROM Reminder_Users WHERE reminder_id = ${id} AND user_id = ${user_id})
        UPDATE Reminder_Users SET is_read = 1 WHERE reminder_id = ${id} AND user_id = ${user_id}
      ELSE
        INSERT INTO Reminder_Users (reminder_id, user_id, is_read) VALUES (${id}, ${user_id}, 1)
    `;

    return res.status(200).json({ message: "Xác nhận thành công" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
export const getReminderByNote = async (req, res) => {
  try {
    const { noteId } = req.params;

    const result = await sql.query`
      SELECT TOP 1 *
      FROM Reminders
      WHERE note_id = ${noteId}
      ORDER BY reminder_id DESC
    `;

    return res.status(200).json(result.recordset[0] || null);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
