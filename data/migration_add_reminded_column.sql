-- Thêm cột reminded vào bảng Notes
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'Notes' AND COLUMN_NAME = 'reminded'
)
BEGIN
  ALTER TABLE Notes ADD reminded BIT NOT NULL DEFAULT 0;
  PRINT 'Đã thêm cột reminded';
END