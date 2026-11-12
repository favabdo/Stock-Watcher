import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/models/models.dart';
import '../features/auth/auth_controller.dart';
import '../features/auth/login_screen.dart';
import '../features/credit/credit_screen.dart';
import '../features/home/home_screen.dart';
import '../features/items/item_detail_screen.dart';
import '../features/items/item_search_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/reports/report_form_screen.dart';
import '../features/reports/report_result_screen.dart';
import '../features/reports/reports_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/splash/splash_screen.dart';
import '../features/stock/stock_screen.dart';
import 'shell.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');

final routerProvider = Provider<GoRouter>((ref) {
  final status = ref.watch(
    authControllerProvider.select((state) => state.status),
  );

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    redirect: (context, state) {
      final location = state.matchedLocation;
      if (status == AuthStatus.unknown) {
        return location == '/splash' ? null : '/splash';
      }

      final loggedIn = status == AuthStatus.authenticated;
      if (!loggedIn) {
        return location == '/login' ? null : '/login';
      }

      if (location == '/login' || location == '/splash') return '/home';
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            AppShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/stock',
                builder: (context, state) => const StockScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/credit',
                builder: (context, state) => const CreditScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/notifications',
                builder: (context, state) => const NotificationsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/reports',
                builder: (context, state) => const ReportsScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/items/search',
        builder: (context, state) => const ItemSearchScreen(),
      ),
      GoRoute(
        path: '/items/:id',
        builder: (context, state) {
          final id = int.tryParse(state.pathParameters['id'] ?? '');
          if (id == null) {
            return const _RouteError(message: 'رقم الصنف غير صالح');
          }
          return ItemDetailScreen(itemId: id);
        },
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/reports/:id/form',
        builder: (context, state) {
          final report = state.extra is ReportDefinition
              ? state.extra as ReportDefinition
              : null;
          if (report == null) {
            return const _RouteError(
              message: 'رجع لقائمة التقارير واختر التقرير من جديد',
            );
          }
          return ReportFormScreen(report: report);
        },
      ),
      GoRoute(
        path: '/reports/result',
        builder: (context, state) {
          final result =
              state.extra is ReportResult ? state.extra as ReportResult : null;
          if (result == null) {
            return const _RouteError(message: 'مفيش نتيجة تقرير للعرض');
          }
          return ReportResultScreen(result: result);
        },
      ),
    ],
  );
});

class _RouteError extends StatelessWidget {
  const _RouteError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
        ),
      ),
    );
  }
}
