-- أجهزة الموبايل المسجلة لكل عميل (FCM push tokens).
-- DeviceId ثابت من التطبيق (installation id) وليس الـ push token نفسه،
-- لأن الـ token بيتغير من وقت للتاني بينما الجهاز واحد.

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'StockWatcherMobileDevices_byA'
)
BEGIN
    CREATE TABLE dbo.StockWatcherMobileDevices_byA (
        Id          INT IDENTITY(1,1) NOT NULL,
        ClientId    INT               NOT NULL,
        DeviceId    NVARCHAR(128)     NOT NULL,
        Platform    NVARCHAR(16)      NOT NULL,          -- android | ios
        PushToken   NVARCHAR(512)     NULL,
        AppVersion  NVARCHAR(32)      NULL,
        OsVersion   NVARCHAR(32)      NULL,
        Locale      NVARCHAR(16)      NULL,
        Enabled     BIT               NOT NULL DEFAULT (1),
        CreatedAt   DATETIME          NOT NULL DEFAULT (GETDATE()),
        UpdatedAt   DATETIME          NOT NULL DEFAULT (GETDATE()),
        LastSeenAt  DATETIME          NULL,
        CONSTRAINT PK_StockWatcherMobileDevices_byA PRIMARY KEY (Id),
        CONSTRAINT UQ_StockWatcherMobileDevices_byA_Client_Device UNIQUE (ClientId, DeviceId),
        CONSTRAINT FK_StockWatcherMobileDevices_byA_Client
            FOREIGN KEY (ClientId) REFERENCES dbo.StockWatcherUsers_byA (Id)
            ON DELETE CASCADE
    );

    CREATE INDEX IX_StockWatcherMobileDevices_byA_PushToken
        ON dbo.StockWatcherMobileDevices_byA (PushToken);
END
