-- شغّل السكريبت ده مرة واحدة بعد 004_create_admin_users_bya.sql.
-- بيضيف عمود CreatedByAdminId لجدول العملاء (dbo.StockWatcherUsers_byA)، بيربط
-- كل عميل بالأدمن اللي أضافه من جدول dbo.stockwatcheradmin_byA. كده كل أدمن
-- بيبقى معروف مسؤول عن إضافة أنهي يوزر (عميل).
--
-- NULL مسموح بيه عشان العملاء اللي كانوا متضافين قبل الميزة دي (من غير أدمن
-- محدد) - هيفضلوا موجودين من غير ما يتأثروا، بس هيتعرض جنبهم "غير معروف".
-- ON DELETE SET NULL: لو الأدمن اتحذف مستقبلًا، العملاء اللي ضافهم بيفضلوا
-- موجودين وميتحذفوش، بس بيبقوا من غير مسؤول محدد.

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.StockWatcherUsers_byA') AND name = 'CreatedByAdminId'
)
BEGIN
    ALTER TABLE dbo.StockWatcherUsers_byA
    ADD CreatedByAdminId INT NULL;

    ALTER TABLE dbo.StockWatcherUsers_byA
    ADD CONSTRAINT FK_StockWatcherUsers_byA_CreatedByAdmin
    FOREIGN KEY (CreatedByAdminId) REFERENCES dbo.stockwatcheradmin_byA(Id)
    ON DELETE SET NULL;
END
