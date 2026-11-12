import 'package:flutter_test/flutter_test.dart';
import 'package:stock_watcher/core/models/models.dart';
import 'package:stock_watcher/shared/format.dart';

void main() {
  test('bootstrap payload maps client, settings and kpis', () {
    final data = BootstrapData.fromJson({
      'client': {'id': 7, 'clientName': 'شركة النيل', 'role': 0},
      'settings': {
        'stockLowEnabled': true,
        'stockZeroEnabled': false,
        'reorderSuggestionEnabled': true,
        'creditOverEnabled': true,
        'creditIncreaseEnabled': false,
        'creditIncreaseThreshold': 500,
        'digestEnabled': true,
        'digestFrequency': 'weekly',
        'digestTimeOfDay': '08:30',
        'digestWeekday': 6,
        'timeZone': 'Africa/Cairo',
        'pushEnabled': true,
        'whatsAppEnabled': false,
      },
      'kpi': {
        'lowStockItems': 3,
        'zeroStockItems': 1,
        'overLimitCustomers': 2,
        'unreadNotifications': 5,
      },
    });

    expect(data.client.id, 7);
    expect(data.client.name, 'شركة النيل');
    expect(data.settings.hasAnyStockAlert, isTrue);
    expect(data.settings.hasAnyCreditAlert, isTrue);
    expect(data.settings.digestFrequency, 'weekly');
    expect(data.kpis.lowStockItems, 3);
    expect(data.kpis.unreadNotifications, 5);
  });

  test('report result maps columns, rows and totals', () {
    final result = ReportResult.fromJson({
      'report': {'id': 'low_stock', 'nameAr': 'الأصناف تحت الحد'},
      'generatedAt': '2026-11-08T10:00:00.000Z',
      'params': {'branchId': 2},
      'columns': [
        {
          'key': 'itemCode',
          'labelAr': 'كود الصنف',
          'type': 'string',
          'align': 'start'
        },
        {'key': 'stock', 'labelAr': 'الرصيد', 'type': 'number', 'align': 'end'},
      ],
      'rows': [
        {'itemCode': 'A-1', 'stock': 4},
      ],
      'totals': {'stock': 4},
      'rowCount': 1,
      'truncated': false,
    });

    expect(result.reportId, 'low_stock');
    expect(result.rowCount, 1);
    expect(result.columns.length, 2);
    expect(result.rows.single['itemCode'], 'A-1');
    expect(result.totals!['stock'], 4);
    expect(result.params['branchId'], 2);
  });

  test('item stock maps threshold flags', () {
    final stock = ItemStock.fromJson({
      'item': {'ID': 12, 'Code': 'A-1', 'Name_Ar': 'صنف', 'ReorderQty': 10},
      'stores': [
        {
          'storeid': 1,
          'storename': 'المخزن الرئيسي',
          'transpkgqty1': 4,
          'reorderQty': 10,
          'liveReorderQty': 6,
          'belowThreshold': true,
        },
      ],
      'belowThreshold': [
        {
          'storeid': 1,
          'storename': 'المخزن الرئيسي',
          'transpkgqty1': 4,
          'reorderQty': 10,
          'liveReorderQty': 6,
          'belowThreshold': true,
        },
      ],
    });

    expect(stock.item.id, 12);
    expect(stock.stores.single.belowThreshold, isTrue);
    expect(stock.belowThreshold.length, 1);
  });

  test('numbers and dates render with latin digits', () {
    expect(formatNumber(12345), '12,345');
    expect(formatNumber(4.5), '4.5');
    expect(formatMoney(1234.5), '1,234.50');
    expect(formatDateTime(DateTime(2026, 11, 8, 14, 5)), '2026/11/08 - 14:05');
    expect(weekdayLabel(6), 'السبت');
  });
}
