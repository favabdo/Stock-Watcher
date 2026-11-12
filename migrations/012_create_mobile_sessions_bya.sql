-- جلسات refresh للموبايل. الباسورد/التوكن لا يُخزَّن كنص صريح:
-- RefreshTokenHash = SHA-256 hex للتوكن العشوائي اللي التطبيق بيحتفظ بيه.

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'StockWatcherMobileSessions_byA'
)
BEGIN
    CREATE TABLE dbo.StockWatcherMobileSessions_byA (
        Id               BIGINT IDENTITY(1,1) NOT NULL,
        ClientId         INT               NOT NULL,
        DeviceId         NVARCHAR(128)     NOT NULL,
        RefreshTokenHash CHAR(64)          NOT NULL,
        IssuedAt         DATETIME          NOT NULL DEFAULT (GETDATE()),
        ExpiresAt        DATETIME          NOT NULL,
        RevokedAt        DATETIME          NULL,
        LastUsedAt       DATETIME          NULL,
        CONSTRAINT PK_StockWatcherMobileSessions_byA PRIMARY KEY (Id),
        CONSTRAINT FK_StockWatcherMobileSessions_byA_Client
            FOREIGN KEY (ClientId) REFERENCES dbo.StockWatcherUsers_byA (Id)
            ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX UX_StockWatcherMobileSessions_byA_TokenHash
        ON dbo.StockWatcherMobileSessions_byA (RefreshTokenHash);

    CREATE INDEX IX_StockWatcherMobileSessions_byA_Client_Device
        ON dbo.StockWatcherMobileSessions_byA (ClientId, DeviceId);
END
