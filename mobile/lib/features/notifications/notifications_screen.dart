import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/tokens.dart';
import '../../core/models/models.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/loading_skeleton.dart';
import '../auth/auth_controller.dart';
import '../data/data_providers.dart';
import 'notification_tile.dart';

enum _NotificationFilter { all, stock, credit, digest }

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  _NotificationFilter _filter = _NotificationFilter.all;
  bool _markingAll = false;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final page = ref.watch(notificationsProvider(null));

    return Scaffold(
      appBar: AppBar(
        title: const Text('الإشعارات'),
        actions: [
          IconButton(
            tooltip: 'تعليم الكل كمقروء',
            onPressed: _markingAll ? null : _markAllRead,
            icon: const Icon(Icons.done_all_rounded),
          ),
          IconButton(
            tooltip: 'تحديث',
            onPressed: () => ref.invalidate(notificationsProvider(null)),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(notificationsProvider(null)),
        child: page.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(20),
            child: LoadingSkeleton(rows: 4),
          ),
          error: (error, _) => ListView(
            children: [
              ErrorState(
                message: error.toString(),
                onRetry: () => ref.invalidate(notificationsProvider(null)),
              ),
            ],
          ),
          data: (data) {
            final filtered = data.items.where(_matchesFilter).toList();
            final stockCount =
                data.items.where((n) => n.type.startsWith('stock')).length;
            final creditCount =
                data.items.where((n) => n.type.startsWith('credit')).length;
            final digestCount =
                data.items.where((n) => n.type == 'digest').length;

            return ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              children: [
                Row(
                  children: [
                    Text(
                      '${data.unreadCount}',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: palette.ink,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'إشعار غير مقروء',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12.5,
                        color: palette.muted,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _filterChip(
                        'الكل (${data.items.length})',
                        _NotificationFilter.all,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      _filterChip(
                        'مخزون ($stockCount)',
                        _NotificationFilter.stock,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      _filterChip(
                        'ائتمان ($creditCount)',
                        _NotificationFilter.credit,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      _filterChip(
                        'ملخص ($digestCount)',
                        _NotificationFilter.digest,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                if (filtered.isEmpty)
                  const EmptyState(
                    icon: Icons.notifications_off_outlined,
                    title: 'مفيش إشعارات هنا',
                    description: 'لسه مفيش تنبيهات من النوع ده.',
                  )
                else
                  for (final notification in filtered)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: NotificationTile(
                        notification: notification,
                        onTap: () => _openNotification(notification),
                      ),
                    ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _filterChip(String label, _NotificationFilter filter) {
    return ChoiceChip(
      label: Text(label),
      selected: _filter == filter,
      onSelected: (_) => setState(() => _filter = filter),
    );
  }

  bool _matchesFilter(AppNotification notification) {
    return switch (_filter) {
      _NotificationFilter.all => true,
      _NotificationFilter.stock => notification.type.startsWith('stock'),
      _NotificationFilter.credit => notification.type.startsWith('credit'),
      _NotificationFilter.digest => notification.type == 'digest',
    };
  }

  Future<void> _markAllRead() async {
    setState(() => _markingAll = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/api/mobile/v1/notifications/read-all', data: const {});
      ref.read(authControllerProvider.notifier).setUnreadNotifications(0);
      ref.invalidate(notificationsProvider(null));
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _markingAll = false);
    }
  }

  Future<void> _openNotification(AppNotification notification) async {
    if (!notification.read) {
      try {
        await ref
            .read(apiClientProvider)
            .post('/api/mobile/v1/notifications/${notification.id}/read');
        final current =
            ref.read(authControllerProvider).data?.kpis.unreadNotifications ??
                0;
        ref
            .read(authControllerProvider.notifier)
            .setUnreadNotifications(current - 1);
        ref.invalidate(notificationsProvider(null));
      } catch (_) {
        // Navigation is still useful even if mark-read failed.
      }
    }

    if (!mounted) return;
    if (notification.type.startsWith('stock')) {
      final itemId = int.tryParse('${notification.payload['itemId'] ?? ''}');
      if (itemId != null) {
        context.push('/items/$itemId');
      } else {
        context.go('/stock');
      }
      return;
    }
    if (notification.type.startsWith('credit')) {
      context.go('/credit');
    }
  }
}
