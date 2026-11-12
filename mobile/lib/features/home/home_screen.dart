import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/tokens.dart';
import '../../core/theme/theme_controller.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_logo.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/kpi_card.dart';
import '../../shared/widgets/loading_skeleton.dart';
import '../../shared/widgets/section_header.dart';
import '../auth/auth_controller.dart';
import '../data/data_providers.dart';
import '../notifications/notification_tile.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = context.palette;
    final auth = ref.watch(authControllerProvider);
    final data = auth.data;

    if (data == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('الرئيسية')),
        body: auth.status == AuthStatus.unknown
            ? const Padding(
                padding: EdgeInsets.all(20),
                child: LoadingSkeleton(rows: 4),
              )
            : ErrorState(
                message: auth.error ?? 'مش قادرين نحمّل بياناتك',
                onRetry: () =>
                    ref.read(authControllerProvider.notifier).refreshData(),
              ),
      );
    }

    final notifications = ref.watch(notificationsProvider(null));
    final settings = data.settings;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const AppLogo(height: 28),
            const SizedBox(width: 10),
            Flexible(
              child: Text(data.client.name, overflow: TextOverflow.ellipsis),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'الوضع الداكن',
            onPressed: () =>
                ref.read(themeControllerProvider.notifier).toggle(),
            icon: const Icon(Icons.dark_mode_outlined),
          ),
          IconButton(
            tooltip: 'الإعدادات',
            onPressed: () => context.push('/settings'),
            icon: const Icon(Icons.tune_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(notificationsProvider(null));
          await ref
              .read(authControllerProvider.notifier)
              .refreshData(silent: true);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            Text(
              'أهلًا، ${data.client.name}',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 26,
                fontWeight: FontWeight.w800,
                color: palette.ink,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'ملخص سريع لمخزونك وتنبيهاتك النهارده',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 12.5,
                color: palette.muted,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            GridView(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: AppSpacing.md,
                mainAxisSpacing: AppSpacing.md,
                mainAxisExtent: 168,
              ),
              children: [
                KpiCard(
                  label: 'أصناف تحت الحد',
                  value: '${data.kpis.lowStockItems}',
                  icon: Icons.inventory_2_rounded,
                  tint: palette.warningSoft,
                  foreground: palette.warning,
                  caption: 'تحتاج متابعة',
                  onTap: () => context.go('/stock'),
                ),
                KpiCard(
                  label: 'نفاد تام',
                  value: '${data.kpis.zeroStockItems}',
                  icon: Icons.remove_shopping_cart_rounded,
                  tint: palette.dangerSoft,
                  foreground: palette.danger,
                  caption: 'رصيد صفر',
                  onTap: () => context.go('/stock'),
                ),
                KpiCard(
                  label: 'تجاوز الائتمان',
                  value: '${data.kpis.overLimitCustomers}',
                  icon: Icons.account_balance_wallet_rounded,
                  tint: palette.warningSoft,
                  foreground: palette.warning,
                  caption: 'عملاء متجاوزون',
                  onTap: () => context.go('/credit'),
                ),
                KpiCard(
                  label: 'إشعارات غير مقروءة',
                  value: '${data.kpis.unreadNotifications}',
                  icon: Icons.notifications_rounded,
                  tint: palette.primarySoft,
                  foreground: palette.primary,
                  caption: 'من مركز الإشعارات',
                  onTap: () => context.go('/notifications'),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'وصول سريع'),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => context.push('/items/search'),
                    icon: const Icon(Icons.search_rounded, size: 18),
                    label: const Text('بحث عن صنف'),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => context.go('/reports'),
                    icon: const Icon(Icons.description_outlined, size: 18),
                    label: const Text('التقارير'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xxl),
            SectionHeader(
              title: 'آخر التنبيهات',
              action: TextButton(
                onPressed: () => context.go('/notifications'),
                child: const Text('عرض الكل'),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            notifications.when(
              loading: () => const LoadingSkeleton(rows: 2),
              error: (error, _) => ErrorState(
                message: error.toString(),
                onRetry: () => ref.invalidate(notificationsProvider(null)),
              ),
              data: (page) {
                if (page.items.isEmpty) {
                  return EmptyState(
                    icon: Icons.notifications_off_outlined,
                    title: 'مفيش تنبيهات جديدة',
                    description:
                        'لما يحصل نقص أو تجاوز في الائتمان، هتلاقي التنبيه هنا.',
                    tone: palette.success,
                  );
                }
                return Column(
                  children: [
                    for (final item in page.items.take(3))
                      Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: NotificationTile(
                          notification: item,
                          onTap: () => context.go('/notifications'),
                        ),
                      ),
                  ],
                );
              },
            ),
            const SizedBox(height: AppSpacing.xxl),
            const SectionHeader(title: 'إعدادات التنبيهات'),
            const SizedBox(height: AppSpacing.md),
            AppCard(
              child: Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  if (settings.stockLowEnabled)
                    const AppBadge(
                      label: 'نقص المخزون',
                      variant: BadgeVariant.warning,
                    ),
                  if (settings.stockZeroEnabled)
                    const AppBadge(
                      label: 'نفاد تام',
                      variant: BadgeVariant.danger,
                    ),
                  if (settings.reorderSuggestionEnabled)
                    const AppBadge(
                      label: 'اقتراح إعادة طلب',
                      variant: BadgeVariant.info,
                    ),
                  if (settings.creditOverEnabled)
                    const AppBadge(
                      label: 'تجاوز الائتمان',
                      variant: BadgeVariant.danger,
                    ),
                  if (settings.creditIncreaseEnabled)
                    const AppBadge(
                      label: 'تزايد الائتمان',
                      variant: BadgeVariant.warning,
                    ),
                  if (settings.digestEnabled)
                    AppBadge(
                      label: settings.digestFrequency == 'weekly'
                          ? 'ملخص أسبوعي'
                          : 'ملخص يومي',
                      variant: BadgeVariant.neutral,
                    ),
                  if (!settings.hasAnyStockAlert &&
                      !settings.hasAnyCreditAlert &&
                      !settings.reorderSuggestionEnabled)
                    const AppBadge(
                      label: 'كل التنبيهات متوقفة',
                      variant: BadgeVariant.neutral,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
