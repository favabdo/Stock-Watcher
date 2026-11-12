-- آخر مبلغ تجاوز اتبعت عنه تنبيه للعميل/الفرع. بيُستخدم لتنبيه
-- "تزايد تجاوز الائتمان" ولضمان إن الإرسال الفاشل لا يمنع تنبيهًا لاحقًا
-- (بنحدّثه فقط بعد نجاح الإرسال).

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.StockWatcherOpenCreditAlerts_byA')
      AND name = 'LastNotifiedOverAmount'
)
BEGIN
    ALTER TABLE dbo.StockWatcherOpenCreditAlerts_byA
    ADD LastNotifiedOverAmount DECIMAL(18,2) NULL;
END
