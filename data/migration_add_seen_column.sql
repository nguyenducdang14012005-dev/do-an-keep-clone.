-- Chạy 1 lần trong SSMS (hoặc Azure Data Studio) trên database GoogleKeepClone
-- Thêm cột "seen" cho bảng Note_Shares để biết thông báo "đã dừng chia sẻ"
-- nào đã được người dùng xem (dùng để xoá số đếm ở chuông thông báo).

ALTER TABLE dbo.Note_Shares
ADD seen BIT NOT NULL DEFAULT 1;
GO

-- Đặt các bản ghi cũ là "đã xem" (1) để không hiện thông báo cũ tràn lên,
-- chỉ những lượt "Dừng chia sẻ" làm MỚI từ giờ mới có seen = 0.
UPDATE dbo.Note_Shares SET seen = 1;
GO