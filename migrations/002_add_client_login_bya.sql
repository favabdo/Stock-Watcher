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
    -- بيضيف العمودين مع بعض في نفس الـ ALTER، فالجدول بيتعدل مرة واحدة بس
    -- (أول مرة يتشغل فيها المايجريشن). بعد كده العمود بيبقى موجود، فالشيك
    -- فوق هيمنع أي تعديل تاني على الجدول في أي تشغيل لاحق/ديبلوي جديد.
    ALTER TABLE dbo.StockWatcherUsers_byA
    ADD LoginUsername NVARCHAR(100) NULL,
        LoginPasswordHash NVARCHAR(255) NULL; -- مشفر بـ bcrypt (utils/password.js) - مش نص صريح أبدًا
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
