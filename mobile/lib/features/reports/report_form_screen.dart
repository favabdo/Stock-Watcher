import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/tokens.dart';
import '../../core/models/models.dart';
import '../../shared/widgets/app_card.dart';
import '../auth/auth_controller.dart';

class ReportFormScreen extends ConsumerStatefulWidget {
  const ReportFormScreen({super.key, required this.report});

  final ReportDefinition report;

  @override
  ConsumerState<ReportFormScreen> createState() => _ReportFormScreenState();
}

class _ReportFormScreenState extends ConsumerState<ReportFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, TextEditingController> _controllers = {};
  final Map<String, bool> _booleans = {};
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    for (final param in widget.report.params) {
      if (param.type == 'boolean' || param.type == 'bit') {
        _booleans[param.key] = false;
      } else {
        _controllers[param.key] = TextEditingController();
      }
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _run() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });

    final params = <String, dynamic>{};
    for (final param in widget.report.params) {
      if (param.type == 'boolean' || param.type == 'bit') {
        params[param.key] = _booleans[param.key] ?? false;
        continue;
      }
      final value = _controllers[param.key]?.text.trim() ?? '';
      if (value.isNotEmpty) params[param.key] = value;
    }

    try {
      final json = await ref.read(apiClientProvider).post(
        '/api/mobile/v1/reports/${widget.report.id}/run',
        data: {'params': params},
      );
      final result = ReportResult.fromJson(json);
      if (!mounted) return;
      context.push('/reports/result', extra: result);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final report = widget.report;

    return Scaffold(
      appBar: AppBar(title: Text(report.name)),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
          children: [
            AppCard(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: palette.primarySoft,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.description_rounded,
                      color: palette.primary,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Text(
                      report.description,
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12.5,
                        height: 1.6,
                        color: palette.body,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            if (report.params.isEmpty)
              AppCard(
                child: Row(
                  children: [
                    Icon(
                      Icons.check_circle_outline_rounded,
                      color: palette.teal,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'التقرير ده مش محتاج أي معاملات. اضغط "عرض التقرير" مباشرة.',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 12,
                          color: palette.body,
                        ),
                      ),
                    ),
                  ],
                ),
              )
            else
              AppCard(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'معاملات التقرير',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: palette.ink,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    for (final param in report.params) ...[
                      if (param.type == 'boolean' || param.type == 'bit')
                        SwitchListTile.adaptive(
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            param.label,
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 13,
                              color: palette.ink,
                            ),
                          ),
                          value: _booleans[param.key] ?? false,
                          activeThumbColor: palette.primary,
                          onChanged: (value) =>
                              setState(() => _booleans[param.key] = value),
                        )
                      else
                        Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.md),
                          child: TextFormField(
                            controller: _controllers[param.key],
                            keyboardType: param.type == 'bigint' ||
                                    param.type == 'int' ||
                                    param.type == 'decimal'
                                ? TextInputType.number
                                : TextInputType.text,
                            decoration: InputDecoration(
                              labelText: param.label,
                              hintText: param.placeholder,
                            ),
                            validator: (value) {
                              if (param.required &&
                                  (value == null || value.trim().isEmpty)) {
                                return 'القيمة مطلوبة';
                              }
                              if (value != null &&
                                  value.trim().isNotEmpty &&
                                  (param.type == 'bigint' ||
                                      param.type == 'int' ||
                                      param.type == 'decimal')) {
                                return num.tryParse(value.trim()) == null
                                    ? 'لازم يكون رقم'
                                    : null;
                              }
                              return null;
                            },
                          ),
                        ),
                    ],
                  ],
                ),
              ),
            if (_error != null) ...[
              const SizedBox(height: AppSpacing.md),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: palette.dangerSoft,
                  borderRadius: BorderRadius.circular(AppRadii.panel),
                ),
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
            const SizedBox(height: AppSpacing.xl),
            FilledButton.icon(
              onPressed: _loading ? null : _run,
              icon: _loading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.play_arrow_rounded, size: 20),
              label: Text(_loading ? 'جارٍ تجهيز التقرير...' : 'عرض التقرير'),
            ),
          ],
        ),
      ),
    );
  }
}
