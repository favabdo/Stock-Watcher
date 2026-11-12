-- سجل تشغيل التقارير (من استخدم أي تقرير وبأي معاملات وكم استغرق).
-- لا يحتوي على نتائج التقارير نفسها، فقط أثر تدقيقي خفيف.

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'StockWatcherReportRuns_byA'
)
BEGIN
    CREATE TABLE dbo.StockWatcherReportRuns_byA (
        Id          BIGINT IDENTITY(1,1) NOT NULL,
        ClientId    INT               NOT NULL,
        ReportId    NVARCHAR(80)      NOT NULL,
        ParamsJson  NVARCHAR(MAX)     NULL,
        Format      NVARCHAR(8)       NOT NULL,   -- json|xlsx
        RowCount    INT               NULL,
        DurationMs  INT               NULL,
        Status      NVARCHAR(12)      NOT NULL,   -- ok|error|timeout
        ErrorCode   NVARCHAR(80)      NULL,
        CreatedAt   DATETIME          NOT NULL DEFAULT (GETDATE()),
        CONSTRAINT PK_StockWatcherReportRuns_byA PRIMARY KEY (Id),
        CONSTRAINT FK_StockWatcherReportRuns_byA_Client
            FOREIGN KEY (ClientId) REFERENCES dbo.StockWatcherUsers_byA (Id)
            ON DELETE CASCADE
    );

    CREATE INDEX IX_StockWatcherReportRuns_byA_Client_Created
        ON dbo.StockWatcherReportRuns_byA (ClientId, CreatedAt DESC);
END
