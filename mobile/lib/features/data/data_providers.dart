import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/models.dart';
import '../auth/auth_controller.dart';

final lowStockProvider = FutureProvider.autoDispose<List<LowStockGroup>>((
  ref,
) async {
  final api = ref.read(apiClientProvider);
  final rows = await api.getList('/api/items/low-stock');
  return rows
      .map(
        (row) => LowStockGroup.fromJson((row as Map).cast<String, dynamic>()),
      )
      .toList();
});

final creditLimitProvider = FutureProvider.autoDispose<List<CreditCustomer>>((
  ref,
) async {
  final api = ref.read(apiClientProvider);
  final rows = await api.getList('/api/credit-limit/over-limit');
  return rows
      .map(
        (row) => CreditCustomer.fromJson((row as Map).cast<String, dynamic>()),
      )
      .toList();
});

final notificationsProvider = FutureProvider.autoDispose
    .family<NotificationPage, String?>((ref, type) async {
  final api = ref.read(apiClientProvider);
  final json = await api.get(
    '/api/mobile/v1/notifications',
    query: {'limit': 50, if (type != null && type.isNotEmpty) 'type': type},
  );
  return NotificationPage.fromJson(json);
});

final reportsProvider = FutureProvider.autoDispose<List<ReportDefinition>>((
  ref,
) async {
  final api = ref.read(apiClientProvider);
  final rows = await api.getList('/api/mobile/v1/reports');
  return rows
      .map(
        (row) =>
            ReportDefinition.fromJson((row as Map).cast<String, dynamic>()),
      )
      .toList();
});

final itemProvider = FutureProvider.autoDispose.family<ItemSummary, int>((
  ref,
  id,
) async {
  final api = ref.read(apiClientProvider);
  final json = await api.get('/api/items/$id');
  return ItemSummary.fromJson(json);
});

final itemStockProvider = FutureProvider.autoDispose.family<ItemStock, int>((
  ref,
  id,
) async {
  final api = ref.read(apiClientProvider);
  final json = await api.get('/api/mobile/v1/items/$id/stock');
  return ItemStock.fromJson(json);
});
