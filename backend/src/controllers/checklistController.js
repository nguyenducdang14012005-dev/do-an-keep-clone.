import sql from "../config/db.js";
import { getPool } from "../config/db.js";

// ─── Helper: kiểm tra quyền truy cập ghi chú ─────────────────────────────────
const checkNoteAccess = async (note_id, user_id, requireEdit = false) => {
  const pool = await getPool();

  const noteRes = await pool
    .request()
    .input("note_id", sql.Int, note_id)
    .query("SELECT user_id, status FROM Notes WHERE note_id = @note_id");

  if (noteRes.recordset.length === 0)
    return { error: "Không tìm thấy ghi chú", status: 404 };
  const note = noteRes.recordset[0];
  if (note.status === "PermanentlyDeleted")
    return { error: "Ghi chú đã bị xóa", status: 404 };

  const isOwner = note.user_id === user_id;
  if (isOwner) return { ok: true, isOwner: true };

  // Kiểm tra chia sẻ
  const shareRes = await pool
    .request()
    .input("note_id", sql.Int, note_id)
    .input("user_id", sql.Int, user_id)
    .query(
      "SELECT permission FROM Note_Shares WHERE note_id = @note_id AND user_id = @user_id AND share_status = 'Accepted'",
    );

  if (shareRes.recordset.length === 0)
    return { error: "Bạn không có quyền truy cập ghi chú này", status: 403 };
  const { permission } = shareRes.recordset[0];

  if (requireEdit && permission === "view") {
    return {
      error: "Bạn chỉ có quyền xem, không thể chỉnh sửa checklist",
      status: 403,
    };
  }

  return { ok: true, isOwner: false, permission };
};

// ─── GET /api/notes/:id/checklist ─────────────────────────────────────────────
// Lấy toàn bộ checklist items của một ghi chú, sắp xếp theo position
export const getChecklist = async (req, res) => {
  try {
    const note_id = parseInt(req.params.id, 10);
    const user_id = req.user.user_id ?? req.user.id;

    const access = await checkNoteAccess(note_id, user_id, false);
    if (!access.ok)
      return res.status(access.status).json({ error: access.error });

    const pool = await getPool();
    const result = await pool
      .request()
      .input("note_id", sql.Int, note_id)
      .query(
        "SELECT item_id, note_id, content, is_completed, position FROM Checklist_Items WHERE note_id = @note_id ORDER BY position ASC",
      );

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── POST /api/notes/:id/checklist ────────────────────────────────────────────
// Thêm một item mới vào checklist
export const addChecklistItem = async (req, res) => {
  try {
    const note_id = parseInt(req.params.id, 10);
    const user_id = req.user.user_id ?? req.user.id;
    const { content, position } = req.body;

    if (!content || content.trim() === "") {
      return res
        .status(400)
        .json({ error: "Nội dung item không được để trống" });
    }

    const access = await checkNoteAccess(note_id, user_id, true);
    if (!access.ok)
      return res.status(access.status).json({ error: access.error });

    const pool = await getPool();

    // Tính position tự động nếu không truyền vào
    let pos = position;
    if (pos === undefined || pos === null) {
      const maxRes = await pool
        .request()
        .input("note_id", sql.Int, note_id)
        .query(
          "SELECT ISNULL(MAX(position), 0) AS max_pos FROM Checklist_Items WHERE note_id = @note_id",
        );
      pos = maxRes.recordset[0].max_pos + 1;
    }

    const insertRes = await pool
      .request()
      .input("note_id", sql.Int, note_id)
      .input("content", sql.NVarChar, content.trim())
      .input("is_completed", sql.Bit, 0)
      .input("position", sql.Int, pos).query(`
        INSERT INTO Checklist_Items (note_id, content, is_completed, position)
        OUTPUT INSERTED.item_id, INSERTED.note_id, INSERTED.content, INSERTED.is_completed, INSERTED.position
        VALUES (@note_id, @content, @is_completed, @position)
      `);

    // Cập nhật updated_at của ghi chú
    await pool
      .request()
      .input("note_id", sql.Int, note_id)
      .query(
        "UPDATE Notes SET updated_at = GETDATE() WHERE note_id = @note_id",
      );

    res.status(201).json(insertRes.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── PUT /api/notes/:id/checklist/:item_id ───────────────────────────────────
// Cập nhật content và/hoặc is_completed của một item
export const updateChecklistItem = async (req, res) => {
  try {
    const note_id = parseInt(req.params.id, 10);
    const item_id = parseInt(req.params.item_id, 10);
    const user_id = req.user.user_id ?? req.user.id;
    const { content, is_completed } = req.body;

    const access = await checkNoteAccess(note_id, user_id, true);
    if (!access.ok)
      return res.status(access.status).json({ error: access.error });

    const pool = await getPool();

    // Kiểm tra item thuộc ghi chú này
    const itemCheck = await pool
      .request()
      .input("item_id", sql.Int, item_id)
      .input("note_id", sql.Int, note_id)
      .query(
        "SELECT item_id FROM Checklist_Items WHERE item_id = @item_id AND note_id = @note_id",
      );

    if (itemCheck.recordset.length === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy item trong checklist" });
    }

    // Xây dựng câu UPDATE linh hoạt
    const fields = [];
    const request = pool.request().input("item_id", sql.Int, item_id);

    if (content !== undefined) {
      fields.push("content = @content");
      request.input("content", sql.NVarChar, content.trim());
    }
    if (is_completed !== undefined) {
      fields.push("is_completed = @is_completed");
      request.input("is_completed", sql.Bit, is_completed ? 1 : 0);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "Không có dữ liệu để cập nhật" });
    }

    const updateRes = await request.query(`
      UPDATE Checklist_Items
      SET ${fields.join(", ")}
      OUTPUT INSERTED.item_id, INSERTED.note_id, INSERTED.content, INSERTED.is_completed, INSERTED.position
      WHERE item_id = @item_id
    `);

    // Cập nhật updated_at của ghi chú
    await pool
      .request()
      .input("note_id", sql.Int, note_id)
      .query(
        "UPDATE Notes SET updated_at = GETDATE() WHERE note_id = @note_id",
      );

    res.status(200).json(updateRes.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── DELETE /api/notes/:id/checklist/:item_id ────────────────────────────────
// Xóa một item khỏi checklist
export const deleteChecklistItem = async (req, res) => {
  try {
    const note_id = parseInt(req.params.id, 10);
    const item_id = parseInt(req.params.item_id, 10);
    const user_id = req.user.user_id ?? req.user.id;

    const access = await checkNoteAccess(note_id, user_id, true);
    if (!access.ok)
      return res.status(access.status).json({ error: access.error });

    const pool = await getPool();

    const itemCheck = await pool
      .request()
      .input("item_id", sql.Int, item_id)
      .input("note_id", sql.Int, note_id)
      .query(
        "SELECT item_id FROM Checklist_Items WHERE item_id = @item_id AND note_id = @note_id",
      );

    if (itemCheck.recordset.length === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy item trong checklist" });
    }

    await pool
      .request()
      .input("item_id", sql.Int, item_id)
      .query("DELETE FROM Checklist_Items WHERE item_id = @item_id");

    // Cập nhật updated_at của ghi chú
    await pool
      .request()
      .input("note_id", sql.Int, note_id)
      .query(
        "UPDATE Notes SET updated_at = GETDATE() WHERE note_id = @note_id",
      );

    res.status(200).json({ message: "Đã xóa item khỏi checklist" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── PUT /api/notes/:id/checklist/reorder ────────────────────────────────────
// Cập nhật lại thứ tự (position) của toàn bộ items trong checklist
// Body: { items: [{ item_id, position }] }
export const reorderChecklist = async (req, res) => {
  try {
    const note_id = parseInt(req.params.id, 10);
    const user_id = req.user.user_id ?? req.user.id;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Dữ liệu sắp xếp không hợp lệ" });
    }

    const access = await checkNoteAccess(note_id, user_id, true);
    if (!access.ok)
      return res.status(access.status).json({ error: access.error });

    const pool = await getPool();

    // Cập nhật position từng item bằng transaction
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      for (const item of items) {
        await transaction
          .request()
          .input("item_id", sql.Int, item.item_id)
          .input("position", sql.Int, item.position)
          .input("note_id", sql.Int, note_id)
          .query(
            "UPDATE Checklist_Items SET position = @position WHERE item_id = @item_id AND note_id = @note_id",
          );
      }

      await transaction
        .request()
        .input("note_id", sql.Int, note_id)
        .query(
          "UPDATE Notes SET updated_at = GETDATE() WHERE note_id = @note_id",
        );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    res.status(200).json({ message: "Đã cập nhật thứ tự checklist" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
