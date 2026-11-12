import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:stock_watcher/app/app.dart';
import 'package:stock_watcher/core/storage/token_store.dart';
import 'package:stock_watcher/features/auth/auth_controller.dart';

class _EmptyTokenStore extends TokenStore {
  @override
  Future<String?> readAccess() async => null;

  @override
  Future<String?> readRefresh() async => null;

  @override
  Future<String> deviceId() async => 'test-device';

  @override
  Future<void> saveTokens(
      {required String access, required String refresh}) async {}

  @override
  Future<void> saveAccess(String access) async {}

  @override
  Future<void> clear() async {}
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('app boots to the Arabic login screen', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [tokenStoreProvider.overrideWithValue(_EmptyTokenStore())],
        child: const StockWatcherApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Stock Watcher'), findsOneWidget);
    expect(find.text('تسجيل الدخول'), findsWidgets);
    expect(find.text('اسم المستخدم'), findsOneWidget);
  });

  testWidgets('empty login form shows Arabic validation messages',
      (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [tokenStoreProvider.overrideWithValue(_EmptyTokenStore())],
        child: const StockWatcherApp(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('تسجيل الدخول').last);
    await tester.pump();

    expect(find.text('اكتب اسم المستخدم'), findsOneWidget);
    expect(find.text('اكتب كلمة المرور'), findsOneWidget);
  });
}
