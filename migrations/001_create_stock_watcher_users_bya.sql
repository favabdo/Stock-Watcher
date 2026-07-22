-- شغّل السكريبت ده مرة واحدة على نفس قاعدة البيانات الحالية بتاعة المشروع.
-- الجدول ده بيخزن بيانات كل عميل (Client) بتاع نظام Stock Watcher:
--   - بيانات الاتصال بقاعدة بيانات العميل (السيرفر/الاسم/اليوزر/الباسورد)
--   - رقم الواتساب اللي هيتبعتله تنبيهات نقص الاستوك بتاعة العميل ده

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'StockWatcherUsers_byA'
)
BEGIN
    CREATE TABLE dbo.StockWatcherUsers_byA (
        Id                          INT IDENTITY(1,1) PRIMARY KEY,
        ClientName                  NVARCHAR(200)  NOT NULL,
        DbServer                    NVARCHAR(200)  NOT NULL,
        DbName                      NVARCHAR(200)  NOT NULL,
        DbUser                      NVARCHAR(200)  NOT NULL,
        DbPasswordEncrypted         NVARCHAR(500)  NOT NULL,  -- مشفرة بـ AES-256-GCM (utils/crypto.js) - مش نص صريح
        DbPort                      INT            NOT NULL DEFAULT 1433,
        DbEncrypt                   BIT            NOT NULL DEFAULT 0,
        DbTrustServerCertificate    BIT            NOT NULL DEFAULT 1,
        WhatsappPhone               NVARCHAR(30)   NOT NULL,  -- بصيغة دولية من غير + مثلاً 201012345678
        IsActive                    BIT            NOT NULL DEFAULT 1,
        CreatedAt                   DATETIME       NOT NULL DEFAULT GETDATE(),
        UpdatedAt                   DATETIME       NOT NULL DEFAULT GETDATE()
    );
END
