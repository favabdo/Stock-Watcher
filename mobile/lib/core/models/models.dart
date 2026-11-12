int _int(dynamic value) =>
    value is num ? value.toInt() : int.tryParse('$value') ?? 0;
double _double(dynamic value) =>
    value is num ? value.toDouble() : double.tryParse('$value') ?? 0;
String _string(dynamic value) => value == null ? '' : '$value';
bool _bool(dynamic value) =>
    value == true || value == 1 || value == 'true' || value == '1';

class ClientInfo {
  const ClientInfo({required this.id, required this.name, required this.role});

  final int id;
  final String name;
  final int role;

  factory ClientInfo.fromJson(Map<String, dynamic> json) => ClientInfo(
        id: _int(json['id']),
        name: _string(json['clientName']),
        role: _int(json['role']),
      );
}

class AlertSettings {
  const AlertSettings({
    required this.stockLowEnabled,
    required this.stockZeroEnabled,
    required this.reorderSuggestionEnabled,
    required this.creditOverEnabled,
    required this.creditIncreaseEnabled,
    required this.creditIncreaseThreshold,
    required this.digestEnabled,
    required this.digestFrequency,
    required this.digestTimeOfDay,
    required this.digestWeekday,
    required this.timeZone,
    required this.pushEnabled,
    required this.whatsAppEnabled,
  });

  final bool stockLowEnabled;
  final bool stockZeroEnabled;
  final bool reorderSuggestionEnabled;
  final bool creditOverEnabled;
  final bool creditIncreaseEnabled;
  final double creditIncreaseThreshold;
  final bool digestEnabled;
  final String digestFrequency;
  final String digestTimeOfDay;
  final int digestWeekday;
  final String timeZone;
  final bool pushEnabled;
  final bool whatsAppEnabled;

  bool get hasAnyStockAlert => stockLowEnabled || stockZeroEnabled;
  bool get hasAnyCreditAlert => creditOverEnabled || creditIncreaseEnabled;

  factory AlertSettings.fromJson(Map<String, dynamic> json) => AlertSettings(
        stockLowEnabled: _bool(json['stockLowEnabled']),
        stockZeroEnabled: _bool(json['stockZeroEnabled']),
        reorderSuggestionEnabled: _bool(json['reorderSuggestionEnabled']),
        creditOverEnabled: _bool(json['creditOverEnabled']),
        creditIncreaseEnabled: _bool(json['creditIncreaseEnabled']),
        creditIncreaseThreshold: _double(json['creditIncreaseThreshold']),
        digestEnabled: _bool(json['digestEnabled']),
        digestFrequency: _string(json['digestFrequency']).isEmpty
            ? 'daily'
            : _string(json['digestFrequency']),
        digestTimeOfDay: _string(json['digestTimeOfDay']).isEmpty
            ? '08:00'
            : _string(json['digestTimeOfDay']),
        digestWeekday: _int(json['digestWeekday']),
        timeZone: _string(json['timeZone']).isEmpty
            ? 'Africa/Cairo'
            : _string(json['timeZone']),
        pushEnabled: _bool(json['pushEnabled']),
        whatsAppEnabled: _bool(json['whatsAppEnabled']),
      );
}

class Kpis {
  const Kpis({
    required this.lowStockItems,
    required this.zeroStockItems,
    required this.overLimitCustomers,
    required this.unreadNotifications,
  });

  final int lowStockItems;
  final int zeroStockItems;
  final int overLimitCustomers;
  final int unreadNotifications;

  factory Kpis.fromJson(Map<String, dynamic> json) => Kpis(
        lowStockItems: _int(json['lowStockItems']),
        zeroStockItems: _int(json['zeroStockItems']),
        overLimitCustomers: _int(json['overLimitCustomers']),
        unreadNotifications: _int(json['unreadNotifications']),
      );

  Kpis copyWith({
    int? lowStockItems,
    int? zeroStockItems,
    int? overLimitCustomers,
    int? unreadNotifications,
  }) =>
      Kpis(
        lowStockItems: lowStockItems ?? this.lowStockItems,
        zeroStockItems: zeroStockItems ?? this.zeroStockItems,
        overLimitCustomers: overLimitCustomers ?? this.overLimitCustomers,
        unreadNotifications: unreadNotifications ?? this.unreadNotifications,
      );
}

class BootstrapData {
  const BootstrapData({
    required this.client,
    required this.settings,
    required this.kpis,
  });

  final ClientInfo client;
  final AlertSettings settings;
  final Kpis kpis;

  factory BootstrapData.fromJson(Map<String, dynamic> json) => BootstrapData(
        client: ClientInfo.fromJson(
          (json['client'] as Map?)?.cast<String, dynamic>() ?? {},
        ),
        settings: AlertSettings.fromJson(
          (json['settings'] as Map?)?.cast<String, dynamic>() ?? {},
        ),
        kpis:
            Kpis.fromJson((json['kpi'] as Map?)?.cast<String, dynamic>() ?? {}),
      );

  BootstrapData copyWith({
    ClientInfo? client,
    AlertSettings? settings,
    Kpis? kpis,
  }) =>
      BootstrapData(
        client: client ?? this.client,
        settings: settings ?? this.settings,
        kpis: kpis ?? this.kpis,
      );
}

class ItemSummary {
  const ItemSummary({
    required this.id,
    required this.code,
    required this.nameAr,
    required this.nameEn,
    required this.reorderQty,
  });

  final int id;
  final String code;
  final String nameAr;
  final String nameEn;
  final double reorderQty;

  String get displayName =>
      nameAr.isNotEmpty ? nameAr : (nameEn.isNotEmpty ? nameEn : code);

  factory ItemSummary.fromJson(Map<String, dynamic> json) => ItemSummary(
        id: _int(json['ID'] ?? json['id']),
        code: _string(json['Code'] ?? json['code']),
        nameAr: _string(json['Name_Ar'] ?? json['nameAr']),
        nameEn: _string(json['Name_En'] ?? json['nameEn']),
        reorderQty: _double(json['ReorderQty'] ?? json['reorderQty']),
      );

  ItemSummary copyWith({double? reorderQty}) => ItemSummary(
        id: id,
        code: code,
        nameAr: nameAr,
        nameEn: nameEn,
        reorderQty: reorderQty ?? this.reorderQty,
      );
}

class LowStockBranch {
  const LowStockBranch({
    required this.storeId,
    required this.storeName,
    required this.stock,
  });

  final int storeId;
  final String storeName;
  final double stock;

  factory LowStockBranch.fromJson(Map<String, dynamic> json) => LowStockBranch(
        storeId: _int(json['storeid']),
        storeName: _string(json['storename']),
        stock: _double(json['stock']),
      );
}

class LowStockGroup {
  const LowStockGroup({required this.item, required this.branches});

  final ItemSummary item;
  final List<LowStockBranch> branches;

  factory LowStockGroup.fromJson(Map<String, dynamic> json) => LowStockGroup(
        item: ItemSummary.fromJson(
          (json['item'] as Map?)?.cast<String, dynamic>() ?? {},
        ),
        branches: ((json['branches'] as List?) ?? [])
            .map((e) =>
                LowStockBranch.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
      );
}

class StoreStock {
  const StoreStock({
    required this.storeId,
    required this.storeName,
    required this.stock,
    required this.reorderQty,
    required this.liveReorderQty,
    required this.belowThreshold,
  });

  final int storeId;
  final String storeName;
  final double stock;
  final double reorderQty;
  final double liveReorderQty;
  final bool belowThreshold;

  factory StoreStock.fromJson(Map<String, dynamic> json) => StoreStock(
        storeId: _int(json['storeid']),
        storeName: _string(json['storename']),
        stock: _double(json['transpkgqty1']),
        reorderQty: _double(json['reorderQty']),
        liveReorderQty: _double(json['liveReorderQty']),
        belowThreshold: _bool(json['belowThreshold']),
      );
}

class ItemStock {
  const ItemStock({
    required this.item,
    required this.stores,
    required this.belowThreshold,
  });

  final ItemSummary item;
  final List<StoreStock> stores;
  final List<StoreStock> belowThreshold;

  factory ItemStock.fromJson(Map<String, dynamic> json) => ItemStock(
        item: ItemSummary.fromJson(
          (json['item'] as Map?)?.cast<String, dynamic>() ?? {},
        ),
        stores: ((json['stores'] as List?) ?? [])
            .map((e) => StoreStock.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
        belowThreshold: ((json['belowThreshold'] as List?) ?? [])
            .map((e) => StoreStock.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
      );
}

class CreditBranch {
  const CreditBranch({
    required this.branchId,
    required this.branchName,
    required this.balance,
    required this.creditLimit,
    required this.overAmount,
    required this.lastPaidAmount,
    required this.lastPaidDate,
  });

  final int branchId;
  final String branchName;
  final double balance;
  final double creditLimit;
  final double overAmount;
  final double? lastPaidAmount;
  final String? lastPaidDate;

  factory CreditBranch.fromJson(Map<String, dynamic> json) => CreditBranch(
        branchId: _int(json['branchId']),
        branchName: _string(json['branchName']),
        balance: _double(json['balance']),
        creditLimit: _double(json['creditLimit']),
        overAmount: _double(json['overAmount']),
        lastPaidAmount: json['lastPaidAmount'] == null
            ? null
            : _double(json['lastPaidAmount']),
        lastPaidDate:
            json['lastPaidDate'] == null ? null : _string(json['lastPaidDate']),
      );
}

class CreditCustomer {
  const CreditCustomer({
    required this.id,
    required this.code,
    required this.name,
    required this.branches,
  });

  final int id;
  final String code;
  final String name;
  final List<CreditBranch> branches;

  factory CreditCustomer.fromJson(Map<String, dynamic> json) {
    final customer = (json['customer'] as Map?)?.cast<String, dynamic>() ?? {};
    return CreditCustomer(
      id: _int(customer['id']),
      code: _string(customer['code']),
      name: _string(customer['name']),
      branches: ((json['branches'] as List?) ?? [])
          .map((e) => CreditBranch.fromJson((e as Map).cast<String, dynamic>()))
          .toList(),
    );
  }
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.severity,
    required this.title,
    required this.body,
    required this.read,
    required this.occurredAt,
    required this.payload,
  });

  final int id;
  final String type;
  final int severity;
  final String title;
  final String body;
  final bool read;
  final DateTime? occurredAt;
  final Map<String, dynamic> payload;

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      AppNotification(
        id: _int(json['id']),
        type: _string(json['type']),
        severity: _int(json['severity']),
        title: _string(json['titleAr']),
        body: _string(json['bodyAr']),
        read: _bool(json['read']),
        occurredAt: DateTime.tryParse(_string(json['occurredAt'])),
        payload: (json['payload'] as Map?)?.cast<String, dynamic>() ?? const {},
      );

  AppNotification copyWith({bool? read}) => AppNotification(
        id: id,
        type: type,
        severity: severity,
        title: title,
        body: body,
        read: read ?? this.read,
        occurredAt: occurredAt,
        payload: payload,
      );
}

class NotificationPage {
  const NotificationPage({
    required this.items,
    required this.nextCursor,
    required this.unreadCount,
  });

  final List<AppNotification> items;
  final int? nextCursor;
  final int unreadCount;

  factory NotificationPage.fromJson(Map<String, dynamic> json) =>
      NotificationPage(
        items: ((json['items'] as List?) ?? [])
            .map(
              (e) =>
                  AppNotification.fromJson((e as Map).cast<String, dynamic>()),
            )
            .toList(),
        nextCursor:
            json['nextCursor'] == null ? null : _int(json['nextCursor']),
        unreadCount: _int(json['unreadCount']),
      );
}

class ReportParam {
  const ReportParam({
    required this.key,
    required this.label,
    required this.type,
    required this.required,
    required this.widget,
    required this.placeholder,
  });

  final String key;
  final String label;
  final String type;
  final bool required;
  final String widget;
  final String placeholder;

  factory ReportParam.fromJson(Map<String, dynamic> json) => ReportParam(
        key: _string(json['key']),
        label: _string(json['labelAr']),
        type: _string(json['type']),
        required: _bool(json['required']),
        widget:
            _string(json['widget']).isEmpty ? 'text' : _string(json['widget']),
        placeholder: _string(json['placeholder']),
      );
}

class ReportColumn {
  const ReportColumn({
    required this.key,
    required this.label,
    required this.type,
    required this.align,
  });

  final String key;
  final String label;
  final String type;
  final String align;

  factory ReportColumn.fromJson(Map<String, dynamic> json) => ReportColumn(
        key: _string(json['key']),
        label: _string(json['labelAr']),
        type: _string(json['type']),
        align: _string(json['align']),
      );
}

class ReportDefinition {
  const ReportDefinition({
    required this.id,
    required this.name,
    required this.group,
    required this.description,
    required this.params,
    required this.columns,
    required this.supportsTotals,
  });

  final String id;
  final String name;
  final String group;
  final String description;
  final List<ReportParam> params;
  final List<ReportColumn> columns;
  final bool supportsTotals;

  factory ReportDefinition.fromJson(
    Map<String, dynamic> json,
  ) =>
      ReportDefinition(
        id: _string(json['id']),
        name: _string(json['nameAr']),
        group: _string(json['groupAr']),
        description: _string(json['descriptionAr']),
        params: ((json['params'] as List?) ?? [])
            .map(
                (e) => ReportParam.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
        columns: ((json['columns'] as List?) ?? [])
            .map((e) =>
                ReportColumn.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
        supportsTotals: _bool(json['supportsTotals']),
      );
}

class ReportResult {
  const ReportResult({
    required this.reportId,
    required this.reportName,
    required this.columns,
    required this.rows,
    required this.totals,
    required this.rowCount,
    required this.truncated,
    required this.generatedAt,
    required this.params,
  });

  final String reportId;
  final String reportName;
  final List<ReportColumn> columns;
  final List<Map<String, dynamic>> rows;
  final Map<String, dynamic>? totals;
  final int rowCount;
  final bool truncated;
  final DateTime? generatedAt;
  final Map<String, dynamic> params;

  factory ReportResult.fromJson(Map<String, dynamic> json) {
    final report = (json['report'] as Map?)?.cast<String, dynamic>() ?? {};
    return ReportResult(
      reportId: _string(report['id']),
      reportName: _string(report['nameAr']),
      columns: ((json['columns'] as List?) ?? [])
          .map((e) => ReportColumn.fromJson((e as Map).cast<String, dynamic>()))
          .toList(),
      rows: ((json['rows'] as List?) ?? [])
          .map((e) => (e as Map).cast<String, dynamic>())
          .toList(),
      totals: (json['totals'] as Map?)?.cast<String, dynamic>(),
      rowCount: _int(json['rowCount']),
      truncated: _bool(json['truncated']),
      generatedAt: DateTime.tryParse(_string(json['generatedAt'])),
      params: (json['params'] as Map?)?.cast<String, dynamic>() ?? const {},
    );
  }
}
