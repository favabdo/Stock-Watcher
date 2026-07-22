-- شغّل السكريبت ده مرة واحدة بعد 002_add_client_login_bya.sql.
-- بيضيف عمود Role لجدول العملاء، بيتحكم في هل العميل ده (وقت ما يسجل دخول)
-- شايف تاب "الإعدادات" (إدارة كل العملاء) في الفرونت إند ولا لأ:
--   Role = 0  -> شايف "الرئيسية" و"الإعدادات" مع بعض
--   Role = 1  -> شايف "الرئيسية" بس
-- ملحوظة: ده تحكم في عرض التاب في الواجهة بس، مش بديل عن حماية الـ Basic Auth
-- الحالية على /api/clients (middleware/basicAuth.js) واللي هتفضل شغالة زي ما هي.

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.StockWatcherUsers_byA') AND name = 'Role'
)
BEGIN
    -- الجدول بيتعدل مرة واحدة بس (أول مرة يتشغل فيها المايجريشن ده). بعد كده
    -- العمود بيبقى موجود، فالشيك فوق هيمنع أي تعديل تاني في أي ديبلوي لاحق.
    ALTER TABLE dbo.StockWatcherUsers_byA
    ADD Role TINYINT NOT NULL DEFAULT 0; -- 0 = رئيسية + إعدادات، 1 = رئيسية بس
END
