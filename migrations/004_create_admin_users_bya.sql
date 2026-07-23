-- شغّل السكريبت ده مرة واحدة بعد باقي المايجريشنز.
-- الجدول ده بيخزن حسابات الأدمن الحقيقية (يوزر + باسورد) اللي بس بيها يقدر
-- حد يدخل على لوحة تحكم الإعدادات (/admin) - منفصل تمامًا عن تسجيل دخول
-- العملاء (dbo.StockWatcherUsers_byA.LoginUsername/LoginPasswordHash) وعن
-- الـ Basic Auth القديم اللي كان شغال بمتغيرات بيئة ثابتة.
--
-- أول أدمن لازم يتضاف يدويًا مباشرة في الداتا بيز (استخدم:
--   node scripts/hashPassword.js "الباسورد"
-- عشان تولّد الباسورد هاش وتاخد جملة INSERT جاهزة). بعد كده تقدر تضيف
-- أدمنز جداد من جوه لوحة التحكم نفسها (زرار "إضافة أدمن جديد").

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'stockwatcheradmin_byA'
)
BEGIN
    CREATE TABLE dbo.stockwatcheradmin_byA (
        Id            INT IDENTITY(1,1) PRIMARY KEY,
        Username      NVARCHAR(100) NOT NULL,
        PasswordHash  NVARCHAR(255) NOT NULL, -- مشفر بـ bcrypt (utils/password.js) - مش نص صريح أبدًا
        CreatedAt     DATETIME NOT NULL DEFAULT GETDATE()
    );

    CREATE UNIQUE INDEX UX_stockwatcheradmin_byA_Username
    ON dbo.stockwatcheradmin_byA (Username);
END
