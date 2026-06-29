import sql from "../config/db.js";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper gửi mail (tránh lặp code)
async function sendMail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
  } catch (err) {
    // Không để lỗi gửi mail làm fail cả request chính
    console.error("Lỗi gửi mail:", err.message);
  }
}

/**
 * 1. Người sở hữu note chia sẻ note cho người khác
 * - permission: 'view' | 'edit' | 'delete'
 * - share_status mặc định: 'Pending' (chờ người nhận phản hồi)
 */
export const shareNode = async (req, res) => {
  try {
    const { note_id } = req.params;
    const { email, permission } = req.body;

    if (!email || !permission) {
      return res.status(400).json({ message: "Thiếu email hoặc permission" });
    }

    const validPermissions = ["view", "edit", "delete"];
    if (!validPermissions.includes(permission)) {
      return res
        .status(400)
        .json({ message: "Permission không hợp lệ (view | edit | delete)" });
    }

    // Tìm note + người sở hữu note (giả định Notes.user_id là owner)
    const noteResult =
      await sql.query`SELECT note_id, title, content, user_id FROM Notes WHERE note_id = ${note_id}`;
    if (noteResult.recordset.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy ghi chú" });
    }
    const note = noteResult.recordset[0];
    const ownerId = note.user_id;

    // Tìm người được chia sẻ
    const userResult =
      await sql.query`SELECT user_id, full_name FROM Users WHERE email = ${email}`;
    if (userResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy người dùng với email này" });
    }
    const sharedUser = userResult.recordset[0];
    const sharedUserId = sharedUser.user_id;

    if (sharedUserId === ownerId) {
      return res
        .status(400)
        .json({ message: "Không thể tự chia sẻ ghi chú cho chính mình" });
    }

    // Kiểm tra đã từng chia sẻ chưa
    const check =
      await sql.query`SELECT * FROM Note_Shares WHERE note_id = ${note_id} AND user_id = ${sharedUserId}`;
    if (check.recordset.length > 0) {
      return res
        .status(400)
        .json({ message: "Đã chia sẻ ghi chú này cho người dùng này rồi" });
    }

    // Tạo bản ghi chia sẻ với trạng thái Pending
    const insertResult = await sql.query`
            INSERT INTO Note_Shares (note_id, user_id, permission, share_status)
            OUTPUT INSERTED.share_id
            VALUES (${note_id}, ${sharedUserId}, ${permission}, 'Pending')
        `;
    const shareId = insertResult.recordset[0].share_id;

    // Gửi email thông báo cho người được chia sẻ, kèm link xác nhận
    await sendMail(
      email,
      "Có người chia sẻ ghi chú với bạn!",
      `
                <h3>${note.title || "Không có tiêu đề"}</h3>
                <p>${note.content || "Không có nội dung"}</p>
                <hr/>
                <p>Quyền truy cập được cấp: <b>${permission}</b></p>
                <p>Vui lòng vào ứng dụng để <b>Chấp nhận</b> hoặc <b>Từ chối</b> lời mời này.</p>
                <p>Mã chia sẻ: ${shareId}</p>
            `,
    );

    return res.status(201).json({
      message: "Đã gửi yêu cầu chia sẻ ghi chú, đang chờ người nhận phản hồi",
      share_id: shareId,
      share_status: "Pending",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 2. Người được chia sẻ CHẤP NHẬN lời mời
 * - cập nhật share_status = 'Accepted'
 * - note sẽ hiển thị với quyền tương ứng cho người này
 * - thông báo lại cho người chia sẻ (owner) rằng đã được chấp nhận
 */
export const acceptShare = async (req, res) => {
  try {
    const { share_id } = req.params;
    const currentUserId = req.user.user_id; // lấy từ middleware xác thực

    const shareResult = await sql.query`
            SELECT ns.*, n.title, n.user_id AS owner_id
            FROM Note_Shares ns
            INNER JOIN Notes n ON ns.note_id = n.note_id
            WHERE ns.share_id = ${share_id}
        `;
    if (shareResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy lời mời chia sẻ" });
    }
    const share = shareResult.recordset[0];

    if (share.user_id !== currentUserId) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền phản hồi lời mời này" });
    }
    if (share.share_status === "Accepted") {
      return res
        .status(400)
        .json({ message: "Lời mời này đã được chấp nhận trước đó" });
    }

    await sql.query`UPDATE Note_Shares SET share_status = 'Accepted' WHERE share_id = ${share_id}`;

    // Lấy email + tên người chấp nhận để báo cho owner
    const userResult =
      await sql.query`SELECT email, full_name FROM Users WHERE user_id = ${currentUserId}`;
    const accepter = userResult.recordset[0];
    const ownerResult =
      await sql.query`SELECT email FROM Users WHERE user_id = ${share.owner_id}`;
    const ownerEmail = ownerResult.recordset[0]?.email;

    if (ownerEmail) {
      await sendMail(
        ownerEmail,
        "Lời mời chia sẻ ghi chú đã được chấp nhận",
        `<p><b>${accepter?.full_name || accepter?.email}</b> đã <b>chấp nhận</b> lời mời chia sẻ ghi chú "${share.title}".</p>`,
      );
    }

    return res
      .status(200)
      .json({ message: "Đã chấp nhận chia sẻ", share_status: "Accepted" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 3. Người được chia sẻ TỪ CHỐI lời mời
 * - cập nhật share_status = 'Rejected'
 * - không có gì thay đổi về quyền truy cập note
 * - thông báo lại cho người chia sẻ (owner) rằng đã bị từ chối
 */
export const rejectShare = async (req, res) => {
  try {
    const { share_id } = req.params;
    const currentUserId = req.user.user_id;

    const shareResult = await sql.query`
            SELECT ns.*, n.title, n.user_id AS owner_id
            FROM Note_Shares ns
            INNER JOIN Notes n ON ns.note_id = n.note_id
            WHERE ns.share_id = ${share_id}
        `;
    if (shareResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy lời mời chia sẻ" });
    }
    const share = shareResult.recordset[0];

    if (share.user_id !== currentUserId) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền phản hồi lời mời này" });
    }
    if (share.share_status === "Rejected") {
      return res
        .status(400)
        .json({ message: "Lời mời này đã bị từ chối trước đó" });
    }

    await sql.query`UPDATE Note_Shares SET share_status = 'Rejected' WHERE share_id = ${share_id}`;

    const userResult =
      await sql.query`SELECT email, full_name FROM Users WHERE user_id = ${currentUserId}`;
    const rejecter = userResult.recordset[0];
    const ownerResult =
      await sql.query`SELECT email FROM Users WHERE user_id = ${share.owner_id}`;
    const ownerEmail = ownerResult.recordset[0]?.email;

    if (ownerEmail) {
      await sendMail(
        ownerEmail,
        "Lời mời chia sẻ ghi chú đã bị từ chối",
        `<p><b>${rejecter?.full_name || rejecter?.email}</b> đã <b>từ chối</b> lời mời chia sẻ ghi chú "${share.title}".</p>`,
      );
    }

    return res
      .status(200)
      .json({ message: "Đã từ chối chia sẻ", share_status: "Rejected" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 4. Lấy danh sách những người được chia sẻ note (dùng cho owner xem ai đã accept/reject/pending)
 */
export const getShares = async (req, res) => {
  try {
    const { note_id } = req.params;
    const result = await sql.query`
            SELECT ns.share_id, ns.note_id, ns.user_id, ns.permission, ns.share_status, u.email
            FROM Note_Shares ns
            INNER JOIN Users u ON ns.user_id = u.user_id
            WHERE ns.note_id = ${note_id}
        `;
    return res.status(200).json(result.recordset);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 5. Lấy danh sách thông báo của người dùng hiện tại (người được chia sẻ):
 * - 'Pending'  -> lời mời chia sẻ mới, cần Chấp nhận / Từ chối
 * - 'Revoked'  -> thông báo "đã dừng chia sẻ" (chỉ mang tính thông tin)
 * -> dùng để hiển thị "thông báo" (chuông) cho người được chia sẻ
 */

// ⚡ SỬA LẠI TRONG backend/src/controllers/shareController.js
export const getPendingSharesForUser = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const result = await sql.query`
            SELECT ns.share_id, ns.permission, ns.share_status, ns.seen,
                   n.note_id, n.title, n.content,
                   u.email AS shared_by_email, u.full_name AS shared_by_name
            FROM Note_Shares ns
            INNER JOIN Notes n ON ns.note_id = n.note_id
            INNER JOIN Users u ON n.user_id = u.user_id
            WHERE ns.user_id = ${currentUserId}
              -- ⚡ ĐÃ SỬA: Lời mời mới (Pending), tin hủy (Revoked chưa xem), và tin đổi quyền (Accepted) luôn luôn hiện ở chuông để đọc
              AND (ns.share_status IN ('Pending', 'Accepted') OR (ns.share_status = 'Revoked' AND ns.seen = 0))
            ORDER BY ns.share_id DESC
        `;
    return res.status(200).json(result.recordset);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
/**
 * 6. ⚡ ĐÃ CẬP NHẬT: Lấy danh sách ghi chú đã Accepted kèm theo thông tin người chia sẻ và hạn chót (due_time)
 */
export const getAcceptedSharedNotes = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const result = await sql.query`
            SELECT 
                n.note_id, 
                n.title, 
                n.content, 
                n.due_time, -- ⚡ ĐÃ BỔ SUNG: lấy thời gian hạn chót của ghi chú
                ns.share_id,
                ns.permission, 
                ns.share_status,
                u.email AS shared_by_email, 
                u.full_name AS shared_by_name
            FROM Note_Shares ns
            INNER JOIN Notes n ON ns.note_id = n.note_id
            INNER JOIN Users u ON n.user_id = u.user_id
            WHERE ns.user_id = ${currentUserId} 
              AND ns.share_status = 'Accepted'
        `;
    return res.status(200).json(result.recordset);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 7. Owner xem lại tất cả các note mình đã chia sẻ (cho ai, quyền gì, trạng thái Pending/Accepted/Rejected)
 * -> dùng để hiển thị danh sách "Note tôi đã chia sẻ" kèm nút "Dừng chia sẻ"
 */
export const getMySharedNotes = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    const result = await sql.query`
            SELECT ns.share_id, ns.note_id, ns.permission, ns.share_status,
                   n.title, n.content,
                   u.user_id AS shared_with_id, u.email AS shared_with_email, u.full_name AS shared_with_name
            FROM Note_Shares ns
            INNER JOIN Notes n ON ns.note_id = n.note_id
            INNER JOIN Users u ON ns.user_id = u.user_id
            WHERE n.user_id = ${currentUserId}
            ORDER BY n.note_id, ns.share_id
        `;
    return res.status(200).json(result.recordset);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 8. Dừng chia sẻ một lượt chia sẻ
 * - Chỉ owner của note (người đã chia sẻ) mới được quyền dừng chia sẻ
 * - Người được chia sẻ mất quyền truy cập note ngay lập tức
 * - KHÔNG xoá hẳn bản ghi -> chuyển share_status = 'Revoked' để lưu lại
 * thành thông báo "đã dừng chia sẻ" cho người được chia sẻ biết
 */
export const removeShare = async (req, res) => {
  try {
    const { share_id } = req.params;
    const currentUserId = req.user.user_id;

    const shareResult = await sql.query`
            SELECT ns.share_id, ns.user_id AS shared_user_id, n.user_id AS owner_id, n.title
            FROM Note_Shares ns
            INNER JOIN Notes n ON ns.note_id = n.note_id
            WHERE ns.share_id = ${share_id}
        `;
    if (shareResult.recordset.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy lượt chia sẻ" });
    }
    const share = shareResult.recordset[0];

    if (share.owner_id !== currentUserId) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền dừng chia sẻ ghi chú này" });
    }

    // Soft-revoke: giữ lại bản ghi, đánh dấu chưa xem (seen = 0) để hiện
    // thành thông báo mới cho người được chia sẻ.
    await sql.query`
            UPDATE Note_Shares
            SET share_status = 'Revoked', seen = 0
            WHERE share_id = ${share_id}
        `;

    const sharedUserResult =
      await sql.query`SELECT email FROM Users WHERE user_id = ${share.shared_user_id}`;
    const sharedUserEmail = sharedUserResult.recordset[0]?.email;

    if (sharedUserEmail) {
      await sendMail(
        sharedUserEmail,
        "Một ghi chú đã dừng được chia sẻ với bạn",
        `<p>Chủ ghi chú đã <b>dừng chia sẻ</b> ghi chú "${share.title}" với bạn. Bạn không còn quyền truy cập ghi chú này nữa.</p>`,
      );
    }

    return res
      .status(200)
      .json({ message: "Đã dừng chia sẻ ghi chú thành công" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 9. Đánh dấu các thông báo "đã dừng chia sẻ" (Revoked) là đã xem
 * - gọi khi người dùng mở chuông thông báo, để xoá số đếm badge
 */
export const markNotificationsSeen = async (req, res) => {
  try {
    const currentUserId = req.user.user_id;
    await sql.query`
            UPDATE Note_Shares
            SET seen = 1
            WHERE user_id = ${currentUserId} AND seen = 0
        `; // ⚡ ĐÃ SỬA: Cập nhật toàn bộ thông báo chưa xem về thành đã xem
    return res.status(200).json({ message: "Đã đánh dấu đã xem" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
/**
 * 10. 🆕 BỔ SUNG: Owner thay đổi quyền truy cập của một người đã được chia sẻ
 * - Cập nhật permission: 'view' | 'edit' | 'delete'
 * - Tự động gửi mail thông báo quyền mới cho người nhận
 */
export const updateSharePermission = async (req, res) => {
  try {
    const { share_id } = req.params;
    const { permission } = req.body;
    const currentUserId = req.user.user_id;

    const validPermissions = ["view", "edit", "delete"];
    if (!validPermissions.includes(permission)) {
      return res.status(400).json({ message: "Permission không hợp lệ" });
    }

    const shareResult = await sql.query`
            SELECT ns.*, n.user_id AS owner_id, n.title
            FROM Note_Shares ns
            INNER JOIN Notes n ON ns.note_id = n.note_id
            WHERE ns.share_id = ${share_id}
        `;

    if (shareResult.recordset.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy lượt chia sẻ" });
    }
    const share = shareResult.recordset[0];

    if (share.owner_id !== currentUserId) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa" });
    }

    // ⚡ CẬP NHẬT: Đổi quyền, đồng thời set seen = 0 để nó biến thành một thông báo mới ở Chuông
    await sql.query`
            UPDATE Note_Shares
            SET permission = ${permission}, seen = 0
            WHERE share_id = ${share_id}
        `;

    return res
      .status(200)
      .json({ message: "Đã cập nhật quyền và phát thông báo ở chuông" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
