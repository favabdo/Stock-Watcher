-- شغّل السكريبت ده مرة واحدة بعد باقي المايجريشنز (بما فيها 006).
--
-- الهدف: فصل أرقام واتساب العميل عن جدول dbo.StockWatcherUsers_byA لجدول
-- مستقل dbo.StockWatcherClientPhones_byA مربوط بـ ClientId (FOREIGN KEY مع
-- ON DELETE CASCADE - لو العميل اتمسح، أرقامه بتتمسح معاه أوتوماتيك).
--
-- كده مهما ضفت أرقام كتير لعميل واحد، مفيش أي حد لطول عمود ثابت زي كان بيحصل
-- قبل كده (العمود القديم WhatsappPhone كان NVARCHAR فبيحصل خطأ SQL Server لو
-- الطول زاد عن المتاح). كل رقم دلوقتي صف مستقل، تقدر تضيف قد ما تحب.

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

    CREATE INDEX IX_StockWatcherClientPhones_byA_ClientId
        ON dbo.StockWatcherClientPhones_byA (ClientId);
END

-- ترحيل الأرقام القديمة المخزنة في عمود WhatsappPhone (سواء بصيغة JSON
-- الجديدة [{"phone":"...","enabled":true}] أو الصيغة الأقدم نص واحد/أرقام
-- مفصولة بفاصلة) للجدول الجديد - مرة واحدة بس، وبيتجاهل أي عميل اترحّل
-- أرقامه بالفعل (عشان تقدر تشغل السكريبت أكتر من مرة بأمان).
IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.StockWatcherUsers_byA') AND name = 'WhatsappPhone'
)
BEGIN
    -- الحالة الأولى: القيمة JSON صحيحة (الصيغة الجديدة اللي فيها enabled)
    INSERT INTO dbo.StockWatcherClientPhones_byA (ClientId, Phone, Enabled)
    SELECT u.Id, LTRIM(RTRIM(j.phone)), ISNULL(j.enabled, 1)
    FROM dbo.StockWatcherUsers_byA u
    CROSS APPLY OPENJSON(u.WhatsappPhone)
        WITH (phone NVARCHAR(30) '$.phone', enabled BIT '$.enabled') AS j
    WHERE ISJSON(u.WhatsappPhone) = 1
      AND LTRIM(RTRIM(ISNULL(j.phone, ''))) <> ''
      AND NOT EXISTS (
          SELECT 1 FROM dbo.StockWatcherClientPhones_byA p WHERE p.ClientId = u.Id
      );

    -- الحالة التانية: القيمة مش JSON - نص واحد أو أرقام مفصولة بفاصلة/فاصلة
    -- منقوطة/سطر جديد (الصيغة الأقدم قبل ميزة التعطيل)
    INSERT INTO dbo.StockWatcherClientPhones_byA (ClientId, Phone, Enabled)
    SELECT u.Id, LTRIM(RTRIM(s.value)), 1
    FROM dbo.StockWatcherUsers_byA u
    CROSS APPLY STRING_SPLIT(REPLACE(REPLACE(u.WhatsappPhone, ';', ','), CHAR(10), ','), ',') AS s
    WHERE ISJSON(u.WhatsappPhone) = 0
      AND LTRIM(RTRIM(s.value)) <> ''
      AND NOT EXISTS (
          SELECT 1 FROM dbo.StockWatcherClientPhones_byA p WHERE p.ClientId = u.Id
      );
END

-- بعد ما تتأكد إن الترحيل تم بنجاح (راجع بيانات الجدول الجديد ووازنها بعمود
-- WhatsappPhone القديم)، السيرفر بقى مش بيستخدم العمود ده خالص. تقدر تشيله
-- لو عايز (اختياري - مش لازم تشغّل السطر ده دلوقتي):
--
-- ALTER TABLE dbo.StockWatcherUsers_byA DROP COLUMN WhatsappPhone;
