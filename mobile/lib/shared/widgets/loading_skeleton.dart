import 'package:flutter/material.dart';

import '../../app/theme/tokens.dart';

class LoadingSkeleton extends StatelessWidget {
  const LoadingSkeleton({super.key, this.rows = 3});

  final int rows;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < rows; i++) ...[
          const _SkeletonBox(height: 86, radius: AppRadii.card),
          const SizedBox(height: AppSpacing.md),
        ],
      ],
    );
  }
}

class _SkeletonBox extends StatefulWidget {
  const _SkeletonBox({required this.height, required this.radius});

  final double height;
  final double radius;

  @override
  State<_SkeletonBox> createState() => _SkeletonBoxState();
}

class _SkeletonBoxState extends State<_SkeletonBox>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          height: widget.height,
          decoration: BoxDecoration(
            color: palette.surfaceSubtle.withAlpha(
              (150 + (_controller.value * 60)).round(),
            ),
            borderRadius: BorderRadius.circular(widget.radius),
            border: Border.all(color: palette.border),
          ),
        );
      },
    );
  }
}
