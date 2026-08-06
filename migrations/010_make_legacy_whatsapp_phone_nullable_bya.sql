-- شغّل السكريبت ده مرة واحدة بعد باقي المايجريشنز (بما فيها 009).
--
-- المشكلة: عمود WhatsappPhone القديم (قبل ما تتضاف ميزة تعدد الأرقام في
-- migration 006/007) لسه NOT NULL في الجدول، رغم إن الكود دلوقتي بيخزن
-- الأرقام في جدول منفصل (dbo.StockWatcherClientPhones_byA) ومبيحطش أي قيمة
-- في العمود القديم ده وقت إضافة عميل جديد. النتيجة: أي INSERT لعميل جديد
-- كان بيفشل بالخطأ:
--   Cannot insert the value NULL into column 'WhatsappPhone' ...
--
-- الحل: نخلي العمود يقبل NULL (من غير ما نحذفه، عشان لو فيه بيانات قديمة
-- فيه أو حاجة لسه بتعتمد عليه تفضل موجودة، بس من غير ما توقف إضافة عميل جديد).

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.StockWatcherUsers_byA') AND name = 'WhatsappPhone'
          AND is_nullable = 0
)
BEGIN
    ALTER TABLE dbo.StockWatcherUsers_byA
    ALTER COLUMN WhatsappPhone NVARCHAR(1000) NULL;
END
