-- إعدادات التنبيهات القابلة للتوسع (بدل أعمدة Boolean جديدة في جدول العملاء
-- مع كل نوع تنبيه). الأعمدة القديمة AlertStockEnabled/AlertCreditLimitEnabled
-- تفضل موجودة ومتزامنة عشان الويب الحالي يظل شغال زي ما هو.

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'StockWatcherAlertSettings_byA'
)
BEGIN
    CREATE TABLE dbo.StockWatcherAlertSettings_byA (
        ClientId                  INT             NOT NULL,
        StockLowEnabled           BIT             NOT NULL DEFAULT (1),
        StockZeroEnabled          BIT             NOT NULL DEFAULT (0),
        ReorderSuggestionEnabled  BIT             NOT NULL DEFAULT (0),
        CreditOverEnabled         BIT             NOT NULL DEFAULT (0),
        CreditIncreaseEnabled     BIT             NOT NULL DEFAULT (0),
        CreditIncreaseThreshold   DECIMAL(18,2)   NOT NULL DEFAULT (0),
        DigestEnabled             BIT             NOT NULL DEFAULT (0),
        DigestFrequency           NVARCHAR(10)    NOT NULL DEFAULT ('daily'), -- daily|weekly
        DigestTimeOfDay           CHAR(5)         NOT NULL DEFAULT ('08:00'),
        DigestWeekday             TINYINT         NOT NULL DEFAULT (6),       -- 0=Sun..6=Sat
        TimeZone                  NVARCHAR(64)    NOT NULL DEFAULT ('Africa/Cairo'),
        PushEnabled               BIT             NOT NULL DEFAULT (1),
        WhatsAppEnabled           BIT             NOT NULL DEFAULT (1),
        LastDigestSentAt          DATETIME        NULL,
        UpdatedAt                 DATETIME        NOT NULL DEFAULT (GETDATE()),
        CONSTRAINT PK_StockWatcherAlertSettings_byA PRIMARY KEY (ClientId),
        CONSTRAINT FK_StockWatcherAlertSettings_byA_Client
            FOREIGN KEY (ClientId) REFERENCES dbo.StockWatcherUsers_byA (Id)
            ON DELETE CASCADE
    );
END

-- Backfill idempotent من الأعمدة القديمة.
INSERT INTO dbo.StockWatcherAlertSettings_byA (ClientId, StockLowEnabled, CreditOverEnabled)
SELECT c.Id, c.AlertStockEnabled, c.AlertCreditLimitEnabled
FROM dbo.StockWatcherUsers_byA c
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.StockWatcherAlertSettings_byA s WHERE s.ClientId = c.Id
);
