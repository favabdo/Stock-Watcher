import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../app/theme/tokens.dart';
import '../../core/theme/theme_controller.dart';
import '../../shared/format.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/loading_skeleton.dart';
import '../auth/auth_controller.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late bool _stockLow;
  late bool _stockZero;
  late bool _reorderSuggestion;
  late bool _creditOver;
  late bool _creditIncrease;
  late bool _digestEnabled;
  late bool _pushEnabled;
  late bool _whatsAppEnabled;
  late String _digestFrequency;
  late int _digestWeekday;

  final _threshold = TextEditingController();
  final _digestTime = TextEditingController();
  bool _saving = false;
  String? _error;
  String _version = '';

  @override
  void initState() {
    super.initState();
    final settings = ref.read(authControllerProvider).data?.settings;
    _stockLow = settings?.stockLowEnabled ?? true;
    _stockZero = settings?.stockZeroEnabled ?? false;
    _reorderSuggestion = settings?.reorderSuggestionEnabled ?? false;
    _creditOver = settings?.creditOverEnabled ?? false;
    _creditIncrease = settings?.creditIncreaseEnabled ?? false;
    _digestEnabled = settings?.digestEnabled ?? false;
    _pushEnabled = settings?.pushEnabled ?? true;
    _whatsAppEnabled = settings?.whatsAppEnabled ?? true;
    _digestFrequency = settings?.digestFrequency ?? 'daily';
    _digestWeekday = settings?.digestWeekday ?? 6;
    _threshold.text = (settings?.creditIncreaseThreshold ?? 0).toStringAsFixed(
      0,
    );
    _digestTime.text = settings?.digestTimeOfDay ?? '08:00';

    PackageInfo.fromPlatform().then<void>((info) {
      if (mounted) {
        setState(() => _version = '${info.version}+${info.buildNumber}');
      }
    }).catchError((Object _) {});
  }

  @override
  void dispose() {
    _threshold.dispose();
    _digestTime.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_stockLow && !_stockZero && !_creditOver && !_creditIncrease) {
      setState(() => _error = 'لازم تفعّل نوع تنبيه واحد على الأقل');
      return;
    }
    if (!RegExp(r'^([01]\d|2[0-3]):([0-5]\d)$')
        .hasMatch(_digestTime.text.trim())) {
      setState(() => _error = 'وقت الملخص لازم يكون بصيغة HH:MM');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    final ok = await ref.read(authControllerProvider.notifier).saveSettings({
      'stockLowEnabled': _stockLow,
      'stockZeroEnabled': _stockZero,
      'reorderSuggestionEnabled': _reorderSuggestion,
      'creditOverEnabled': _creditOver,
      'creditIncreaseEnabled': _creditIncrease,
      'creditIncreaseThreshold': double.tryParse(_threshold.text.trim()) ?? 0,
      'digestEnabled': _digestEnabled,
      'digestFrequency': _digestFrequency,
      'digestTimeOfDay': _digestTime.text.trim(),
      'digestWeekday': _digestWeekday,
      'timeZone': 'Africa/Cairo',
      'pushEnabled': _pushEnabled,
      'whatsAppEnabled': _whatsAppEnabled,
    });

    if (!mounted) return;
    setState(() => _saving = false);
    if (ok) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('تم حفظ إعدادات التنبيهات')));
    } else {
      setState(
        () => _error = ref.read(authControllerProvider).error ?? 'فشل الحفظ',
      );
    }
  }

  Future<void> _pickTime() async {
    final parts = _digestTime.text.split(':');
    final initial = TimeOfDay(
      hour: int.tryParse(parts.isNotEmpty ? parts[0] : '8') ?? 8,
      minute: int.tryParse(parts.length > 1 ? parts[1] : '0') ?? 0,
    );
    final picked = await showTimePicker(
      context: context,
      initialTime: initial,
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() {
        _digestTime.text =
            '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final themeMode = ref.watch(themeControllerProvider);
    final data = ref.watch(authControllerProvider).data;

    if (data == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('الإعدادات')),
        body: const Padding(
          padding: EdgeInsets.all(20),
          child: LoadingSkeleton(rows: 3),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('الإعدادات')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          const _SectionTitle(title: 'المظهر'),
          AppCard(
            padding: EdgeInsets.zero,
            child: SwitchListTile.adaptive(
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 4,
              ),
              title: Text(
                'الوضع الداكن',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 13,
                  color: palette.ink,
                ),
              ),
              subtitle: Text(
                'ثيم كامل، مش مجرد تغيير لون الخلفية',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 11,
                  color: palette.muted,
                ),
              ),
              value: themeMode == ThemeMode.dark,
              activeThumbColor: palette.primary,
              onChanged: (_) =>
                  ref.read(themeControllerProvider.notifier).toggle(),
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
          const _SectionTitle(title: 'تنبيهات المخزون'),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _switchTile(
                  title: 'نقص المخزون',
                  subtitle: 'لما الرصيد يوصل لحد إعادة الطلب',
                  value: _stockLow,
                  onChanged: (value) => setState(() => _stockLow = value),
                ),
                Divider(color: palette.border, height: 1),
                _switchTile(
                  title: 'نفاد تام',
                  subtitle: 'لما رصيد الصنف يوصل صفر',
                  value: _stockZero,
                  onChanged: (value) => setState(() => _stockZero = value),
                ),
                Divider(color: palette.border, height: 1),
                _switchTile(
                  title: 'اقتراحات إعادة الطلب',
                  subtitle: 'كمية مقترحة بناءً على الحد والرصيد',
                  value: _reorderSuggestion,
                  onChanged: (value) =>
                      setState(() => _reorderSuggestion = value),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
          const _SectionTitle(title: 'تنبيهات الائتمان'),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _switchTile(
                  title: 'تجاوز الحد الائتماني',
                  subtitle: 'تنبيه عند أول تجاوز',
                  value: _creditOver,
                  onChanged: (value) => setState(() => _creditOver = value),
                ),
                Divider(color: palette.border, height: 1),
                _switchTile(
                  title: 'تزايد التجاوز',
                  subtitle: 'تنبيه لما المديونية تزيد عن آخر تنبيه',
                  value: _creditIncrease,
                  onChanged: (value) => setState(() => _creditIncrease = value),
                ),
                Divider(color: palette.border, height: 1),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                  child: TextField(
                    controller: _threshold,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'حد الزيادة (جنيه)',
                      hintText: '0 = أي زيادة',
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
          const _SectionTitle(title: 'الملخص الدوري'),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _switchTile(
                  title: 'ملخص دوري',
                  subtitle: 'إشعار مجمّع بالحالات المفتوحة',
                  value: _digestEnabled,
                  onChanged: (value) => setState(() => _digestEnabled = value),
                ),
                if (_digestEnabled) ...[
                  Divider(color: palette.border, height: 1),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                    child: Row(
                      children: [
                        ChoiceChip(
                          label: const Text('يومي'),
                          selected: _digestFrequency == 'daily',
                          onSelected: (_) =>
                              setState(() => _digestFrequency = 'daily'),
                        ),
                        const SizedBox(width: 8),
                        ChoiceChip(
                          label: const Text('أسبوعي'),
                          selected: _digestFrequency == 'weekly',
                          onSelected: (_) =>
                              setState(() => _digestFrequency = 'weekly'),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                    child: TextField(
                      controller: _digestTime,
                      readOnly: true,
                      onTap: _pickTime,
                      decoration: const InputDecoration(
                        labelText: 'وقت الإرسال',
                        suffixIcon: Icon(Icons.schedule_rounded),
                      ),
                    ),
                  ),
                  if (_digestFrequency == 'weekly')
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      child: DropdownButtonFormField<int>(
                        initialValue: _digestWeekday,
                        decoration: const InputDecoration(
                          labelText: 'يوم الأسبوع',
                        ),
                        items: [
                          for (var day = 0; day < 7; day++)
                            DropdownMenuItem(
                              value: day,
                              child: Text(weekdayLabel(day)),
                            ),
                        ],
                        onChanged: (value) =>
                            setState(() => _digestWeekday = value ?? 6),
                      ),
                    ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
          const _SectionTitle(title: 'قنوات الإرسال'),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _switchTile(
                  title: 'إشعارات التطبيق (Push)',
                  subtitle: 'توصلك حتى لو التطبيق مقفول',
                  value: _pushEnabled,
                  onChanged: (value) => setState(() => _pushEnabled = value),
                ),
                Divider(color: palette.border, height: 1),
                _switchTile(
                  title: 'واتساب',
                  subtitle: 'رسالة على أرقام الواتساب المسجلة',
                  value: _whatsAppEnabled,
                  onChanged: (value) =>
                      setState(() => _whatsAppEnabled = value),
                ),
              ],
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: AppSpacing.md),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: palette.dangerSoft,
                borderRadius: BorderRadius.circular(AppRadii.panel),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.error_outline_rounded,
                    size: 18,
                    color: palette.danger,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _error!,
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        color: palette.danger,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.lg),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('حفظ الإعدادات'),
          ),
          const SizedBox(height: AppSpacing.xxl),
          const _SectionTitle(title: 'الحساب'),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.person_outline_rounded,
                      color: palette.muted,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        data.client.name,
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: palette.ink,
                        ),
                      ),
                    ),
                    AppBadge(
                      label: _version.isEmpty ? 'v1.0.0' : 'v$_version',
                      variant: BadgeVariant.neutral,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                OutlinedButton.icon(
                  onPressed: _saving
                      ? null
                      : () async {
                          await ref
                              .read(authControllerProvider.notifier)
                              .logout();
                        },
                  icon: Icon(
                    Icons.logout_rounded,
                    size: 18,
                    color: palette.danger,
                  ),
                  label: Text(
                    'تسجيل الخروج',
                    style: TextStyle(color: palette.danger),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _switchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    final palette = context.palette;
    return SwitchListTile.adaptive(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      title: Text(
        title,
        style: TextStyle(fontFamily: 'Cairo', fontSize: 13, color: palette.ink),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(
          fontFamily: 'Cairo',
          fontSize: 11,
          color: palette.muted,
        ),
      ),
      value: value,
      activeThumbColor: palette.primary,
      onChanged: onChanged,
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Text(
        title,
        style: TextStyle(
          fontFamily: 'Cairo',
          fontSize: 15,
          fontWeight: FontWeight.w700,
          color: context.palette.ink,
        ),
      ),
    );
  }
}
