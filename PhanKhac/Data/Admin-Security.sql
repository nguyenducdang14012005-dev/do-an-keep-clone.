-- =========================================================
-- PHAN QUOC KY - ADMIN & BAO MAT COT LOI
-- Dung de nang cap database GoogleKeepClone da tao tu google_keep.sql cu.
-- Neu tao moi tu CNPM/google_keep.sql ban moi thi khong bat buoc chay file nay.
-- =========================================================

IF DB_ID(N'GoogleKeepClone') IS NULL
BEGIN
    THROW 50000, N'Chua co database GoogleKeepClone. Hay chay CNPM/google_keep.sql truoc.', 1;
END
GO

USE GoogleKeepClone;
GO

-- =========================================================
-- 1. BO SUNG COT/RANG BUOC CHO CUM TAI KHOAN & ADMIN
-- =========================================================

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_Roles_role_name' AND object_id = OBJECT_ID(N'dbo.Roles')
)
BEGIN
    CREATE UNIQUE INDEX UX_Roles_role_name ON dbo.Roles(role_name);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_Users_status' AND parent_object_id = OBJECT_ID(N'dbo.Users')
)
BEGIN
    ALTER TABLE dbo.Users
    ADD CONSTRAINT CK_Users_status CHECK (status IN (N'Active', N'Inactive', N'Banned'));
END
GO

IF COL_LENGTH(N'dbo.User_Devices', N'ip_address') IS NULL
BEGIN
    ALTER TABLE dbo.User_Devices ADD ip_address NVARCHAR(50) NULL;
END
GO

IF COL_LENGTH(N'dbo.User_Devices', N'user_agent') IS NULL
BEGIN
    ALTER TABLE dbo.User_Devices ADD user_agent NVARCHAR(255) NULL;
END
GO

IF COL_LENGTH(N'dbo.User_Devices', N'created_at') IS NULL
BEGIN
    ALTER TABLE dbo.User_Devices
    ADD created_at DATETIME2(0) NOT NULL
        CONSTRAINT DF_UserDevices_created_at DEFAULT SYSDATETIME();
END
GO

IF COL_LENGTH(N'dbo.User_Devices', N'last_login_at') IS NULL
BEGIN
    ALTER TABLE dbo.User_Devices
    ADD last_login_at DATETIME2(0) NOT NULL
        CONSTRAINT DF_UserDevices_last_login_at DEFAULT SYSDATETIME();
END
GO

IF COL_LENGTH(N'dbo.Backups', N'status') IS NULL
BEGIN
    ALTER TABLE dbo.Backups
    ADD status NVARCHAR(50) NOT NULL
        CONSTRAINT DF_Backups_status DEFAULT N'Recorded';
END
GO

IF COL_LENGTH(N'dbo.Backups', N'created_by') IS NULL
BEGIN
    ALTER TABLE dbo.Backups ADD created_by INT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_Backups_status' AND parent_object_id = OBJECT_ID(N'dbo.Backups')
)
BEGIN
    ALTER TABLE dbo.Backups
    ADD CONSTRAINT CK_Backups_status CHECK (status IN (N'Recorded', N'Completed', N'Failed'));
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = N'FK_Backups_Users' AND parent_object_id = OBJECT_ID(N'dbo.Backups')
)
BEGIN
    ALTER TABLE dbo.Backups
    ADD CONSTRAINT FK_Backups_Users
    FOREIGN KEY (created_by) REFERENCES dbo.Users(user_id) ON DELETE SET NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Users_email_status' AND object_id = OBJECT_ID(N'dbo.Users')
)
BEGIN
    CREATE INDEX IX_Users_email_status ON dbo.Users(email, status);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Users_status_created_at' AND object_id = OBJECT_ID(N'dbo.Users')
)
BEGIN
    CREATE INDEX IX_Users_status_created_at ON dbo.Users(status, created_at DESC);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_UserDevices_user_last_login' AND object_id = OBJECT_ID(N'dbo.User_Devices')
)
BEGIN
    CREATE INDEX IX_UserDevices_user_last_login ON dbo.User_Devices(user_id, last_login_at DESC);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_AuditLogs_timestamp' AND object_id = OBJECT_ID(N'dbo.Audit_Logs')
)
BEGIN
    CREATE INDEX IX_AuditLogs_timestamp ON dbo.Audit_Logs([timestamp] DESC);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_AuditLogs_user_timestamp' AND object_id = OBJECT_ID(N'dbo.Audit_Logs')
)
BEGIN
    CREATE INDEX IX_AuditLogs_user_timestamp ON dbo.Audit_Logs(user_id, [timestamp] DESC);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Backups_created_at' AND object_id = OBJECT_ID(N'dbo.Backups')
)
BEGIN
    CREATE INDEX IX_Backups_created_at ON dbo.Backups(created_at DESC);
END
GO

-- =========================================================
-- 2. SEED ROLE, USER DEMO, DEVICE, AUDIT, BACKUP
-- Mat khau demo da bam bcrypt cost 12.
-- =========================================================

MERGE dbo.Roles AS target
USING (VALUES
    (N'Admin'),
    (N'User'),
    (N'Collaborator')
) AS source(role_name)
ON target.role_name = source.role_name
WHEN NOT MATCHED THEN
    INSERT (role_name) VALUES (source.role_name);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE email = N'quocky@cnpm.local')
BEGIN
    INSERT INTO dbo.Users(email, [password], full_name, status)
    VALUES (
        N'quocky@cnpm.local',
        N'$2b$12$jbGV6ooeZyOs8PQzMf8FhuefIwqLyLZ3HhEVwyiH6baAOQ.XaNoKG',
        N'Huỳnh Quốc Kỳ',
        N'Active'
    );
END

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE email = N'bathuan@cnpm.local')
BEGIN
    INSERT INTO dbo.Users(email, [password], full_name, status)
    VALUES (
        N'bathuan@cnpm.local',
        N'$2b$12$9LOrDvaJtN4Y.hWcD8CbiupMXf.SzakQyU63fF9dN1GLO0v681qH.',
        N'Bá Thuần',
        N'Active'
    );
END

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE email = N'ducdang@cnpm.local')
BEGIN
    INSERT INTO dbo.Users(email, [password], full_name, status)
    VALUES (
        N'ducdang@cnpm.local',
        N'$2b$12$BG9etQ4EStfUKNCX9tCxrOXXnf5ofuLiRVO5m7XtgWt/t9K9szXgq',
        N'Nguyễn Đức Đăng',
        N'Active'
    );
END
GO

INSERT INTO dbo.User_Roles(user_id, role_id)
SELECT u.user_id, r.role_id
FROM dbo.Users u
JOIN dbo.Roles r ON r.role_name = N'Admin'
WHERE u.email = N'quocky@cnpm.local'
  AND NOT EXISTS (
      SELECT 1 FROM dbo.User_Roles ur
      WHERE ur.user_id = u.user_id AND ur.role_id = r.role_id
  );

INSERT INTO dbo.User_Roles(user_id, role_id)
SELECT u.user_id, r.role_id
FROM dbo.Users u
JOIN dbo.Roles r ON r.role_name = N'User'
WHERE u.email IN (N'bathuan@cnpm.local', N'ducdang@cnpm.local')
  AND NOT EXISTS (
      SELECT 1 FROM dbo.User_Roles ur
      WHERE ur.user_id = u.user_id AND ur.role_id = r.role_id
  );
GO

INSERT INTO dbo.User_Devices(user_id, device_name, ip_address, user_agent)
SELECT u.user_id, N'Chrome on Windows - CNPM demo', N'127.0.0.1', N'CNPM seed script'
FROM dbo.Users u
WHERE u.email = N'quocky@cnpm.local'
  AND NOT EXISTS (
      SELECT 1 FROM dbo.User_Devices d
      WHERE d.user_id = u.user_id AND d.device_name = N'Chrome on Windows - CNPM demo'
  );

INSERT INTO dbo.User_Devices(user_id, device_name, ip_address, user_agent)
SELECT u.user_id, N'Mobile browser - CNPM demo', N'127.0.0.1', N'CNPM seed script'
FROM dbo.Users u
WHERE u.email IN (N'bathuan@cnpm.local', N'ducdang@cnpm.local')
  AND NOT EXISTS (
      SELECT 1 FROM dbo.User_Devices d
      WHERE d.user_id = u.user_id AND d.device_name = N'Mobile browser - CNPM demo'
  );
GO

DECLARE @admin_user_id INT = (SELECT user_id FROM dbo.Users WHERE email = N'quocky@cnpm.local');
DECLARE @admin_device_id INT = (
    SELECT TOP (1) device_id
    FROM dbo.User_Devices
    WHERE user_id = @admin_user_id
    ORDER BY last_login_at DESC, device_id DESC
);

IF NOT EXISTS (
    SELECT 1 FROM dbo.Audit_Logs
    WHERE action = N'SEED_PROJECT_DATA_FROM_ASSIGNMENT'
)
BEGIN
    INSERT INTO dbo.Audit_Logs(user_id, action, ip_address, user_agent, device_id)
    VALUES
        (@admin_user_id, N'SEED_PROJECT_DATA_FROM_ASSIGNMENT', N'127.0.0.1', N'SSMS/SQL script', @admin_device_id),
        (@admin_user_id, N'AUTH_LOGIN_SUCCESS', N'127.0.0.1', N'Chrome on Windows - CNPM demo', @admin_device_id),
        (@admin_user_id, N'ADMIN_VIEW_USERS', N'127.0.0.1', N'Chrome on Windows - CNPM demo', @admin_device_id);
END

IF NOT EXISTS (
    SELECT 1 FROM dbo.Backups
    WHERE file_path = N'D:\2026\CNPM\backup_google_keep_seed.bak'
)
BEGIN
    INSERT INTO dbo.Backups(file_path, status, created_by)
    VALUES (N'D:\2026\CNPM\backup_google_keep_seed.bak', N'Recorded', @admin_user_id);
END
GO

-- =========================================================
-- 3. VIEW CHO ADMIN DASHBOARD
-- =========================================================

CREATE OR ALTER VIEW dbo.vw_Admin_Dashboard_Stats AS
SELECT
    (SELECT COUNT_BIG(*) FROM dbo.Users) AS total_users,
    (SELECT COUNT_BIG(*) FROM dbo.Users WHERE status = N'Active') AS active_users,
    (SELECT COUNT_BIG(*) FROM dbo.Users WHERE status = N'Inactive') AS inactive_users,
    (SELECT COUNT_BIG(*) FROM dbo.Users WHERE status = N'Banned') AS banned_users,
    (SELECT COUNT_BIG(*) FROM dbo.Roles) AS total_roles,
    (SELECT COUNT_BIG(*) FROM dbo.User_Devices) AS total_devices,
    (SELECT COUNT_BIG(*) FROM dbo.Audit_Logs) AS total_audit_logs,
    (SELECT COUNT_BIG(*) FROM dbo.Backups) AS total_backups,
    (SELECT MAX(created_at) FROM dbo.Backups) AS last_backup_at,
    (SELECT MAX([timestamp]) FROM dbo.Audit_Logs) AS last_audit_at;
GO

CREATE OR ALTER VIEW dbo.vw_Admin_User_List AS
SELECT
    u.user_id,
    u.email,
    u.full_name,
    u.status,
    u.created_at,
    ISNULL(role_summary.roles, N'') AS roles,
    ISNULL(device_summary.total_devices, 0) AS total_devices,
    device_summary.last_login_at
FROM dbo.Users u
OUTER APPLY (
    SELECT STRING_AGG(role_rows.role_name, N', ') AS roles
    FROM (
        SELECT r.role_name
        FROM dbo.User_Roles ur
        JOIN dbo.Roles r ON r.role_id = ur.role_id
        WHERE ur.user_id = u.user_id
    ) AS role_rows
) AS role_summary
OUTER APPLY (
    SELECT COUNT(1) AS total_devices, MAX(last_login_at) AS last_login_at
    FROM dbo.User_Devices d
    WHERE d.user_id = u.user_id
) AS device_summary;
GO

CREATE OR ALTER VIEW dbo.vw_Admin_Recent_Audit_Logs AS
SELECT TOP (50)
    l.log_id,
    l.[timestamp],
    l.user_id,
    u.email,
    u.full_name,
    l.action,
    l.ip_address,
    l.user_agent,
    l.device_id
FROM dbo.Audit_Logs l
LEFT JOIN dbo.Users u ON u.user_id = l.user_id
ORDER BY l.[timestamp] DESC, l.log_id DESC;
GO

-- =========================================================
-- 4. STORED PROCEDURE CHO API/DEMO ADMIN
-- =========================================================

CREATE OR ALTER PROCEDURE dbo.sp_Admin_SetUserStatus
    @admin_email NVARCHAR(100),
    @target_email NVARCHAR(100),
    @new_status NVARCHAR(50),
    @ip_address NVARCHAR(50) = NULL,
    @user_agent NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @new_status NOT IN (N'Active', N'Inactive', N'Banned')
        THROW 50001, N'Trang thai tai khoan khong hop le.', 1;

    DECLARE @admin_user_id INT = (SELECT user_id FROM dbo.Users WHERE email = @admin_email);
    DECLARE @target_user_id INT = (SELECT user_id FROM dbo.Users WHERE email = @target_email);

    IF @admin_user_id IS NULL THROW 50002, N'Khong tim thay tai khoan admin.', 1;
    IF @target_user_id IS NULL THROW 50003, N'Khong tim thay tai khoan can cap nhat.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.User_Roles ur
        JOIN dbo.Roles r ON r.role_id = ur.role_id
        WHERE ur.user_id = @admin_user_id AND r.role_name = N'Admin'
    )
        THROW 50004, N'Tai khoan hien tai khong co quyen Admin.', 1;

    UPDATE dbo.Users
    SET status = @new_status
    WHERE user_id = @target_user_id;

    INSERT INTO dbo.Audit_Logs(user_id, action, ip_address, user_agent, device_id)
    SELECT
        @admin_user_id,
        CONCAT(N'ADMIN_SET_USER_STATUS target=', @target_email, N' status=', @new_status),
        @ip_address,
        @user_agent,
        (
            SELECT TOP (1) device_id
            FROM dbo.User_Devices
            WHERE user_id = @admin_user_id
            ORDER BY last_login_at DESC, device_id DESC
        );

    SELECT user_id, email, full_name, status, created_at
    FROM dbo.Users
    WHERE user_id = @target_user_id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Admin_RecordBackup
    @admin_email NVARCHAR(100),
    @file_path NVARCHAR(MAX),
    @status NVARCHAR(50) = N'Recorded',
    @ip_address NVARCHAR(50) = NULL,
    @user_agent NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @status NOT IN (N'Recorded', N'Completed', N'Failed')
        THROW 50005, N'Trang thai backup khong hop le.', 1;

    DECLARE @admin_user_id INT = (SELECT user_id FROM dbo.Users WHERE email = @admin_email);
    IF @admin_user_id IS NULL THROW 50006, N'Khong tim thay tai khoan admin.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.User_Roles ur
        JOIN dbo.Roles r ON r.role_id = ur.role_id
        WHERE ur.user_id = @admin_user_id AND r.role_name = N'Admin'
    )
        THROW 50007, N'Tai khoan hien tai khong co quyen Admin.', 1;

    INSERT INTO dbo.Backups(file_path, status, created_by)
    OUTPUT INSERTED.backup_id, INSERTED.created_at, INSERTED.file_path, INSERTED.status, INSERTED.created_by
    VALUES (@file_path, @status, @admin_user_id);

    INSERT INTO dbo.Audit_Logs(user_id, action, ip_address, user_agent, device_id)
    SELECT
        @admin_user_id,
        CONCAT(N'BACKUP_CREATED path=', @file_path, N' status=', @status),
        @ip_address,
        @user_agent,
        (
            SELECT TOP (1) device_id
            FROM dbo.User_Devices
            WHERE user_id = @admin_user_id
            ORDER BY last_login_at DESC, device_id DESC
        );
END
GO

-- =========================================================
-- 5. TRUY VAN KIEM TRA NHANH
-- =========================================================

SELECT * FROM dbo.vw_Admin_Dashboard_Stats;
SELECT * FROM dbo.vw_Admin_User_List ORDER BY user_id;
SELECT * FROM dbo.vw_Admin_Recent_Audit_Logs;
GO
