import 'dart:async';

import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';

import '../config/env.dart';
import '../storage/token_store.dart';
import 'api_exception.dart';

class ApiClient {
  ApiClient(this._store) {
    _dio = Dio(
      BaseOptions(
        baseUrl: Env.apiBase,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 45),
        headers: const {'Accept': 'application/json'},
      ),
    );
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _store.readAccess();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final request = error.requestOptions;
          final isAuthCall = request.path.contains('/api/mobile/v1/auth/');
          final alreadyRetried = request.extra['retried'] == true;

          if (error.response?.statusCode == 401 &&
              !isAuthCall &&
              !alreadyRetried) {
            final refreshed = await _refreshTokens();
            if (refreshed) {
              final token = await _store.readAccess();
              final options = Options(
                method: request.method,
                headers: {...request.headers, 'Authorization': 'Bearer $token'},
                responseType: request.responseType,
                contentType: request.contentType,
                extra: {...request.extra, 'retried': true},
              );
              try {
                final response = await _dio.request<dynamic>(
                  request.path,
                  data: request.data,
                  queryParameters: request.queryParameters,
                  options: options,
                );
                return handler.resolve(response);
              } catch (retryError) {
                return handler.next(
                  retryError is DioException ? retryError : error,
                );
              }
            }
            onSessionExpired?.call();
          }

          handler.next(error);
        },
      ),
    );
  }

  final TokenStore _store;
  late final Dio _dio;
  Future<bool>? _refreshing;

  void Function()? onSessionExpired;

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    try {
      final response = await _dio.get<dynamic>(path, queryParameters: query);
      return _asMap(response.data);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<List<dynamic>> getList(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    try {
      final response = await _dio.get<dynamic>(path, queryParameters: query);
      return response.data is List ? response.data as List : const [];
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Map<String, dynamic>> post(String path, {Object? data}) async {
    try {
      final response = await _dio.post<dynamic>(path, data: data);
      return _asMap(response.data);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Map<String, dynamic>> put(String path, {Object? data}) async {
    try {
      final response = await _dio.put<dynamic>(path, data: data);
      return _asMap(response.data);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Map<String, dynamic>> patch(String path, {Object? data}) async {
    try {
      final response = await _dio.patch<dynamic>(path, data: data);
      return _asMap(response.data);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<void> delete(String path) async {
    try {
      await _dio.delete<dynamic>(path);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<String> downloadXlsx(String path, {Object? data}) async {
    final directory = await getTemporaryDirectory();
    final filePath =
        '${directory.path}/stockwatcher-${DateTime.now().millisecondsSinceEpoch}.xlsx';
    try {
      await _dio.download(
        path,
        filePath,
        data: data,
        options: Options(method: 'POST', contentType: Headers.jsonContentType),
      );
      return filePath;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<bool> _refreshTokens() {
    final inFlight = _refreshing;
    if (inFlight != null) return inFlight;

    final future = _doRefresh();
    _refreshing = future;
    future.whenComplete(() => _refreshing = null);
    return future;
  }

  Future<bool> _doRefresh() async {
    final refresh = await _store.readRefresh();
    if (refresh == null || refresh.isEmpty) return false;

    try {
      final deviceId = await _store.deviceId();
      final plain = Dio(BaseOptions(baseUrl: Env.apiBase));
      final response = await plain.post<dynamic>(
        '/api/mobile/v1/auth/refresh',
        data: {'refreshToken': refresh, 'deviceId': deviceId},
      );
      final data = _asMap(response.data);
      final access = data['accessToken']?.toString();
      final nextRefresh = data['refreshToken']?.toString();
      if (access == null || nextRefresh == null) return false;
      await _store.saveTokens(access: access, refresh: nextRefresh);
      return true;
    } catch (_) {
      await _store.clear();
      return false;
    }
  }

  static Map<String, dynamic> _asMap(dynamic data) {
    if (data is Map) return data.cast<String, dynamic>();
    return const {};
  }
}
