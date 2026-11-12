import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../app/theme/tokens.dart';
import '../../core/models/models.dart';
import '../../shared/format.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/empty_state.dart';
import '../auth/auth_controller.dart';

class ReportResultScreen extends ConsumerStatefulWidget {
  const ReportResultScreen({super.key, required this.result});

  final ReportResult result;

  @override
  ConsumerState<ReportResultScreen> createState() => _ReportResultScreenState();
}

class _ReportResultScreenState extends ConsumerState<ReportResultScreen> {
  bool _exporting = false;

  Future<void> _exportXlsx() async {
    setState(() => _exporting = true);
    try {
      final path = await ref.read(apiClientProvider).downloadXlsx(
        '/api/mobile/v1/reports/${widget.result.reportId}/export',
        data: {'params': widget.result.params},
      );
      await Share.shareXFiles([
        XFile(
          path,
          mimeType:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ),
      ], text: widget.result.reportName);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('تعذّر تصدير الملف: $error')));
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final result = widget.result;

    return Scaffold(
      appBar: AppBar(
        title: Text(result.reportName),
        actions: [
          IconButton(
            tooltip: 'تصدير Excel',
            onPressed: _exporting ? null : _exportXlsx,
            icon: _exporting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.file_download_outlined),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
        children: [
          AppCard(
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: palette.tealSoft,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.table_chart_rounded,
                    color: palette.teal,
                    size: 20,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${result.rowCount} صف',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: palette.ink,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'تم التجهيز ${formatDateTime(result.generatedAt)}',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 11,
                          color: palette.muted,
                        ),
                      ),
                    ],
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: _exporting ? null : _exportXlsx,
                  icon: const Icon(Icons.download_rounded, size: 18),
                  label: const Text('Excel'),
                ),
              ],
            ),
          ),
          if (result.truncated) ...[
            const SizedBox(height: AppSpacing.md),
            _Notice(
              icon: Icons.warning_amber_rounded,
              color: palette.warning,
              background: palette.warningSoft,
              text:
                  'النتائج كبيرة وتم عرض أول جزء منها فقط. ضيّق المعاملات لو محتاج كل الصفوف.',
            ),
          ],
          if (result.totals != null) ...[
            const SizedBox(height: AppSpacing.md),
            AppCard(
              child: Wrap(
                spacing: AppSpacing.xl,
                runSpacing: AppSpacing.md,
                children: [
                  for (final entry in result.totals!.entries)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _totalLabel(result, entry.key),
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 11,
                            color: palette.muted,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          formatMoney(entry.value),
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: palette.ink,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.lg),
          if (result.rows.isEmpty)
            const EmptyState(
              icon: Icons.inbox_outlined,
              title: 'مفيش بيانات',
              description: 'التقرير رجع بدون صفوف بالمعاملات الحالية.',
            )
          else
            LayoutBuilder(
              builder: (context, constraints) {
                if (constraints.maxWidth >= 640) {
                  return _WideTable(result: result);
                }
                return _NarrowCards(result: result);
              },
            ),
        ],
      ),
    );
  }

  String _totalLabel(ReportResult result, String key) {
    for (final column in result.columns) {
      if (column.key == key) return column.label;
    }
    return key;
  }
}

class _WideTable extends StatelessWidget {
  const _WideTable({required this.result});

  final ReportResult result;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        headingRowColor: WidgetStatePropertyAll(context.palette.surfaceSubtle),
        columns: [
          for (final column in result.columns)
            DataColumn(label: Text(column.label)),
        ],
        rows: [
          for (final row in result.rows)
            DataRow(
              cells: [
                for (final column in result.columns)
                  DataCell(Text(_formatValue(column, row[column.key]))),
              ],
            ),
        ],
      ),
    );
  }
}

class _NarrowCards extends StatelessWidget {
  const _NarrowCards({required this.result});

  final ReportResult result;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Column(
      children: [
        for (var index = 0; index < result.rows.length; index++)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.md),
            child: AppCard(
              child: Column(
                children: [
                  Row(
                    children: [
                      Text(
                        'صف ${index + 1}',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: palette.muted,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  for (final column in result.columns)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              column.label,
                              style: TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 11,
                                color: palette.muted,
                              ),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: Text(
                              _formatValue(
                                column,
                                result.rows[index][column.key],
                              ),
                              textAlign: TextAlign.end,
                              style: TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: palette.ink,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({
    required this.icon,
    required this.color,
    required this.background,
    required this.text,
  });

  final IconData icon;
  final Color color;
  final Color background;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(AppRadii.panel),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 11.5,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String _formatValue(ReportColumn column, dynamic value) {
  if (value == null || value == '') return '-';
  switch (column.type) {
    case 'decimal':
      return formatMoney(value);
    case 'number':
      return formatNumber(value);
    case 'boolean':
      return (value == true || value == 1 || value == 'true') ? 'نعم' : 'لا';
    default:
      return '$value';
  }
}
