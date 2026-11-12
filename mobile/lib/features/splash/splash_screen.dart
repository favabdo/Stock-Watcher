import 'package:flutter/material.dart';

import '../../app/theme/tokens.dart';
import '../../shared/widgets/app_logo.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: palette.primary,
                borderRadius: BorderRadius.circular(24),
              ),
              child: const AppLogo(height: 56),
            ),
            const SizedBox(height: AppSpacing.xl),
            Text(
              'Stock Watcher',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: palette.ink,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'مخزونك وتنبيهاتك في مكان واحد',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 13,
                color: palette.muted,
              ),
            ),
            const SizedBox(height: AppSpacing.xxxl),
            SizedBox(
              width: 26,
              height: 26,
              child: CircularProgressIndicator(
                strokeWidth: 2.4,
                color: palette.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
