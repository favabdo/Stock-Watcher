import 'package:flutter/material.dart';

/// Design tokens measured from the user's EduSpace token sheet and the current
/// Stock Watcher web theme, with the house rules applied:
/// - pill controls (999)
/// - soft cards (18) and nested panels (14)
/// - calm blue + teal, warm amber/red only for states
/// - Cairo, no purple, no decorative glows
@immutable
class AppPalette extends ThemeExtension<AppPalette> {
  const AppPalette({
    required this.brightness,
    required this.page,
    required this.surface,
    required this.surfaceSubtle,
    required this.border,
    required this.borderStrong,
    required this.ink,
    required this.body,
    required this.muted,
    required this.primary,
    required this.primarySoft,
    required this.accent,
    required this.teal,
    required this.tealSoft,
    required this.success,
    required this.successSoft,
    required this.danger,
    required this.dangerSoft,
    required this.warning,
    required this.warningSoft,
    required this.shadow,
  });

  final Brightness brightness;
  final Color page;
  final Color surface;
  final Color surfaceSubtle;
  final Color border;
  final Color borderStrong;
  final Color ink;
  final Color body;
  final Color muted;
  final Color primary;
  final Color primarySoft;
  final Color accent;
  final Color teal;
  final Color tealSoft;
  final Color success;
  final Color successSoft;
  final Color danger;
  final Color dangerSoft;
  final Color warning;
  final Color warningSoft;
  final Color shadow;

  bool get isDark => brightness == Brightness.dark;

  Color get onPrimary => isDark ? const Color(0xFF06101F) : Colors.white;

  static const light = AppPalette(
    brightness: Brightness.light,
    page: Color(0xFFF3F8FD),
    surface: Color(0xFFFFFFFF),
    surfaceSubtle: Color(0xFFF7FAFD),
    border: Color(0xFFE7EDF5),
    borderStrong: Color(0xFFD5DEEB),
    ink: Color(0xFF050A20),
    body: Color(0xFF2B497E),
    muted: Color(0xFF7186A6),
    primary: Color(0xFF245493),
    primarySoft: Color(0xFFEAF1FA),
    accent: Color(0xFF1671F5),
    teal: Color(0xFF0D9488),
    tealSoft: Color(0xFFE3F5F2),
    success: Color(0xFF12805C),
    successSoft: Color(0xFFE3F5EE),
    danger: Color(0xFFD7263D),
    dangerSoft: Color(0xFFFCE9EC),
    warning: Color(0xFFB4740E),
    warningSoft: Color(0xFFFCF1DC),
    shadow: Color(0x0F0F2850),
  );

  static const dark = AppPalette(
    brightness: Brightness.dark,
    page: Color(0xFF0A1120),
    surface: Color(0xFF121B2E),
    surfaceSubtle: Color(0xFF162034),
    border: Color(0xFF24314A),
    borderStrong: Color(0xFF33445F),
    ink: Color(0xFFF2F6FC),
    body: Color(0xFFB6C4D8),
    muted: Color(0xFF8296B1),
    primary: Color(0xFF5B9BFF),
    primarySoft: Color(0xFF172B4A),
    accent: Color(0xFF7CB0FF),
    teal: Color(0xFF2DD4BF),
    tealSoft: Color(0xFF12332F),
    success: Color(0xFF35C08A),
    successSoft: Color(0xFF113228),
    danger: Color(0xFFF0616F),
    dangerSoft: Color(0xFF3A1620),
    warning: Color(0xFFE3A73F),
    warningSoft: Color(0xFF3A2C10),
    shadow: Color(0x66000000),
  );

  @override
  AppPalette copyWith({
    Brightness? brightness,
    Color? page,
    Color? surface,
    Color? surfaceSubtle,
    Color? border,
    Color? borderStrong,
    Color? ink,
    Color? body,
    Color? muted,
    Color? primary,
    Color? primarySoft,
    Color? accent,
    Color? teal,
    Color? tealSoft,
    Color? success,
    Color? successSoft,
    Color? danger,
    Color? dangerSoft,
    Color? warning,
    Color? warningSoft,
    Color? shadow,
  }) {
    return AppPalette(
      brightness: brightness ?? this.brightness,
      page: page ?? this.page,
      surface: surface ?? this.surface,
      surfaceSubtle: surfaceSubtle ?? this.surfaceSubtle,
      border: border ?? this.border,
      borderStrong: borderStrong ?? this.borderStrong,
      ink: ink ?? this.ink,
      body: body ?? this.body,
      muted: muted ?? this.muted,
      primary: primary ?? this.primary,
      primarySoft: primarySoft ?? this.primarySoft,
      accent: accent ?? this.accent,
      teal: teal ?? this.teal,
      tealSoft: tealSoft ?? this.tealSoft,
      success: success ?? this.success,
      successSoft: successSoft ?? this.successSoft,
      danger: danger ?? this.danger,
      dangerSoft: dangerSoft ?? this.dangerSoft,
      warning: warning ?? this.warning,
      warningSoft: warningSoft ?? this.warningSoft,
      shadow: shadow ?? this.shadow,
    );
  }

  @override
  AppPalette lerp(ThemeExtension<AppPalette>? other, double t) {
    if (other is! AppPalette) return this;
    Color mix(Color a, Color b) => Color.lerp(a, b, t)!;
    return AppPalette(
      brightness: t < 0.5 ? brightness : other.brightness,
      page: mix(page, other.page),
      surface: mix(surface, other.surface),
      surfaceSubtle: mix(surfaceSubtle, other.surfaceSubtle),
      border: mix(border, other.border),
      borderStrong: mix(borderStrong, other.borderStrong),
      ink: mix(ink, other.ink),
      body: mix(body, other.body),
      muted: mix(muted, other.muted),
      primary: mix(primary, other.primary),
      primarySoft: mix(primarySoft, other.primarySoft),
      accent: mix(accent, other.accent),
      teal: mix(teal, other.teal),
      tealSoft: mix(tealSoft, other.tealSoft),
      success: mix(success, other.success),
      successSoft: mix(successSoft, other.successSoft),
      danger: mix(danger, other.danger),
      dangerSoft: mix(dangerSoft, other.dangerSoft),
      warning: mix(warning, other.warning),
      warningSoft: mix(warningSoft, other.warningSoft),
      shadow: mix(shadow, other.shadow),
    );
  }
}

extension AppPaletteContext on BuildContext {
  AppPalette get palette => Theme.of(this).extension<AppPalette>()!;
}

abstract final class AppRadii {
  static const control = 999.0;
  static const card = 18.0;
  static const panel = 14.0;
  static const sheet = 22.0;
  static const small = 10.0;
}

abstract final class AppSpacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 20.0;
  static const xxl = 24.0;
  static const xxxl = 32.0;
  static const huge = 40.0;
}

abstract final class AppDurations {
  static const fast = Duration(milliseconds: 140);
  static const base = Duration(milliseconds: 220);
  static const slow = Duration(milliseconds: 420);
}
