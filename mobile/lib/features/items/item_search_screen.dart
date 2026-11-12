import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/tokens.dart';
import '../../core/models/models.dart';
import '../../core/network/api_exception.dart';
import '../../shared/format.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/loading_skeleton.dart';
import '../auth/auth_controller.dart';

class ItemSearchScreen extends ConsumerStatefulWidget {
  const ItemSearchScreen({super.key});

  @override
  ConsumerState<ItemSearchScreen> createState() => _ItemSearchScreenState();
}

class _ItemSearchScreenState extends ConsumerState<ItemSearchScreen> {
  final _controller = TextEditingController();
  final _focus = FocusNode();

  Timer? _debounce;
  int _requestSeq = 0;
  bool _loading = false;
  String? _error;
  List<ItemSummary> _results = const [];
  String _submitted = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _focus.requestFocus());
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    final term = value.trim();
    if (term.isEmpty) {
      setState(() {
        _results = const [];
        _error = null;
        _loading = false;
        _submitted = '';
      });
      return;
    }
    setState(() {});
    _debounce = Timer(const Duration(milliseconds: 320), () => _search(term));
  }

  Future<void> _search(String term) async {
    final seq = ++_requestSeq;
    setState(() {
      _loading = true;
      _error = null;
      _submitted = term;
    });

    try {
      final api = ref.read(apiClientProvider);
      final rows = await api.getList('/api/items/search', query: {'q': term});
      if (!mounted || seq != _requestSeq) return;
      setState(() {
        _results = rows
            .map(
              (row) =>
                  ItemSummary.fromJson((row as Map).cast<String, dynamic>()),
            )
            .toList();
        _loading = false;
      });
    } catch (error) {
      if (!mounted || seq != _requestSeq) return;
      setState(() {
        _error = error is ApiException
            ? error.message
            : 'حصل خطأ في البحث، جرّب تاني';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;

    return Scaffold(
      appBar: AppBar(title: const Text('بحث عن صنف')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
            child: TextField(
              controller: _controller,
              focusNode: _focus,
              textInputAction: TextInputAction.search,
              onChanged: _onChanged,
              onSubmitted: (value) {
                _debounce?.cancel();
                final term = value.trim();
                if (term.isNotEmpty) _search(term);
              },
              decoration: InputDecoration(
                hintText: 'اكتب كود الصنف أو اسمه',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _controller.text.isEmpty
                    ? null
                    : IconButton(
                        tooltip: 'مسح',
                        onPressed: () {
                          _controller.clear();
                          _onChanged('');
                        },
                        icon: const Icon(Icons.close_rounded),
                      ),
              ),
            ),
          ),
          Expanded(child: _buildBody(palette)),
        ],
      ),
    );
  }

  Widget _buildBody(AppPalette palette) {
    if (_loading && _results.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(20),
        child: LoadingSkeleton(rows: 3),
      );
    }

    if (_error != null) {
      return SingleChildScrollView(
        child: ErrorState(
          message: _error!,
          onRetry: _submitted.isEmpty ? null : () => _search(_submitted),
        ),
      );
    }

    if (_submitted.isEmpty) {
      return const EmptyState(
        icon: Icons.manage_search_rounded,
        title: 'ابحث بالكود أو الاسم',
        description:
            'اكتب كود الصنف بالكامل لمطابقة دقيقة، أو جزء من الاسم العربي أو الإنجليزي.',
      );
    }

    if (_results.isEmpty) {
      return EmptyState(
        icon: Icons.search_off_rounded,
        title: 'مفيش نتائج',
        description:
            'مفيش صنف مطابق لـ "$_submitted". جرّب كلمة تانية أو كود مختلف.',
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
      itemCount: _results.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) {
        final item = _results[index];
        return AppCard(
          onTap: () => context.push('/items/${item.id}'),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: palette.primarySoft,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.inventory_2_rounded,
                  size: 20,
                  color: palette.primary,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: palette.ink,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.code,
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 11,
                        color: palette.muted,
                      ),
                    ),
                  ],
                ),
              ),
              AppBadge(
                label: 'الحد ${formatNumber(item.reorderQty)}',
                variant: BadgeVariant.neutral,
              ),
              const SizedBox(width: 4),
              Icon(Icons.chevron_left_rounded, color: palette.muted),
            ],
          ),
        );
      },
    );
  }
}
