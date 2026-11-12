import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/config/env.dart';
import '../core/push/push_service.dart';
import '../core/theme/theme_controller.dart';
import 'router.dart';
import 'theme/app_theme.dart';

class StockWatcherApp extends ConsumerStatefulWidget {
  const StockWatcherApp({super.key});

  @override
  ConsumerState<StockWatcherApp> createState() => _StockWatcherAppState();
}

class _StockWatcherAppState extends ConsumerState<StockWatcherApp> {
  StreamSubscription<Map<String, dynamic>>? _pushSubscription;

  @override
  void initState() {
    super.initState();
    _pushSubscription = PushService.taps.listen(_handlePushTap);
  }

  @override
  void dispose() {
    _pushSubscription?.cancel();
    super.dispose();
  }

  void _handlePushTap(Map<String, dynamic> data) {
    final router = ref.read(routerProvider);
    final type = data['type']?.toString() ?? '';

    if (type.startsWith('stock')) {
      final itemId = int.tryParse(
        '${data['itemId'] ?? data['entityId'] ?? ''}',
      );
      if (itemId != null) {
        router.push('/items/$itemId');
      } else {
        router.go('/stock');
      }
      return;
    }

    if (type.startsWith('credit')) {
      router.go('/credit');
      return;
    }

    router.go('/notifications');
  }

  @override
  Widget build(BuildContext context) {
    final themeMode = ref.watch(themeControllerProvider);
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: Env.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: themeMode,
      locale: const Locale('ar', 'EG'),
      supportedLocales: const [Locale('ar', 'EG')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      routerConfig: router,
      builder: (context, child) {
        final dark = Theme.of(context).brightness == Brightness.dark;
        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: dark ? Brightness.light : Brightness.dark,
            statusBarBrightness: dark ? Brightness.dark : Brightness.light,
            systemNavigationBarColor: Colors.transparent,
            systemNavigationBarDividerColor: Colors.transparent,
            systemNavigationBarIconBrightness:
                dark ? Brightness.light : Brightness.dark,
          ),
          child: Directionality(
            textDirection: TextDirection.rtl,
            child: child ?? const SizedBox.shrink(),
          ),
        );
      },
    );
  }
}
