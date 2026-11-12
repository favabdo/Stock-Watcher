import 'package:flutter/material.dart';

import '../../app/theme/tokens.dart';
import 'app_badge.dart';

class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    required this.title,
    this.count,
    this.countVariant = BadgeVariant.neutral,
    this.action,
  });

  final String title;
  final int? count;
  final BadgeVariant countVariant;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Row(
      children: [
        Text(
          title,
          style: TextStyle(
            fontFamily: 'Cairo',
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: palette.ink,
          ),
        ),
        if (count != null) ...[
          const SizedBox(width: 8),
          AppBadge(label: '$count', variant: countVariant),
        ],
        const Spacer(),
        if (action != null) action!,
      ],
    );
  }
}
