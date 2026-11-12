import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/tokens.dart';
import '../../core/models/models.dart';
import '../../core/network/api_exception.dart';
import '../../shared/format.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/labeled_value.dart';
import '../../shared/widgets/loading_skeleton.dart';
import '../auth/auth_controller.dart';
import '../data/data_providers.dart';

class ItemDetailScreen extends ConsumerStatefulWidget {
  const ItemDetailScreen({super.key, required this.itemId});

  final int itemId;

  @override
  ConsumerState<ItemDetailScreen> createState() => _ItemDetailScreenState();
}

class _ItemDetailScreenState extends ConsumerState<ItemDetailScreen> {
  final _reorder = TextEditingController();
  bool _initialized = false;
  bool _saving = false;

  @override
  void dispose() {
    _reorder.dispose();
    super.dispose();
  }

  Future<void> _save(ItemSummary item) async {
    final value = double.tryParse(_reorder.text.trim().replaceAll(',', ''));
    if (value == null || value < 0) {
      _toast('حد إعادة الطلب لازم يكون رقم صفر أو أكبر');
      return;
    }

    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.put(
        '/api/items/${item.id}/reorder-qty',
        data: {'reorderQty': value},
      );
      if (!mounted) return;
      ref.invalidate(itemProvider(item.id));
      ref.invalidate(itemStockProvider(item.id));
      ref.invalidate(lowStockProvider);
      _toast('تم تحديث حد إعادة الطلب');
    } catch (error) {
      if (!mounted) return;
      _toast(
        error is ApiException ? error.message : 'فشل تحديث حد إعادة الطلب',
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _reload() async {
    ref.invalidate(itemProvider(widget.itemId));
    ref.invalidate(itemStockProvider(widget.itemId));
    try {
      await Future.wait([
        ref.read(itemProvider(widget.itemId).future),
        ref.read(itemStockProvider(widget.itemId).future),
      ]);
    } catch (_) {
      // الأخطاء بتظهر جوه شاشة الحالة، مش محتاجين نكسر الـ RefreshIndicator.
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final item = ref.watch(itemProvider(widget.itemId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('تفاصيل الصنف'),
        actions: [
          IconButton(
            tooltip: 'تحديث',
            onPressed: _reload,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: item.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(20),
          child: LoadingSkeleton(rows: 4),
        ),
        error: (error, _) => SingleChildScrollView(
          child: ErrorState(
            message: error.toString(),
            onRetry: () => ref.invalidate(itemProvider(widget.itemId)),
          ),
        ),
        data: (data) {
          if (!_initialized) {
            _initialized = true;
            _reorder.text = data.reorderQty == data.reorderQty.roundToDouble()
                ? data.reorderQty.toStringAsFixed(0)
                : data.reorderQty.toString();
          }

          return RefreshIndicator(
            onRefresh: _reload,
            color: palette.primary,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              children: [
                _HeaderCard(item: data),
                const SizedBox(height: AppSpacing.lg),
                _ReorderCard(
                  controller: _reorder,
                  saving: _saving,
                  onSave: () => _save(data),
                ),
                const SizedBox(height: AppSpacing.xxl),
                _StockSection(itemId: data.id, reorderQty: data.reorderQty),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({required this.item});

  final ItemSummary item;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: palette.primarySoft,
                  borderRadius: BorderRadius.circular(AppRadii.panel),
                ),
                child: Icon(
                  Icons.inventory_2_rounded,
                  color: palette.primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.displayName,
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: palette.ink,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'كود ${item.code}',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 11.5,
                        color: palette.muted,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (item.nameEn.isNotEmpty && item.nameAr.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              item.nameEn,
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 11.5,
                color: palette.muted,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ReorderCard extends StatelessWidget {
  const _ReorderCard({
    required this.controller,
    required this.saving,
    required this.onSave,
  });

  final TextEditingController controller;
  final bool saving;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(Icons.tune_rounded, size: 18, color: palette.primary),
              const SizedBox(width: 8),
              Text(
                'حد إعادة الطلب',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: palette.ink,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'لما رصيد الصنف في أي مخزن يوصل للرقم ده أو أقل، يظهر في قائمة النواقص ويوصلك تنبيه.',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 11.5,
              height: 1.6,
              color: palette.muted,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.numbers_rounded),
                    hintText: '0',
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              FilledButton(
                onPressed: saving ? null : onSave,
                child: saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('حفظ'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StockSection extends ConsumerWidget {
  const _StockSection({required this.itemId, required this.reorderQty});

  final int itemId;
  final double reorderQty;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = context.palette;
    final stock = ref.watch(itemStockProvider(itemId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Text(
              'الرصيد في المخازن',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: palette.ink,
              ),
            ),
            const Spacer(),
            if (stock.hasValue) ...[
              AppBadge(
                label: '${stock.value!.stores.length} مخزن',
                variant: BadgeVariant.neutral,
              ),
            ],
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        stock.when(
          loading: () => const LoadingSkeleton(rows: 2),
          error: (error, _) => AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.wifi_off_rounded,
                      size: 18,
                      color: palette.danger,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        error.toString(),
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 12,
                          color: palette.body,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                OutlinedButton(
                  onPressed: () => ref.invalidate(itemStockProvider(itemId)),
                  child: const Text('إعادة المحاولة'),
                ),
              ],
            ),
          ),
          data: (data) {
            if (data.stores.isEmpty) {
              return AppCard(
                child: Text(
                  'مفيش أي رصيد مسجل للصنف ده في المخازن حاليًا.',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 12,
                    color: palette.muted,
                  ),
                ),
              );
            }

            final total = data.stores.fold<double>(
              0,
              (sum, store) => sum + store.stock,
            );
            final below = data.belowThreshold.length;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AppCard(
                  child: Row(
                    children: [
                      Expanded(
                        child: LabeledValue(
                          label: 'إجمالي الرصيد',
                          value: formatNumber(total),
                        ),
                      ),
                      Container(width: 1, height: 32, color: palette.border),
                      Expanded(
                        child: LabeledValue(
                          label: 'مخازن تحت الحد',
                          value: '$below',
                          valueColor:
                              below > 0 ? palette.danger : palette.success,
                          align: CrossAxisAlignment.end,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                for (final store in data.stores)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: _StoreTile(store: store),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _StoreTile extends StatelessWidget {
  const _StoreTile({required this.store});

  final StoreStock store;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final accent = store.belowThreshold ? palette.danger : palette.success;
    final soft =
        store.belowThreshold ? palette.dangerSoft : palette.successSoft;
    final threshold = store.reorderQty;
    final ratio =
        threshold <= 0 ? 1.0 : (store.stock / threshold).clamp(0.0, 1.0);

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(color: soft, shape: BoxShape.circle),
                child: Icon(
                  store.belowThreshold
                      ? Icons.warning_amber_rounded
                      : Icons.check_circle_outline_rounded,
                  size: 17,
                  color: accent,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  store.storeName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: palette.ink,
                  ),
                ),
              ),
              Text(
                formatNumber(store.stock),
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: accent,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadii.control),
            child: LinearProgressIndicator(
              value: ratio,
              minHeight: 6,
              backgroundColor: palette.surfaceSubtle,
              valueColor: AlwaysStoppedAnimation<Color>(accent),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text(
                'الحد ${formatNumber(threshold)}',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 10.5,
                  color: palette.muted,
                ),
              ),
              const Spacer(),
              AppBadge(
                label: store.belowThreshold
                    ? 'ناقص ${formatNumber(store.liveReorderQty)} عن الحد'
                    : 'فوق الحد ${formatNumber(-store.liveReorderQty)}',
                variant: store.belowThreshold
                    ? BadgeVariant.danger
                    : BadgeVariant.success,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
