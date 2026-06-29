-- =====================================================================
-- Migration: Reminder_Users
-- Mục đích : Cho phép MỖI người nhận chia sẻ note có trạng thái "đã đọc"
--            reminder riêng của họ, không ảnh hưởng tới người khác.
--            (Xem yêu cầu nâng cấp Reminder cho note được chia sẻ)
--
-- An toàn  : Script này CHỈ TẠO THÊM bảng mới, KHÔNG đụng tới Notes,
--            Note_Shares, Reminders hiện có. Có thể chạy lại nhiều lần
--            (idempotent) mà không lỗi / không tạo trùng dữ liệu.
-- =====================================================================

-- 1. Tạo bảng Reminder_Users nếu chưa tồn tại
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'Reminder_Users'
)
BEGIN
    CREATE TABLE Reminder_Users
    (
        reminder_id INT NOT NULL,
        user_id     INT NOT NULL,
        is_read     BIT NOT NULL DEFAULT 0,

        CONSTRAINT PK_Reminder_Users PRIMARY KEY (reminder_id, user_id),
        CONSTRAINT FK_Reminder_Users_Reminder FOREIGN KEY (reminder_id)
            REFERENCES Reminders(reminder_id),
        CONSTRAINT FK_Reminder_Users_User FOREIGN KEY (user_id)
            REFERENCES Users(user_id)
    );
END
GO

-- 2. Backfill dữ liệu hiện có để đảm bảo backward compatibility:
--    2a. Mỗi reminder đang có (status = 0, note chưa xoá vĩnh viễn) ->
--        tạo bản ghi Reminder_Users cho CHỦ SỞ HỮU note (nếu chưa có).
INSERT INTO Reminder_Users (reminder_id, user_id, is_read)
SELECT r.reminder_id, n.user_id, 0
FROM Reminders r
INNER JOIN Notes n ON n.note_id = r.note_id
WHERE NOT EXISTS (
    SELECT 1 FROM Reminder_Users ru
    WHERE ru.reminder_id = r.reminder_id AND ru.user_id = n.user_id
);
GO

--    2b. Mỗi reminder thuộc note đã có người ACCEPTED chia sẻ trước đây ->
--        tạo bản ghi Reminder_Users cho những người đó (nếu chưa có).
INSERT INTO Reminder_Users (reminder_id, user_id, is_read)
SELECT r.reminder_id, ns.user_id, 0
FROM Reminders r
INNER JOIN Note_Shares ns ON ns.note_id = r.note_id AND ns.share_status = 'Accepted'
WHERE NOT EXISTS (
    SELECT 1 FROM Reminder_Users ru
    WHERE ru.reminder_id = r.reminder_id AND ru.user_id = ns.user_id
);
GO
