'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Check, X } from 'lucide-react';

export type MasterProduct = {
  id: string;
  name: string;
  code?: string | null;
};

export type MasterProductCategory = {
  id: string;
  name: string;
  sortOrder?: number;
  products: MasterProduct[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  isDark?: boolean;
  selectedIds: string[];
  onConfirm: (selected: MasterProduct[]) => void;
};

export default function ProductPickerModal({ open, onClose, isDark = false, selectedIds, onConfirm }: Props) {
  const [categories, setCategories] = useState<MasterProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('__ALL__');
  const [draftSelected, setDraftSelected] = useState<string[]>(() => selectedIds);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const load = async () => {
      try {
        setLoading(true);
        const q = query.trim();
        const url = q ? `/api/master/products?q=${encodeURIComponent(q)}` : '/api/master/products';
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('failed');
        const data = (await res.json()) as { categories?: MasterProductCategory[] };
        if (!alive) return;
        setCategories(Array.isArray(data.categories) ? data.categories : []);
      } catch {
        if (!alive) return;
        setCategories([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const allProducts = useMemo(() => categories.flatMap((c) => c.products ?? []), [categories]);

  const visibleCategories = useMemo(() => {
    if (activeCategoryId === '__ALL__') return categories;
    return categories.filter((c) => c.id === activeCategoryId);
  }, [activeCategoryId, categories]);

  const selectedSet = useMemo(() => new Set(draftSelected), [draftSelected]);

  const selectedCount = draftSelected.length;

  const toggle = (id: string) => {
    setDraftSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  };

  const clearAll = () => setDraftSelected([]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60">
      <div
        className={`absolute inset-0 ${isDark ? 'bg-black/55' : 'bg-slate-900/35'}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={panelRef}
          className={`w-full max-w-4xl rounded-2xl border shadow-[0_24px_80px_rgba(0,0,0,0.45)] overflow-hidden ${
            isDark ? 'bg-slate-950/95 border-white/10 text-slate-100' : 'bg-white/95 border-white/70 text-slate-900'
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-slate-200/70'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-extrabold truncate">Chọn mặt hàng</div>
                <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Đã chọn: <span className="font-bold">{selectedCount}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearAll}
                  className={`h-9 px-3 rounded-xl text-xs font-bold border transition ${
                    isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/60 border-slate-200 hover:bg-white'
                  }`}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const byId = new Map<string, MasterProduct>();
                    for (const cat of categories) {
                      for (const p of cat.products ?? []) {
                        byId.set(p.id, p);
                      }
                    }
                    const selected = draftSelected
                      .map((id) => byId.get(id))
                      .filter(Boolean) as MasterProduct[];
                    onConfirm(selected);
                    onClose();
                  }}
                  className={`h-9 px-3 rounded-xl text-xs font-bold border transition ${
                    isDark
                      ? 'bg-emerald-500/15 border-emerald-400/25 text-emerald-200 hover:bg-emerald-500/20'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Xác nhận
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={`h-9 w-9 rounded-xl inline-flex items-center justify-center border transition ${
                    isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/60 border-slate-200 hover:bg-white'
                  }`}
                  aria-label="Đóng"
                  title="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`w-full h-10 rounded-xl pl-10 pr-3 text-sm font-semibold border outline-none ${
                  isDark ? 'bg-white/5 border-white/10 text-slate-100' : 'bg-white/70 border-slate-200 text-slate-900'
                }`}
                placeholder="Tìm mặt hàng..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] min-h-105">
            <div className={`border-r ${isDark ? 'border-white/10' : 'border-slate-200/70'} p-3`}
            >
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveCategoryId('__ALL__')}
                  className={`w-full text-left h-9 px-3 rounded-xl text-sm font-bold border transition ${
                    activeCategoryId === '__ALL__'
                      ? isDark
                        ? 'bg-white/10 border-white/15'
                        : 'bg-slate-900/5 border-slate-200'
                      : isDark
                        ? 'bg-white/5 border-white/10 hover:bg-white/10'
                        : 'bg-white/60 border-slate-200 hover:bg-white'
                  }`}
                >
                  Tất cả nhóm ({categories.length})
                </button>
                <div className="max-h-80 overflow-y-auto ui-scrollbar pr-1 space-y-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategoryId(cat.id)}
                      className={`w-full text-left h-9 px-3 rounded-xl text-sm font-semibold border transition ${
                        activeCategoryId === cat.id
                          ? isDark
                            ? 'bg-white/10 border-white/15'
                            : 'bg-slate-900/5 border-slate-200'
                          : isDark
                            ? 'bg-white/5 border-white/10 hover:bg-white/10'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                      }`}
                      title={cat.name}
                    >
                      <span className="truncate block">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3">
              {loading ? (
                <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Đang tải...</div>
              ) : (
                <div className="max-h-93 overflow-y-auto ui-scrollbar pr-1 space-y-4">
                  {visibleCategories.length === 0 && (
                    <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Không có mặt hàng.</div>
                  )}
                  {visibleCategories.map((cat) => (
                    <div key={cat.id}>
                      <div className={`text-xs font-extrabold tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {cat.name}
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(cat.products ?? []).map((p) => {
                          const checked = selectedSet.has(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggle(p.id)}
                              className={`h-10 rounded-xl border px-3 text-left flex items-center justify-between gap-2 transition ${
                                checked
                                  ? isDark
                                    ? 'bg-emerald-500/15 border-emerald-400/25'
                                    : 'bg-emerald-50 border-emerald-200'
                                  : isDark
                                    ? 'bg-white/5 border-white/10 hover:bg-white/10'
                                    : 'bg-white/60 border-slate-200 hover:bg-white'
                              }`}
                              title={p.name}
                            >
                              <div className="min-w-0">
                                <div className={`text-sm font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{p.name}</div>
                                {p.code && (
                                  <div className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{p.code}</div>
                                )}
                              </div>
                              <div
                                className={`h-6 w-6 rounded-lg border inline-flex items-center justify-center shrink-0 ${
                                  checked
                                    ? isDark
                                      ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-200'
                                      : 'bg-emerald-100 border-emerald-200 text-emerald-700'
                                    : isDark
                                      ? 'bg-white/5 border-white/10 text-slate-400'
                                      : 'bg-white/60 border-slate-200 text-slate-500'
                                }`}
                              >
                                <Check className="h-4 w-4" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {allProducts.length > 0 && (
                <div className={`mt-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Tip: Bạn có thể search theo tên hoặc mã.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
