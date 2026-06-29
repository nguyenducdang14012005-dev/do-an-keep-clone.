import sql from "../config/db.js";

// ⚡ ĐÃ CẬP NHẬT: Cho phép quét và trả về cả những ghi chú được người khác chia sẻ cho mình
export const searchAndFilterNotes = async (req, res) => {
  try {
    const { keyword, label_id, status, has_reminder } = req.query;
    const user_id = req.query.user_id
      ? parseInt(req.query.user_id, 10)
      : (req.user?.user_id ?? req.user?.id);

    // Truy vấn lấy ghi chú do mình sở hữu HOẶC ghi chú đã chấp nhận chia sẻ từ người khác
    let queryStr = `
            SELECT DISTINCT 
                n.note_id, n.user_id, n.title, n.content,
                n.color, n.is_pinned, n.status, n.created_at,
                n.updated_at, n.deleted_at, n.due_time,
                ns.permission,
                r.remind_time,
                r.reminder_id
            FROM Notes n
            LEFT JOIN Note_Labels nl ON n.note_id = nl.note_id
            LEFT JOIN Note_Shares ns ON n.note_id = ns.note_id AND ns.user_id = @user_id AND ns.share_status = 'Accepted'
            LEFT JOIN Reminders r ON r.note_id = n.note_id AND r.status = 0
            WHERE (n.user_id = @user_id OR (ns.user_id = @user_id AND ns.share_status = 'Accepted'))
              AND n.status = @status
        `;

    const pool = await sql.connect();
    const request = pool.request();
    request.input("user_id", sql.Int, user_id);
    request.input("status", sql.NVarChar, status || "Active");

    if (keyword) {
      queryStr += ` AND (n.title LIKE @keyword OR n.content LIKE @keyword)`;
      request.input("keyword", sql.NVarChar, `%${keyword}%`);
    }

    if (label_id) {
      queryStr += ` AND nl.label_id = @label_id`;
      request.input("label_id", sql.Int, label_id);
    }

    // Nếu view=reminders: chỉ lấy note có reminder chưa xử lý
    if (has_reminder === "1") {
      queryStr += ` AND r.reminder_id IS NOT NULL`;
    }

    queryStr += ` ORDER BY n.is_pinned DESC, n.updated_at DESC`;

    const result = await request.query(queryStr);
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const togglePinNote = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.user_id ?? req.user.id;

    const pool = await sql.connect();
    const note = await pool
      .request()
      .input("id", sql.Int, id)
      .input("user_id", sql.Int, user_id)
      .query(
        "SELECT is_pinned FROM Notes WHERE note_id = @id AND user_id = @user_id",
      );

    if (note.recordset.length === 0)
      return res.status(404).json({ message: "Khong tim thay ghi chu" });

    const newPin = note.recordset[0].is_pinned ? 0 : 1;

    await pool
      .request()
      .input("newPin", sql.Bit, newPin)
      .input("id", sql.Int, id)
      .input("user_id", sql.Int, user_id)
      .query(
        "UPDATE Notes SET is_pinned = @newPin, updated_at = GETDATE() WHERE note_id = @id AND user_id = @user_id",
      );

    res
      .status(200)
      .json({ message: "Doi trang thai ghim thanh cong", is_pinned: newPin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const changeNoteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user_id = req.user.user_id ?? req.user.id;

    const pool = await sql.connect();

    if (status === "PermanentlyDeleted") {
      const request = pool
        .request()
        .input("id", sql.Int, id)
        .input("user_id", sql.Int, user_id);

      await request.query(`
        DELETE FROM Note_Labels WHERE note_id = @id;
        DELETE FROM Reminders WHERE note_id = @id;
        DELETE FROM Note_Shares WHERE note_id = @id;
        DELETE FROM Note_Versions WHERE note_id = @id;
        DELETE FROM Notes WHERE note_id = @id AND user_id = @user_id;
      `);

      return res.status(200).json({ message: "Da xoa vinh vien ghi chu" });
    }

    if (status === "Deleted") {
      await pool
        .request()
        .input("status", sql.NVarChar, status)
        .input("id", sql.Int, id)
        .input("user_id", sql.Int, user_id)
        .query(
          "UPDATE Notes SET status = @status, deleted_at = GETDATE() WHERE note_id = @id AND user_id = @user_id",
        );
    } else {
      await pool
        .request()
        .input("status", sql.NVarChar, status)
        .input("id", sql.Int, id)
        .input("user_id", sql.Int, user_id)
        .query(
          "UPDATE Notes SET status = @status, deleted_at = NULL WHERE note_id = @id AND user_id = @user_id",
        );
    }

    res.status(200).json({ message: `Da chuyen trang thai sang ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ⚡ ĐÃ SỬA LỖI: bỏ cột "reminder_date" (không tồn tại trong bảng Notes -> gây lỗi 500
// "Invalid column name 'reminder_date'" ở MỌI lần lưu ghi chú, không riêng gì đổi màu).
// Cũng bỏ luôn is_pinned khỏi câu UPDATE này vì:
//   1. Đã có endpoint riêng togglePinNote để xử lý ghim/bỏ ghim.
//   2. Frontend (NoteEditModal) không gửi is_pinned khi lưu nội dung -> nếu vẫn SET ở đây,
//      giá trị sẽ luôn là NULL/undefined và vô tình xoá trạng thái ghim của note mỗi khi sửa.
export const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, color } = req.body;
    const currentUserId = req.user.user_id ?? req.user.id;

    // 1. Kiểm tra dựa trên cột status thực tế (loại bỏ trường lỗi is_deleted không tồn tại trong DB của bạn)
    const ownerCheck = await sql.query`
      SELECT user_id FROM Notes WHERE note_id = ${id} AND status != 'PermanentlyDeleted'
    `;

    if (ownerCheck.recordset.length === 0) {
      return res
        .status(404)
        .json({ error: "Ghi chú không tồn tại hoặc đã bị xóa vĩnh viễn" });
    }

    const isOwner = ownerCheck.recordset[0].user_id === currentUserId;

    // 2. Nếu không phải chủ sở hữu, tiến hành phân tích quyền thao tác
    if (!isOwner) {
      const shareCheck = await sql.query`
        SELECT permission, share_status 
        FROM Note_Shares 
        WHERE note_id = ${id} AND user_id = ${currentUserId} AND share_status = 'Accepted'
      `;

      if (shareCheck.recordset.length === 0) {
        return res
          .status(403)
          .json({ error: "Bạn không có quyền truy cập ghi chú này" });
      }

      const permission = shareCheck.recordset[0].permission;
      // Khóa cứng nếu quyền hiện tại chỉ là xem
      if (permission === "view") {
        return res.status(403).json({
          error: "Bạn chỉ có quyền xem, không thể chỉnh sửa ghi chú này",
        });
      }
    }

    // 3. Tiến hành cập nhật nội dung ghi chú (Hợp lệ cho cả Owner lẫn Người nhận có quyền edit/delete)
    await sql.query`
      UPDATE Notes 
      SET title = ${title}, 
          content = ${content}, 
          color = ${color}, 
          updated_at = GETDATE()
      WHERE note_id = ${id}
    `;

    return res.status(200).json({ message: "Cập nhật ghi chú thành công" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const shareNoteMock = async (req, res) => {
  try {
    const { note_id, email, permission } = req.body;
    const pool = await sql.connect();
    const userCheck = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT user_id FROM Users WHERE email = @email");

    if (userCheck.recordset.length === 0) {
      return res
        .status(404)
        .json({ message: "Khong tim thay email nay tren he thong" });
    }
    res.status(200).json({
      message: `Da chia se quyen ${permission} cho ${email} thanh cong!`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createNoteVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const user_id = req.user.user_id ?? req.user.id;

    if (!title || !content) {
      return res.status(400).json({ message: "Thieu title hoac content" });
    }

    await sql.query`
            INSERT INTO Note_Versions (note_id, title, content, edited_by, updated_at)
            VALUES (${id}, ${title}, ${content}, ${user_id}, GETDATE())
        `;

    res.status(201).json({ message: "Da luu phien ban thanh cong" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getNoteVersions = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.user_id ?? req.user.id;

    const pool = await sql.connect();

    const ownerCheck = await pool
      .request()
      .input("note_id", sql.Int, id)
      .input("user_id", sql.Int, user_id).query(`
        SELECT 1 AS has_access FROM Notes
        WHERE note_id = @note_id AND user_id = @user_id
        UNION
        SELECT 1 FROM Note_Shares
        WHERE note_id = @note_id AND user_id = @user_id AND share_status = 'Accepted'
      `);

    if (ownerCheck.recordset.length === 0) {
      return res
        .status(403)
        .json({ message: "Không có quyền xem lịch sử ghi chú này" });
    }

    const result = await pool.request().input("note_id", sql.Int, id).query(`
        SELECT
          nv.version_id,
          nv.note_id,
          nv.title,
          nv.content,
          nv.edited_by,
          nv.updated_at,
          u.email    AS editor_email,
          u.full_name AS editor_name
        FROM Note_Versions nv
        LEFT JOIN Users u ON u.user_id = nv.edited_by
        WHERE nv.note_id = @note_id
        ORDER BY nv.updated_at DESC
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteNoteVersion = async (req, res) => {
  try {
    const { id, version_id } = req.params;
    const pool = await sql.connect();
    await pool
      .request()
      .input("version_id", sql.Int, version_id)
      .query("DELETE FROM Note_Versions WHERE version_id = @version_id");
    res.status(200).json({ message: "Da xoa phien ban thanh cong " });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const cleanupTrash = async (req, res) => {
  try {
    const pool = await sql.connect();
    await pool.request().query(`
      DELETE nl FROM Note_Labels nl
        INNER JOIN Notes n ON nl.note_id = n.note_id
        WHERE n.status = 'Deleted' AND n.deleted_at < DATEADD(DAY, -30, GETDATE());
      DELETE r FROM Reminders r
        INNER JOIN Notes n ON r.note_id = n.note_id
        WHERE n.status = 'Deleted' AND n.deleted_at < DATEADD(DAY, -30, GETDATE());
      DELETE ns FROM Note_Shares ns
        INNER JOIN Notes n ON ns.note_id = n.note_id
        WHERE n.status = 'Deleted' AND n.deleted_at < DATEADD(DAY, -30, GETDATE());
      DELETE nv FROM Note_Versions nv
        INNER JOIN Notes n ON nv.note_id = n.note_id
        WHERE n.status = 'Deleted' AND n.deleted_at < DATEADD(DAY, -30, GETDATE());
    `);
    const result = await pool
      .request()
      .query(
        `DELETE FROM Notes WHERE status = 'Deleted' AND deleted_at < DATEADD(DAY, -30, GETDATE())`,
      );
    return res.status(200).json({
      message: "Da xoa ghi chu tren 30 ngay roi a",
      deleted: result.rowsAffected[0],
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const createNote = async (req, res) => {
  try {
    const { title, content, due_time, color } = req.body;
    console.log("due_time nhận được:", due_time);
    const user_id = req.user.user_id ?? req.user.id;
    const dueTimeValue = due_time ? new Date(due_time) : null;

    const pool = await sql.connect();
    const insertResult = await pool
      .request()
      .input("user_id", sql.Int, user_id)
      .input("title", sql.NVarChar, title)
      .input("content", sql.NVarChar, content)
      .input("color", sql.NVarChar, color || null)
      .input("dueTime", sql.DateTime, dueTimeValue).query(`
        INSERT INTO Notes (user_id, title, content, color, due_time, status, created_at, updated_at)
        OUTPUT INSERTED.note_id
        VALUES (@user_id, @title, @content, @color, @dueTime, 'Active', GETDATE(), GETDATE())
      `);

    const note_id = insertResult.recordset?.[0]?.note_id ?? null;
    res.status(201).json({ message: "Tao ghi chu thanh cong", note_id });
  } catch (error) {
    console.log("LỖI CHI TIẾT:", error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getNoteLabels = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect();
    const result = await pool.request().input("note_id", sql.Int, id)
      .query(`SELECT l.label_id, l.label_name 
                    FROM Labels l
                    INNER JOIN Note_Labels nl ON l.label_id = nl.label_id
                    WHERE nl.note_id = @note_id`);
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
