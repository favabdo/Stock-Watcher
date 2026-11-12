abstract final class Env {
  static const appName = 'Stock Watcher';

  static const _rawBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const pushEnabled = bool.fromEnvironment(
    'PUSH_ENABLED',
    defaultValue: false,
  );

  /// For the Android emulator, 10.0.2.2 points at the host machine.
  /// Production builds must pass an HTTPS origin:
  ///   flutter build apk --dart-define=API_BASE_URL=https://api.example.com
  static String get apiBase {
    if (_rawBaseUrl.isNotEmpty) {
      return _rawBaseUrl.endsWith('/')
          ? _rawBaseUrl.substring(0, _rawBaseUrl.length - 1)
          : _rawBaseUrl;
    }
    return 'http://10.0.2.2:4000';
  }

  static bool get usesHttps => apiBase.startsWith('https://');
}
