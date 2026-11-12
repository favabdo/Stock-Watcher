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
import '../auth/auth_controller.dart';
import '../data/data_providers.dart';

class CreditScreen extends ConsumerWidget {
  const CreditScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = context.palette;
    final settings = ref.watch(
      authControllerProvider.select((state) => state.data?.settings),
    );

    if (settings == null || !settings.hasAnyCreditAlert) {
      return Scaffold(
        appBar: AppBar(title: const Text('الائتمان')),
        body: EmptyState(
          icon: Icons.account_balance_wallet_outlined,
          title: 'تنبيهات الائتمان غير مفعّلة',
          description:
              'فعّل تنبيه تجاوز الحد الائتماني من إعدادات التنبيهات عشان تشوف العملاء المتجاوزين هنا.',
          action: OutlinedButton(
            onPressed: () => context.push('/settings'),
            child: const Text('فتح الإعدادات'),
          ),
        ),
      );
    }

    final credit = ref.watch(creditLimitProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('الائتمان'),
        actions: [
          IconButton(
            tooltip: 'تحديث',
            onPressed: () => ref.invalidate(creditLimitProvider),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(creditLimitProvider),
        child: credit.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(20),
            child: LoadingSkeleton(rows: 3),
          ),
          error: (error, _) => ListView(
            children: [
              ErrorState(
                message: error.toString(),
                onRetry: () => ref.invalidate(creditLimitProvider),
              ),
            ],
          ),
          data: (customers) {
            if (customers.isEmpty) {
              return ListView(
                children: [
                  EmptyState(
                    icon: Icons.verified_outlined,
                    title: 'مفيش تجاوزات ائتمانية',
                    description: 'كل العملاء ضمن الحد الائتماني المسموح به.',
                    tone: palette.success,
                  ),
                ],
              );
            }

            return ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              children: [
                Row(
                  children: [
                    Text(
                      '${customers.length}',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: palette.ink,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'عميل متجاوز الحد الائتماني',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12.5,
                        color: palette.muted,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                for (final customer in customers)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.md),
                    child: _CustomerCard(customer: customer),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _CustomerCard extends StatelessWidget {
  const _CustomerCard({required this.customer});

  final CreditCustomer customer;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final totalOver = customer.branches.fold<double>(
      0,
      (sum, branch) => sum + branch.overAmount,
    );

    return AppCard(
      padding: EdgeInsets.zero,
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
                    color: palette.warningSoft,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.account_balance_wallet_rounded,
                    color: palette.warning,
                    size: 20,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        customer.name.isEmpty ? customer.code : customer.name,
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
                        '${customer.code} • ${customer.branches.length} فرع متجاوز',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 11,
                          color: palette.muted,
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      formatMoney(totalOver),
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: palette.danger,
                      ),
                    ),
                    Text(
                      'إجمالي التجاوز',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 10,
                        color: palette.muted,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Divider(color: palette.border, height: 1),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              children: [
                for (final branch in customer.branches)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: _BranchRow(branch: branch),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BranchRow extends StatelessWidget {
  const _BranchRow({required this.branch});

  final CreditBranch branch;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: palette.surfaceSubtle,
        borderRadius: BorderRadius.circular(AppRadii.panel),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  branch.branchName.isEmpty
                      ? 'فرع ${branch.branchId}'
                      : branch.branchName,
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: palette.ink,
                  ),
                ),
              ),
              AppBadge(
                label: 'تجاوز ${formatMoney(branch.overAmount)}',
                variant: BadgeVariant.danger,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(
                child: LabeledValue(
                  label: 'الرصيد',
                  value: formatMoney(branch.balance),
                ),
              ),
              Expanded(
                child: LabeledValue(
                  label: 'الحد',
                  value: formatMoney(branch.creditLimit),
                  align: CrossAxisAlignment.center,
                ),
              ),
              Expanded(
                child: LabeledValue(
                  label: 'آخر دفعة',
                  value: branch.lastPaidAmount == null
                      ? '-'
                      : formatMoney(branch.lastPaidAmount),
                  align: CrossAxisAlignment.end,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
