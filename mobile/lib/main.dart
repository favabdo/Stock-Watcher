import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'app/app.dart';
import 'core/config/env.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  Intl.defaultLocale = 'ar_EG';
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  assert(
    !kReleaseMode || Env.usesHttps,
    'Production builds require --dart-define=API_BASE_URL=https://...',
  );

  runApp(const ProviderScope(child: StockWatcherApp()));
}
