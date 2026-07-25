-- شغّل السكريبت ده مرة واحدة بعد باقي المايجريشنز (بما فيها 006).
--
-- الهدف: فصل أرقام واتساب العميل عن جدول dbo.StockWatcherUsers_byA لجدول
-- مستقل dbo.StockWatcherClientPhones_byA مربوط بـ ClientId (FOREIGN KEY مع
-- ON DELETE CASCADE - لو العميل اتمسح، أرقامه بتتمسح معاه أوتوماتيك).
--
-- كده مهما ضفت أرقام كتير لعميل واحد، مفيش أي حد لطول عمود ثابت زي كان بيحصل
-- قبل كده.
--
-- ملحوظة: السكريبت ده بيستخدم بس أوامر SQL أساسية (CREATE TABLE / INDEX)
-- عشان يشتغل على أي نسخة SQL Server (من غير الاعتماد على OPENJSON/
-- STRING_SPLIT اللي محتاجة SQL Server 2016+ وcompatibility level 130+ - لو
-- الداتابيز أقدم من كده، الباتش كله كان بيفشل في الـ compile من غير ما
-- الجدول يتعمل أصلاً). ترحيل الأرقام القديمة من العمود القديم بقى بيحصل من
-- كود Node.js نفسه (migrations/legacyPhonesMigration.js) بدل T-SQL، عشان
-- يشتغل بنفس الطريقة على أي نسخة SQL Server.

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'StockWatcherClientPhones_byA'
)
BEGIN
    CREATE TABLE dbo.StockWatcherClientPhones_byA (
        Id        INT IDENTITY(1,1) NOT NULL,
        ClientId  INT               NOT NULL,
        Phone     NVARCHAR(30)      NOT NULL,
        Enabled   BIT               NOT NULL DEFAULT (1),
        CreatedAt DATETIME          NOT NULL DEFAULT (GETDATE()),
        CONSTRAINT PK_StockWatcherClientPhones_byA PRIMARY KEY (Id),
        CONSTRAINT FK_StockWatcherClientPhones_byA_Client
            FOREIGN KEY (ClientId) REFERENCES dbo.StockWatcherUsers_byA (Id)
            ON DELETE CASCADE
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_StockWatcherClientPhones_byA_ClientId'
          AND object_id = OBJECT_ID('dbo.StockWatcherClientPhones_byA')
)
BEGIN
    CREATE INDEX IX_StockWatcherClientPhones_byA_ClientId
        ON dbo.StockWatcherClientPhones_byA (ClientId);
END

-- بعد ما تتأكد إن الترحيل تم بنجاح (شوف لوج السيرفر وقت ما يبدأ - سطر بيبدأ
-- بـ [LegacyPhonesMigration]) ووازنها ببيانات عمود WhatsappPhone القديم،
-- السيرفر بقى مش بيستخدم العمود ده خالص. تقدر تشيله لو عايز (اختياري - مش
-- لازم تشغّل السطر ده دلوقتي):
--
-- ALTER TABLE dbo.StockWatcherUsers_byA DROP COLUMN WhatsappPhone;
