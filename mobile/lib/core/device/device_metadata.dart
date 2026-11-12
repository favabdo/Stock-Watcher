import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../storage/token_store.dart';

class DeviceMetadata {
  const DeviceMetadata({
    required this.deviceId,
    required this.platform,
    required this.appVersion,
    required this.osVersion,
    required this.locale,
  });

  final String deviceId;
  final String platform;
  final String appVersion;
  final String osVersion;
  final String locale;

  Map<String, dynamic> toJson() => {
        'deviceId': deviceId,
        'platform': platform,
        'appVersion': appVersion,
        'osVersion': osVersion,
        'locale': locale,
      };

  static Future<DeviceMetadata> load(TokenStore store) async {
    final deviceId = await store.deviceId();
    var appVersion = '0.0.0';

    try {
      final packageInfo = await PackageInfo.fromPlatform();
      appVersion = '${packageInfo.version}+${packageInfo.buildNumber}';
    } catch (_) {
      // Keep the safe fallback; the server stores it for diagnostics only.
    }

    var osVersion = Platform.operatingSystemVersion;
    final deviceInfo = DeviceInfoPlugin();
    try {
      if (Platform.isAndroid) {
        final android = await deviceInfo.androidInfo;
        osVersion =
            'Android ${android.version.release} (SDK ${android.version.sdkInt})';
      } else if (Platform.isIOS) {
        final ios = await deviceInfo.iosInfo;
        osVersion = '${ios.systemName} ${ios.systemVersion}';
      }
    } catch (_) {
      // Keep the raw Platform.operatingSystemVersion fallback.
    }

    return DeviceMetadata(
      deviceId: deviceId,
      platform: Platform.isIOS ? 'ios' : 'android',
      appVersion: appVersion,
      osVersion: osVersion,
      locale: Platform.localeName.replaceAll('-', '_'),
    );
  }
}
