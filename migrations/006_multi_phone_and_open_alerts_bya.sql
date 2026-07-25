-- شغّل السكريبت ده مرة واحدة بعد باقي المايجريشنز.
--
-- 1) بيوسّع عمود WhatsappPhone (كان NVARCHAR(30) بيسع رقم واحد بس) عشان
--    الأدمن يقدر يسجّل أكتر من رقم واتساب للعميل الواحد، مفصولين بفاصلة
--    (مثال: 201012345678,201098765432). كل الأرقام دي بتاخد نفس رسالة
--    التنبيه وقت ما يحصل نقص في الاستوك.
--
-- 2) بيعمل جدول StockWatcherOpenAlerts_byA بيحفظ فيه "الحالات المفتوحة
--    حاليًا" (صنف + مخزن وصل لحد إعادة الطلب واتبعت عنه تنبيه بالفعل) لكل
--    عميل. الفحص التلقائي المجدول (scheduledCheckJob) بيستخدم الجدول ده
--    عشان يفرّق بين حالة جديدة لسه ما اتبعتش تنبيه عنها وحالة قديمة اتبعت
--    تنبيهها قبل كده، فيبعت رسالة واتساب فورية بس أول ما الصنف يظهر (مش كل
--    مرة يشتغل فيها الفحص المجدول طول ما الصنف لسه تحت الحد).

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.StockWatcherUsers_byA') AND name = 'WhatsappPhone'
          AND max_length > 0 AND max_length < 2000 -- NVARCHAR بيخزن كل حرف بـ 2 بايت، يعني 2000 = 1000 حرف
)
BEGIN
    ALTER TABLE dbo.StockWatcherUsers_byA
    ALTER COLUMN WhatsappPhone NVARCHAR(1000) NOT NULL;
END

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'StockWatcherOpenAlerts_byA'
)
BEGIN
    CREATE TABLE dbo.StockWatcherOpenAlerts_byA (
        ClientId          INT       NOT NULL,
        ItemId            BIGINT    NOT NULL,
        StoreId           INT       NOT NULL,
        FirstNotifiedAt   DATETIME  NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_StockWatcherOpenAlerts_byA PRIMARY KEY (ClientId, ItemId, StoreId)
    );
END
