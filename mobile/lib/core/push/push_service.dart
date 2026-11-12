import 'dart:async';
import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../config/env.dart';
import '../device/device_metadata.dart';
import '../network/api_client.dart';
import '../storage/token_store.dart';

class PushService {
  static final _taps = StreamController<Map<String, dynamic>>.broadcast();
  static final FlutterLocalNotificationsPlugin _local =
      FlutterLocalNotificationsPlugin();

  static ApiClient? _api;
  static String? _deviceId;
  static bool _initialized = false;

  static Stream<Map<String, dynamic>> get taps => _taps.stream;

  static Future<void> initialize({
    required ApiClient api,
    required TokenStore store,
  }) async {
    _api = api;
    if (!Env.pushEnabled) return;

    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp();
      }

      const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
      const darwinInit = DarwinInitializationSettings();
      await _local.initialize(
        const InitializationSettings(android: androidInit, iOS: darwinInit),
        onDidReceiveNotificationResponse: (response) {
          final payload = response.payload;
          if (payload == null) return;
          try {
            _taps.add((jsonDecode(payload) as Map).cast<String, dynamic>());
          } catch (_) {
            // Ignore malformed local payloads.
          }
        },
      );

      final androidPlugin = _local.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      await androidPlugin?.createNotificationChannel(
        const AndroidNotificationChannel(
          'stock_alerts',
          'تنبيهات Stock Watcher',
          description: 'تنبيهات المخزون والائتمان',
          importance: Importance.high,
        ),
      );

      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(alert: true, badge: true, sound: true);

      final metadata = await DeviceMetadata.load(store);
      _deviceId = metadata.deviceId;
      final token = await messaging.getToken();
      if (token != null && token.isNotEmpty) {
        await api.post(
          '/api/mobile/v1/devices',
          data: {...metadata.toJson(), 'pushToken': token},
        );
      }

      messaging.onTokenRefresh.listen((nextToken) async {
        final id = _deviceId;
        if (id == null) return;
        try {
          await api.patch(
            '/api/mobile/v1/devices/$id',
            data: {'pushToken': nextToken},
          );
        } catch (error) {
          debugPrint('Push token refresh failed: $error');
        }
      });

      FirebaseMessaging.onMessage.listen(_showForeground);
      FirebaseMessaging.onMessageOpenedApp.listen(
        (message) => _emit(message.data),
      );

      final initial = await messaging.getInitialMessage();
      if (initial != null) _emit(initial.data);

      _initialized = true;
    } catch (error) {
      debugPrint('Push initialization failed: $error');
    }
  }

  static Future<void> disable() async {
    if (!_initialized) return;
    try {
      await FirebaseMessaging.instance.deleteToken();
    } catch (_) {
      // Best effort.
    }
    final id = _deviceId;
    final api = _api;
    if (id != null && api != null) {
      try {
        await api.delete('/api/mobile/v1/devices/$id');
      } catch (_) {
        // Best effort.
      }
    }
    _initialized = false;
  }

  static Future<void> _showForeground(RemoteMessage message) async {
    final notification = message.notification;
    final title = notification?.title ??
        message.data['title']?.toString() ??
        'Stock Watcher';
    final body = notification?.body ?? message.data['body']?.toString() ?? '';
    if (title.isEmpty && body.isEmpty) return;

    await _local.show(
      message.hashCode,
      title,
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'stock_alerts',
          'تنبيهات Stock Watcher',
          channelDescription: 'تنبيهات المخزون والائتمان',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      ),
      payload: jsonEncode(message.data),
    );
  }

  static void _emit(Map<String, dynamic> data) {
    if (data.isEmpty) return;
    _taps.add(data);
  }
}
