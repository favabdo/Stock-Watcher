import 'package:flutter/material.dart';

import '../../app/theme/tokens.dart';
import '../../core/models/models.dart';
import '../../shared/format.dart';
import '../../shared/widgets/app_card.dart';

class NotificationTile extends StatelessWidget {
  const NotificationTile({super.key, required this.notification, this.onTap});

  final AppNotification notification;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final (icon, tone, soft) = _visual(notification.type, palette);

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      onTap: onTap,
      color: notification.read
          ? palette.surface
          : palette.primarySoft.withAlpha(90),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: soft, shape: BoxShape.circle),
            child: Icon(icon, size: 20, color: tone),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        notification.title,
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: palette.ink,
                        ),
                      ),
                    ),
                    if (!notification.read)
                      Container(
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(
                          color: palette.accent,
                          shape: BoxShape.circle,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  notification.body,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 11.5,
                    height: 1.55,
                    color: palette.body,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  timeAgo(notification.occurredAt),
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 10.5,
                    color: palette.muted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  (IconData, Color, Color) _visual(String type, AppPalette palette) {
    if (type == 'stock_zero') {
      return (
        Icons.remove_shopping_cart_rounded,
        palette.danger,
        palette.dangerSoft,
      );
    }
    if (type == 'stock_low') {
      return (Icons.inventory_2_rounded, palette.warning, palette.warningSoft);
    }
    if (type == 'credit_increase') {
      return (Icons.trending_up_rounded, palette.danger, palette.dangerSoft);
    }
    if (type.startsWith('credit')) {
      return (
        Icons.account_balance_wallet_rounded,
        palette.warning,
        palette.warningSoft,
      );
    }
    if (type == 'reorder_suggestion') {
      return (
        Icons.shopping_cart_checkout_rounded,
        palette.teal,
        palette.tealSoft,
      );
    }
    if (type == 'digest') {
      return (Icons.summarize_rounded, palette.primary, palette.primarySoft);
    }
    return (Icons.notifications_rounded, palette.primary, palette.primarySoft);
  }
}
