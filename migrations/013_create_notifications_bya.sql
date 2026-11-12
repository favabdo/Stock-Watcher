-- سجل الإشعارات (مركز الإشعارات داخل التطبيق) + صفوف تسليم مستقلة.
-- الفرق عن StockWatcherOpenAlerts_byA: ده تاريخ كامل لا يُحذف عند حل الحالة،
-- وكل صف تسليم له محاولات/حالة حتى نقدر نعيد المحاولة لو Push/WhatsApp فشل.

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'StockWatcherNotifications_byA'
)
BEGIN
    CREATE TABLE dbo.StockWatcherNotifications_byA (
        Id           BIGINT IDENTITY(1,1) NOT NULL,
        ClientId     INT               NOT NULL,
        Type         NVARCHAR(40)      NOT NULL,   -- stock_low|stock_zero|credit_over|credit_increase|reorder_suggestion|digest
        Severity     TINYINT           NOT NULL DEFAULT (2), -- 1 info | 2 warning | 3 critical
        EntityType   NVARCHAR(20)      NULL,       -- item|customer|digest
        EntityId     BIGINT            NULL,
        EntityKey    NVARCHAR(120)     NULL,       -- item:123:store:7 | credit:456:0
        TitleAr      NVARCHAR(300)     NOT NULL,
        BodyAr       NVARCHAR(1000)    NOT NULL,
        PayloadJson  NVARCHAR(MAX)     NULL,
        DedupeKey    NVARCHAR(200)     NULL,
        ReadAt       DATETIME          NULL,
        OccurredAt   DATETIME          NOT NULL DEFAULT (GETDATE()),
        CreatedAt    DATETIME          NOT NULL DEFAULT (GETDATE()),
        CONSTRAINT PK_StockWatcherNotifications_byA PRIMARY KEY (Id),
        CONSTRAINT FK_StockWatcherNotifications_byA_Client
            FOREIGN KEY (ClientId) REFERENCES dbo.StockWatcherUsers_byA (Id)
            ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX UX_StockWatcherNotifications_byA_Dedupe
        ON dbo.StockWatcherNotifications_byA (ClientId, DedupeKey)
        WHERE DedupeKey IS NOT NULL;

    CREATE INDEX IX_StockWatcherNotifications_byA_Client_Id
        ON dbo.StockWatcherNotifications_byA (ClientId, Id DESC);

    CREATE INDEX IX_StockWatcherNotifications_byA_Unread
        ON dbo.StockWatcherNotifications_byA (ClientId)
        WHERE ReadAt IS NULL;
END

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'StockWatcherNotificationDeliveries_byA'
)
BEGIN
    CREATE TABLE dbo.StockWatcherNotificationDeliveries_byA (
        Id             BIGINT IDENTITY(1,1) NOT NULL,
        NotificationId BIGINT          NOT NULL,
        Channel        NVARCHAR(12)    NOT NULL,   -- push | whatsapp
        Target         NVARCHAR(512)   NULL,       -- FCM token أو رقم واتساب
        DeviceId       NVARCHAR(128)   NULL,
        Status         NVARCHAR(12)    NOT NULL DEFAULT ('pending'), -- pending|sending|sent|failed|skipped
        Attempts       INT             NOT NULL DEFAULT (0),
        LastError      NVARCHAR(500)   NULL,
        NextAttemptAt  DATETIME        NULL,
        SentAt         DATETIME        NULL,
        CreatedAt      DATETIME        NOT NULL DEFAULT (GETDATE()),
        CONSTRAINT PK_StockWatcherNotificationDeliveries_byA PRIMARY KEY (Id),
        CONSTRAINT FK_StockWatcherNotificationDeliveries_byA_Notification
            FOREIGN KEY (NotificationId) REFERENCES dbo.StockWatcherNotifications_byA (Id)
            ON DELETE CASCADE
    );

    CREATE INDEX IX_StockWatcherNotificationDeliveries_byA_Queue
        ON dbo.StockWatcherNotificationDeliveries_byA (Status, NextAttemptAt, Id);

    CREATE INDEX IX_StockWatcherNotificationDeliveries_byA_Notification
        ON dbo.StockWatcherNotificationDeliveries_byA (NotificationId);
END
