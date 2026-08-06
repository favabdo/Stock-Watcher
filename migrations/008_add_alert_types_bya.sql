-- شغّل السكريبت ده مرة واحدة بعد باقي المايجريشنز (بما فيها 007).
--
-- بيضيف عمودين لجدول العملاء (dbo.StockWatcherUsers_byA) عشان الأدمن يقدر
-- يحدد وهو بيضيف/بيعدل العميل، أي نوع تنبيهات مفعّل ليه:
--   AlertStockEnabled        -> تنبيه حد إعادة الطلب (الميزة القديمة، اللي
--                                كانت شغالة لكل العملاء بشكل ثابت قبل كده)
--   AlertCreditLimitEnabled  -> تنبيه تجاوز الحد الائتماني للعميل (الميزة
--                                الجديدة، مبنية على exec
--                                Stp_sh_Customerbalances_overcreditlimit)
--
-- AlertStockEnabled افتراضيًا 1 (مفعّل) عشان العملاء الموجودين بالفعل
-- يفضلوا شغالين بنفس السلوك القديم من غير أي تغيير. AlertCreditLimitEnabled
-- افتراضيًا 0 (متعطل) لحد ما الأدمن يفعّله يدويًا للعميل من صفحة الإعدادات.

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.StockWatcherUsers_byA') AND name = 'AlertStockEnabled'
)
BEGIN
    ALTER TABLE dbo.StockWatcherUsers_byA
    ADD AlertStockEnabled BIT NOT NULL DEFAULT (1);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.StockWatcherUsers_byA') AND name = 'AlertCreditLimitEnabled'
)
BEGIN
    ALTER TABLE dbo.StockWatcherUsers_byA
    ADD AlertCreditLimitEnabled BIT NOT NULL DEFAULT (0);
END
