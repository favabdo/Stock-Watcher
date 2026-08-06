-- شغّل السكريبت ده مرة واحدة بعد باقي المايجريشنز (بما فيها 008).
--
-- زي بالظبط dbo.StockWatcherOpenAlerts_byA (الخاص بتنبيهات حد إعادة الطلب)
-- بس لتنبيهات تجاوز الحد الائتماني: بيحفظ "الحالات المفتوحة حاليًا" (عميل +
-- فرع تجاوز الحد الائتماني واتبعت عنه تنبيه بالفعل) لكل عميل من عملاء
-- النظام (dbo.StockWatcherUsers_byA). الفحص التلقائي المجدول
-- (scheduledCheckJob) بيستخدم الجدول ده عشان يفرّق بين حالة جديدة لسه ما
-- اتبعتش تنبيه عنها وحالة قديمة اتبعت تنبيهها قبل كده، فيبعت رسالة واتساب
-- فورية بس أول ما شخص/فرع يتجاوز الحد (مش كل مرة يشتغل فيها الفحص المجدول
-- طول ما لسه متجاوز).

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'StockWatcherOpenCreditAlerts_byA'
)
BEGIN
    CREATE TABLE dbo.StockWatcherOpenCreditAlerts_byA (
        ClientId          INT       NOT NULL,
        CustomerId        BIGINT    NOT NULL,
        BranchId          INT       NOT NULL DEFAULT (0),
        FirstNotifiedAt   DATETIME  NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_StockWatcherOpenCreditAlerts_byA PRIMARY KEY (ClientId, CustomerId, BranchId)
    );
END
