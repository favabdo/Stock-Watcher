import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/device/device_metadata.dart';
import '../../core/models/models.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/push/push_service.dart';
import '../../core/storage/token_store.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  const AuthState({
    required this.status,
    this.data,
    this.busy = false,
    this.error,
  });

  const AuthState.unknown() : this(status: AuthStatus.unknown);

  final AuthStatus status;
  final BootstrapData? data;
  final bool busy;
  final String? error;

  AuthState copyWith({
    AuthStatus? status,
    BootstrapData? data,
    bool? busy,
    String? error,
    bool clearError = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      data: data ?? this.data,
      busy: busy ?? this.busy,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._api, this._store) : super(const AuthState.unknown()) {
    _api.onSessionExpired = _expireSession;
    Future.microtask(restore);
  }

  final ApiClient _api;
  final TokenStore _store;

  static const _cacheKey = 'sw_bootstrap_cache';

  Future<void> restore() async {
    final access = await _store.readAccess();
    final refresh = await _store.readRefresh();
    if ((access == null || access.isEmpty) &&
        (refresh == null || refresh.isEmpty)) {
      state = const AuthState(status: AuthStatus.unauthenticated);
      return;
    }

    try {
      final json = await _api.get('/api/mobile/v1/bootstrap');
      final data = BootstrapData.fromJson(json);
      await _writeCache(json);
      state = AuthState(status: AuthStatus.authenticated, data: data);
      await PushService.initialize(api: _api, store: _store);
    } catch (error) {
      // خطأ صلاحيات مش مشكلة شبكة: الكاش هيدخل المستخدم بجلسة ميتة.
      final status = error is ApiException ? error.status : null;
      if (status == 401 || status == 403) {
        await _store.clear();
        state = AuthState(
          status: AuthStatus.unauthenticated,
          error: error.toString(),
        );
        return;
      }

      final cached = await _readCache();
      if (cached != null) {
        state = AuthState(status: AuthStatus.authenticated, data: cached);
        return;
      }
      await _store.clear();
      state = AuthState(
        status: AuthStatus.unauthenticated,
        error: error.toString(),
      );
    }
  }

  Future<bool> login({
    required String username,
    required String password,
  }) async {
    state = state.copyWith(busy: true, clearError: true);
    try {
      final device = await DeviceMetadata.load(_store);
      final response = await _api.post(
        '/api/mobile/v1/auth/login',
        data: {
          'username': username.trim(),
          'password': password,
          'device': device.toJson(),
        },
      );

      final access = response['accessToken']?.toString();
      final refresh = response['refreshToken']?.toString();
      if (access == null || refresh == null) {
        throw const FormatException('استجابة تسجيل الدخول غير صالحة');
      }
      await _store.saveTokens(access: access, refresh: refresh);

      final client = ClientInfo.fromJson(
        (response['client'] as Map?)?.cast<String, dynamic>() ?? const {},
      );
      final settings = AlertSettings.fromJson(
        (response['settings'] as Map?)?.cast<String, dynamic>() ?? const {},
      );
      final partial = BootstrapData(
        client: client,
        settings: settings,
        kpis: const Kpis(
          lowStockItems: 0,
          zeroStockItems: 0,
          overLimitCustomers: 0,
          unreadNotifications: 0,
        ),
      );

      state = AuthState(status: AuthStatus.authenticated, data: partial);
      await refreshData(silent: true);
      await PushService.initialize(api: _api, store: _store);
      return true;
    } catch (error) {
      await _store.clear();
      state = AuthState(
        status: AuthStatus.unauthenticated,
        error: error.toString(),
      );
      return false;
    } finally {
      if (mounted) state = state.copyWith(busy: false);
    }
  }

  Future<void> refreshData({bool silent = false}) async {
    if (!silent) state = state.copyWith(busy: true, clearError: true);
    try {
      final json = await _api.get('/api/mobile/v1/bootstrap');
      final data = BootstrapData.fromJson(json);
      await _writeCache(json);
      state = AuthState(status: AuthStatus.authenticated, data: data);
    } catch (error) {
      state = state.copyWith(busy: false, error: error.toString());
    } finally {
      if (mounted) state = state.copyWith(busy: false);
    }
  }

  void setUnreadNotifications(int value) {
    final current = state.data;
    if (current == null) return;
    final safe = value < 0 ? 0 : value;
    state = state.copyWith(
      data: current.copyWith(
        kpis: current.kpis.copyWith(unreadNotifications: safe),
      ),
    );
  }

  Future<bool> saveSettings(Map<String, dynamic> patch) async {
    try {
      final json = await _api.put(
        '/api/mobile/v1/settings/alerts',
        data: patch,
      );
      final current = state.data;
      if (current == null) return false;
      final settings = AlertSettings.fromJson(json);
      state = state.copyWith(
        data: current.copyWith(settings: settings),
        clearError: true,
      );
      return true;
    } catch (error) {
      state = state.copyWith(error: error.toString());
      return false;
    }
  }

  Future<void> logout() async {
    state = state.copyWith(busy: true);
    try {
      final refresh = await _store.readRefresh();
      final deviceId = await _store.deviceId();
      if (refresh != null) {
        await _api.post(
          '/api/mobile/v1/auth/logout',
          data: {'refreshToken': refresh, 'deviceId': deviceId},
        );
      }
    } catch (_) {
      // Even if the server call fails, local credentials must be removed.
    }
    await PushService.disable();
    await _store.clear();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  void _expireSession() {
    _store.clear();
    state = const AuthState(
      status: AuthStatus.unauthenticated,
      error: 'الجلسة منتهية. سجل دخول تاني.',
    );
  }

  Future<void> _writeCache(Map<String, dynamic> json) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_cacheKey, jsonEncode(json));
  }

  Future<BootstrapData?> _readCache() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_cacheKey);
    if (raw == null) return null;
    try {
      return BootstrapData.fromJson(
        (jsonDecode(raw) as Map).cast<String, dynamic>(),
      );
    } catch (_) {
      return null;
    }
  }
}

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(ref.read(tokenStoreProvider));
});

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) {
    return AuthController(
      ref.read(apiClientProvider),
      ref.read(tokenStoreProvider),
    );
  },
);
