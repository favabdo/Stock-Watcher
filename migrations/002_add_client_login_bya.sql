-- شغّل السكريبت ده مرة واحدة بعد 001_create_stock_watcher_users_bya.sql.
-- بيضيف بيانات "تسجيل دخول العميل" (يوزر + باسورد) على جدول العملاء، عشان كل
-- عميل يدخل بيها على صفحة الموقع الرئيسية ويشوف بياناته هو بس (مش كل العملاء).
-- ده مختلف تمامًا عن بيانات الاتصال بقاعدة بيانات العميل (DbServer/DbUser/DbPassword)
-- اللي هي بتاعة السيرفر بتوصل بيها لقاعدة بيانات العميل، مش بتاعة تسجيل دخول العميل نفسه.

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.StockWatcherUsers_byA') AND name = 'LoginUsername'
)
BEGIN
    ALTER TABLE dbo.StockWatcherUsers_byA ADD LoginUsername NVARCHAR(100) NULL;
END

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.StockWatcherUsers_byA') AND name = 'LoginPasswordHash'
)
BEGIN
    -- مشفر بـ bcrypt (utils/password.js) - مش نص صريح أبدًا
    ALTER TABLE dbo.StockWatcherUsers_byA ADD LoginPasswordHash NVARCHAR(255) NULL;
END

-- يوزر تسجيل الدخول لازم يكون فريد بين العملاء (بيسمح بأكتر من عميل من غير يوزر لسه،
-- عشان العملاء القدام اللي هيتحدثوا لاحقًا من الإعدادات من غير ما نكسر البيانات الحالية)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UX_StockWatcherUsers_byA_LoginUsername' AND object_id = OBJECT_ID('dbo.StockWatcherUsers_byA')
)
BEGIN
    CREATE UNIQUE INDEX UX_StockWatcherUsers_byA_LoginUsername
    ON dbo.StockWatcherUsers_byA (LoginUsername)
    WHERE LoginUsername IS NOT NULL;
END
