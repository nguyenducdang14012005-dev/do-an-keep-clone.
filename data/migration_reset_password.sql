-- Chạy script này 1 lần trên SQL Server để thêm 2 cột reset password vào bảng Users
-- Chỉ cần chạy nếu chưa có 2 cột này

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'reset_token'
)
BEGIN
  ALTER TABLE Users ADD reset_token NVARCHAR(10) NULL;
  PRINT 'Đã thêm cột reset_token';
END

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'reset_token_expiry'
)
BEGIN
  ALTER TABLE Users ADD reset_token_expiry DATETIME NULL;
  PRINT 'Đã thêm cột reset_token_expiry';
END
