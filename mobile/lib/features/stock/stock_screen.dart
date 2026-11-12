import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/tokens.dart';
import '../../core/models/models.dart';
import '../../shared/format.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/labeled_value.dart';
import '../../shared/widgets/loading_skeleton.dart';
import '../data/data_providers.dart';

enum _StockFilter { all, zero, low }

class StockScreen extends ConsumerStatefulWidget {
  const StockScreen({super.key});

  @override
  ConsumerState<StockScreen> createState() => _StockScreenState();
}

class _StockScreenState extends ConsumerState<StockScreen> {
  _StockFilter _filter = _StockFilter.all;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final lowStock = ref.watch(lowStockProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('المخزون'),
        actions: [
          IconButton(
            tooltip: 'بحث عن صنف',
            onPressed: () => context.push('/items/search'),
            icon: const Icon(Icons.search_rounded),
          ),
          IconButton(
            tooltip: 'تحديث',
            onPressed: () => ref.invalidate(lowStockProvider),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(lowStockProvider),
        child: lowStock.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(20),
            child: LoadingSkeleton(rows: 4),
          ),
          error: (error, _) => ListView(
            children: [
              ErrorState(
                message: error.toString(),
                onRetry: () => ref.invalidate(lowStockProvider),
              ),
            ],
          ),
          data: (groups) {
            final zeroCount = groups.where(_hasZero).length;
            final lowCount = groups.where(_hasPositiveLow).length;
            final filtered = switch (_filter) {
              _StockFilter.all => groups,
              _StockFilter.zero => groups.where(_hasZero).toList(),
              _StockFilter.low => groups.where(_hasPositiveLow).toList(),
            };

            return ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              children: [
                Row(
                  children: [
                    Text(
                      '${groups.length}',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: palette.ink,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'صنف تحت حد إعادة الطلب',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12.5,
                        color: palette.muted,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Wrap(
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.sm,
                  children: [
                    ChoiceChip(
                      label: Text('الكل (${groups.length})'),
                      selected: _filter == _StockFilter.all,
                      onSelected: (_) =>
                          setState(() => _filter = _StockFilter.all),
                    ),
                    ChoiceChip(
                      label: Text('نفاد تام ($zeroCount)'),
                      selected: _filter == _StockFilter.zero,
                      onSelected: (_) =>
                          setState(() => _filter = _StockFilter.zero),
                    ),
                    ChoiceChip(
                      label: Text('نقص ($lowCount)'),
                      selected: _filter == _StockFilter.low,
                      onSelected: (_) =>
                          setState(() => _filter = _StockFilter.low),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                if (filtered.isEmpty)
                  EmptyState(
                    icon: _filter == _StockFilter.zero
                        ? Icons.check_circle_outline_rounded
                        : Icons.inventory_2_outlined,
                    title: 'لا توجد أصناف مطابقة',
                    description: _filter == _StockFilter.zero
                        ? 'مفيش أي صنف رصيده صفر حاليًا.'
                        : 'كل الأصناف فوق حد إعادة الطلب.',
                    tone: palette.success,
                  )
                else
                  for (final group in filtered)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: _LowStockTile(group: group),
                    ),
              ],
            );
          },
        ),
      ),
    );
  }

  bool _hasZero(LowStockGroup group) => group.branches.any((b) => b.stock <= 0);

  bool _hasPositiveLow(LowStockGroup group) =>
      group.branches.any((b) => b.stock > 0);
}

class _LowStockTile extends ConsumerStatefulWidget {
  const _LowStockTile({required this.group});

  final LowStockGroup group;

  @override
  ConsumerState<_LowStockTile> createState() => _LowStockTileState();
}

class _LowStockTileState extends ConsumerState<_LowStockTile> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final item = widget.group.item;
    final hasZero = widget.group.branches.any((b) => b.stock <= 0);
    final accent = hasZero ? palette.danger : palette.warning;
    final soft = hasZero ? palette.dangerSoft : palette.warningSoft;

    return AppCard(
      padding: EdgeInsets.zero,
      onTap: () => setState(() => _expanded = !_expanded),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: soft,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    hasZero
                        ? Icons.remove_shopping_cart_rounded
                        : Icons.inventory_2_rounded,
                    color: accent,
                    size: 20,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.displayName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: palette.ink,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${item.code} • الحد ${formatNumber(item.reorderQty)}',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 11,
                          color: palette.muted,
                        ),
                      ),
                    ],
                  ),
                ),
                AppBadge(
                  label: '${widget.group.branches.length} مخزن',
                  variant: hasZero ? BadgeVariant.danger : BadgeVariant.warning,
                ),
                const SizedBox(width: 4),
                Icon(
                  _expanded
                      ? Icons.expand_less_rounded
                      : Icons.expand_more_rounded,
                  color: palette.muted,
                ),
              ],
            ),
          ),
          if (_expanded) ...[
            Divider(color: palette.border, height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
              child: _buildDetails(context, item),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDetails(BuildContext context, ItemSummary item) {
    final palette = context.palette;
    final stock = ref.watch(itemStockProvider(item.id));

    return stock.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: LinearProgressIndicator(minHeight: 2),
      ),
      error: (error, _) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            error.toString(),
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 12,
              color: palette.danger,
            ),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => ref.invalidate(itemStockProvider(item.id)),
            child: const Text('إعادة المحاولة'),
          ),
        ],
      ),
      data: (data) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              data.belowThreshold.isNotEmpty
                  ? 'تحت الحد في ${data.belowThreshold.length} من ${data.stores.length} مخزن'
                  : 'فوق الحد في كل المخازن',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 11.5,
                color: palette.muted,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            for (final store in data.stores)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: palette.surfaceSubtle,
                    borderRadius: BorderRadius.circular(AppRadii.panel),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              store.storeName,
                              style: TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: palette.ink,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'الحد ${formatNumber(store.reorderQty)}',
                              style: TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 10.5,
                                color: palette.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      LabeledValue(
                        label: 'الرصيد',
                        value: formatNumber(store.stock),
                        valueColor: store.belowThreshold
                            ? palette.danger
                            : palette.success,
                        align: CrossAxisAlignment.end,
                      ),
                      const SizedBox(width: AppSpacing.md),
                      AppBadge(
                        label: store.belowThreshold ? 'تحت الحد' : 'طبيعي',
                        variant: store.belowThreshold
                            ? BadgeVariant.danger
                            : BadgeVariant.success,
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 4),
            OutlinedButton.icon(
              onPressed: () => context.push('/items/${item.id}'),
              icon: const Icon(Icons.edit_rounded, size: 17),
              label: const Text('تعديل حد إعادة الطلب'),
            ),
          ],
        );
      },
    );
  }
}
