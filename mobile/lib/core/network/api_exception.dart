import 'package:dio/dio.dart';

class ApiException implements Exception {
  const ApiException(this.message, {this.code, this.status});

  final String message;
  final String? code;
  final int? status;

  factory ApiException.fromDio(DioException error) {
    final response = error.response;
    final data = response?.data;

    if (data is Map) {
      final message = data['error'] ?? data['message'];
      if (message is String && message.isNotEmpty) {
        return ApiException(
          message,
          code: data['code']?.toString(),
          status: response?.statusCode,
        );
      }
    }

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const ApiException('الاتصال بالسيرفر بطيء. جرّب تاني.');
      case DioExceptionType.connectionError:
        return const ApiException('تعذّر الاتصال بالسيرفر. اتأكد من الإنترنت.');
      case DioExceptionType.cancel:
        return const ApiException('تم إلغاء الطلب.');
      default:
        return ApiException(
          'حصل خطأ غير متوقع (${response?.statusCode ?? 'شبكة'}).',
          status: response?.statusCode,
        );
    }
  }

  @override
  String toString() => message;
}
