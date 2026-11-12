import 'package:intl/intl.dart';

// الأرقام والتواريخ بتتعرض بأرقام لاتينية زي تقارير الـ ERP، مع الحفاظ على
// النص العربي. كمان استخدام en_US صراحةً بيشيل الاعتماد على تحميل بيانات
// الـ locale قبل أول DateFormat.
const _numericLocale = 'en_US';

String formatNumber(dynamic value) {
  final number = value is num ? value : num.tryParse('$value') ?? 0;
  if (number == number.roundToDouble()) {
    return NumberFormat('#,##0', _numericLocale).format(number);
  }
  return NumberFormat('#,##0.##', _numericLocale).format(number);
}

String formatMoney(dynamic value) {
  final number = value is num ? value : num.tryParse('$value') ?? 0;
  return NumberFormat('#,##0.00', _numericLocale).format(number);
}

String formatDateTime(DateTime? date) {
  if (date == null) return '-';
  return DateFormat(
    'yyyy/MM/dd - HH:mm',
    _numericLocale,
  ).format(date.toLocal());
}

String timeAgo(DateTime? date) {
  if (date == null) return '';
  final now = DateTime.now();
  final diff = now.difference(date.toLocal());
  if (diff.inMinutes < 1) return 'الآن';
  if (diff.inMinutes < 60) return 'منذ ${diff.inMinutes} دقيقة';
  if (diff.inHours < 24) return 'منذ ${diff.inHours} ساعة';
  if (diff.inDays == 1) return 'أمس';
  if (diff.inDays < 7) return 'منذ ${diff.inDays} أيام';
  return DateFormat('yyyy/MM/dd', _numericLocale).format(date.toLocal());
}

String weekdayLabel(int weekday) {
  const labels = [
    'الأحد',
    'الاثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
  ];
  if (weekday < 0 || weekday >= labels.length) return '';
  return labels[weekday];
}
