import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/tokens.dart';
import '../../core/models/models.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/loading_skeleton.dart';
import '../../shared/widgets/section_header.dart';
import '../data/data_providers.dart';

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = context.palette;
    final reports = ref.watch(reportsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('التقارير'),
        actions: [
          IconButton(
            tooltip: 'تحديث',
            onPressed: () => ref.invalidate(reportsProvider),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(reportsProvider),
        child: reports.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(20),
            child: LoadingSkeleton(rows: 4),
          ),
          error: (error, _) => ListView(
            children: [
              ErrorState(
                message: error.toString(),
                onRetry: () => ref.invalidate(reportsProvider),
              ),
            ],
          ),
          data: (items) {
            if (items.isEmpty) {
              return ListView(
                children: const [
                  EmptyState(
                    icon: Icons.description_outlined,
                    title: 'مفيش تقارير متاحة',
                    description: 'التقارير هتظهر هنا أول ما تتضاف من الإدارة.',
                  ),
                ],
              );
            }

            final groups = <String, List<ReportDefinition>>{};
            for (final report in items) {
              groups
                  .putIfAbsent(
                    report.group.isEmpty ? 'عام' : report.group,
                    () => [],
                  )
                  .add(report);
            }

            return ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              children: [
                Text(
                  'تقارير جاهزة من بيانات المخزون والائتمان',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 12.5,
                    color: palette.muted,
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                for (final entry in groups.entries) ...[
                  SectionHeader(title: entry.key),
                  const SizedBox(height: AppSpacing.md),
                  for (final report in entry.value)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: _ReportCard(report: report),
                    ),
                  const SizedBox(height: AppSpacing.md),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  const _ReportCard({required this.report});

  final ReportDefinition report;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final isCredit =
        report.group.contains('ائتمان') || report.id.startsWith('credit');
    final tone = isCredit ? palette.warning : palette.teal;
    final soft = isCredit ? palette.warningSoft : palette.tealSoft;

    return AppCard(
      onTap: () => context.push('/reports/${report.id}/form', extra: report),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(color: soft, shape: BoxShape.circle),
            child: Icon(
              isCredit
                  ? Icons.account_balance_wallet_rounded
                  : Icons.inventory_2_rounded,
              color: tone,
              size: 21,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  report.name,
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: palette.ink,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  report.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 11.5,
                    height: 1.5,
                    color: palette.muted,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    AppBadge(
                      label: report.params.isEmpty
                          ? 'بدون معاملات'
                          : '${report.params.length} معامل',
                      variant: BadgeVariant.neutral,
                    ),
                    if (report.supportsTotals) ...[
                      const SizedBox(width: 6),
                      const AppBadge(
                        label: 'إجماليات',
                        variant: BadgeVariant.info,
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_left_rounded, color: palette.muted),
        ],
      ),
    );
  }
}
