"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Settings2, Trash2, Pencil, X } from "lucide-react";

type UserRole = "ADMIN" | "AGENT";

type Category = { id: string; name: string; sortOrder: number; _count?: { products: number } };

type Product = {
  id: string;
  name: string;
  code: string | null;
  price: number;
  isActive: boolean;
  categoryId: string;
  category?: { id: string; name: string };
  updatedAt?: string;
};

type MeResponse = { authenticated?: boolean; role?: UserRole };

type CategoryFormState = { name: string; sortOrder: string };

type ProductFormState = { name: string; code: string; price: string; categoryId: string; isActive: boolean };

const ModalShell = ({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-60">
      <div className="absolute inset-0 bg-slate-900/35" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl ui-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-black">{title}</div>
            <button type="button" onClick={onClose} className="h-9 w-9 rounded-xl border ui-btn">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default function AdminProductsPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const attr = document.documentElement.getAttribute("data-theme");
    const saved = localStorage.getItem("expense-tracker-theme");
    const resolved = attr === "dark" || (attr !== "light" && saved === "dark");
    const timeout = setTimeout(() => setIsDark(resolved), 0);
    return () => clearTimeout(timeout);
  }, []);

  const [allowed, setAllowed] = useState<boolean | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({ name: "", sortOrder: "0" });
  const [categorySaving, setCategorySaving] = useState(false);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>({
    name: "",
    code: "",
    price: "0",
    categoryId: "",
    isActive: true,
  });
  const [productSaving, setProductSaving] = useState(false);

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          setAllowed(false);
          return;
        }
        const data = (await res.json()) as MeResponse;
        setAllowed(data.role === "ADMIN");
      } catch {
        setAllowed(false);
      }
    };
    void verify();
  }, []);

  const loadCategories = useCallback(async () => {
    setLoadingCats(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/product-categories", { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as { categories?: Category[]; message?: string } | null;
      if (!res.ok) throw new Error(payload?.message || "Không tải được category.");
      const next = Array.isArray(payload?.categories) ? payload?.categories : [];
      setCategories(next);
      if (!activeCategoryId && next.length > 0) setActiveCategoryId(next[0].id);
      if (activeCategoryId && !next.some((c) => c.id === activeCategoryId) && next.length > 0) setActiveCategoryId(next[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setCategories([]);
    } finally {
      setLoadingCats(false);
    }
  }, [activeCategoryId]);

  const loadProducts = useCallback(async () => {
    if (!activeCategoryId) {
      setProducts([]);
      return;
    }
    setLoadingProducts(true);
    setError(null);
    try {
      const q = searchQuery.trim();
      const url = new URL("/api/admin/products", window.location.origin);
      url.searchParams.set("categoryId", activeCategoryId);
      if (q) url.searchParams.set("q", q);
      const res = await fetch(url.toString(), { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as { products?: Product[]; message?: string } | null;
      if (!res.ok) throw new Error(payload?.message || "Không tải được mặt hàng.");
      setProducts(Array.isArray(payload?.products) ? payload?.products : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [activeCategoryId, searchQuery]);

  useEffect(() => {
    if (allowed !== true) return;
    const timeout = setTimeout(() => {
      void loadCategories();
    }, 0);
    return () => clearTimeout(timeout);
  }, [allowed, loadCategories]);

  useEffect(() => {
    if (allowed !== true) return;
    const timeout = setTimeout(() => {
      void loadProducts();
    }, 0);
    return () => clearTimeout(timeout);
  }, [allowed, loadProducts]);

  const activeCategory = useMemo(() => categories.find((c) => c.id === activeCategoryId) || null, [categories, activeCategoryId]);

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: "", sortOrder: "0" });
    setCategoryModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, sortOrder: String(cat.sortOrder ?? 0) });
    setCategoryModalOpen(true);
  };

  const saveCategory = async () => {
    const name = categoryForm.name.trim();
    const sortOrder = Number(categoryForm.sortOrder);
    if (!name) {
      setError("Vui lòng nhập tên Category.");
      return;
    }

    setCategorySaving(true);
    setError(null);
    try {
      const isEdit = Boolean(editingCategory?.id);
      const url = isEdit ? `/api/admin/product-categories/${editingCategory?.id}` : "/api/admin/product-categories";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0 }),
      });
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(payload?.message || "Không lưu được category.");
      setCategoryModalOpen(false);
      await loadCategories();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setCategorySaving(false);
    }
  };

  const deleteCategory = async (cat: Category) => {
    if (!window.confirm(`Xoá category "${cat.name}"? Các mặt hàng thuộc nhóm này sẽ bị xoá theo.`)) return;

    setError(null);
    try {
      const res = await fetch(`/api/admin/product-categories/${cat.id}`, { method: "DELETE" });
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(payload?.message || "Không xoá được category.");
      await loadCategories();
      await loadProducts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    }
  };

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: "", code: "", price: "0", categoryId: activeCategoryId, isActive: true });
    setProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      code: p.code ?? "",
      price: String(p.price ?? 0),
      categoryId: p.categoryId,
      isActive: p.isActive,
    });
    setProductModalOpen(true);
  };

  const saveProduct = async () => {
    const name = productForm.name.trim();
    const code = productForm.code.trim();
    const price = Number(productForm.price);
    const categoryId = productForm.categoryId;

    if (!name) {
      setError("Vui lòng nhập tên mặt hàng.");
      return;
    }
    if (!categoryId) {
      setError("Vui lòng chọn Category.");
      return;
    }

    setProductSaving(true);
    setError(null);
    try {
      const isEdit = Boolean(editingProduct?.id);
      const url = isEdit ? `/api/admin/products/${editingProduct?.id}` : "/api/admin/products";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          code: code || null,
          price: Number.isFinite(price) ? price : 0,
          categoryId,
          isActive: productForm.isActive,
        }),
      });
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(payload?.message || "Không lưu được mặt hàng.");
      setProductModalOpen(false);
      await loadProducts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setProductSaving(false);
    }
  };

  const deleteProduct = async (p: Product) => {
    if (!window.confirm(`Xoá mặt hàng "${p.name}"?`)) return;

    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, { method: "DELETE" });
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(payload?.message || "Không xoá được mặt hàng.");
      await loadProducts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    }
  };

  if (allowed === false) {
    return (
      <div className="px-1 py-1 md:px-2 md:py-2">
        <div className={`ui-card p-6 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          <div className="text-xl font-black">Không có quyền truy cập</div>
          <div className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            Trang này chỉ dành cho Admin.
          </div>
          <div className="mt-4">
            <button type="button" className="ui-btn" onClick={() => router.push("/admin/dashboard")}>Quay lại Admin</button>
          </div>
        </div>
      </div>
    );
  }

  if (allowed === null) {
    return (
      <div className="px-1 py-1 md:px-2 md:py-2">
        <div className={`ui-card p-6 ${isDark ? "text-slate-100" : "text-slate-900"}`}>Đang kiểm tra quyền...</div>
      </div>
    );
  }

  return (
    <div className="px-1 py-1 md:px-2 md:py-2">
      <div className={`ui-card p-6 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Quản lý mặt hàng</h1>
            <p className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Master data: Category & sản phẩm.</p>
          </div>

          <button
            type="button"
            onClick={openCreateProduct}
            className="h-10 px-4 rounded-2xl text-sm font-extrabold border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 transition inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Thêm mặt hàng mới
          </button>
        </div>

        {error && <div className="mt-4 text-sm text-rose-500">{error}</div>}

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3">
          <aside className="ui-card-soft p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-extrabold">Category</div>
              <button type="button" onClick={openCreateCategory} className="ui-btn">
                <Plus className="h-4 w-4" />
                Thêm
              </button>
            </div>

            <div className={`mt-3 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Chọn nhóm để lọc mặt hàng.
            </div>

            <div className="mt-3 space-y-2 max-h-120 overflow-y-auto ui-scrollbar pr-1">
              {loadingCats ? (
                <div className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Đang tải...</div>
              ) : categories.length === 0 ? (
                <div className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Chưa có category.</div>
              ) : (
                categories.map((c) => {
                  const active = c.id === activeCategoryId;
                  return (
                    <div key={c.id} className={`rounded-2xl border p-2 ${active ? "bg-indigo-500/10 border-indigo-500/30" : "bg-white/5"}`}>
                      <button
                        type="button"
                        onClick={() => setActiveCategoryId(c.id)}
                        className="w-full text-left"
                        title={c.name}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold truncate">{c.name}</div>
                            <div className={`text-xs mt-0.5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                              {c._count?.products ?? 0} mặt hàng
                            </div>
                          </div>
                        </div>
                      </button>

                      <div className="mt-2 flex items-center gap-2">
                        <button type="button" className="ui-btn" onClick={() => openEditCategory(c)} title="Edit">
                          <Pencil className="h-4 w-4" />
                          Sửa
                        </button>
                        <button type="button" className="ui-btn" onClick={() => deleteCategory(c)} title="Delete">
                          <Trash2 className="h-4 w-4" />
                          Xoá
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          <section className="ui-card-soft p-3 min-w-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-extrabold truncate">{activeCategory ? activeCategory.name : "Mặt hàng"}</div>
                <div className={`text-xs mt-0.5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>Tìm nhanh và quản lý sản phẩm theo nhóm.</div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ui-input pl-10"
                    placeholder="Tìm theo tên / mã..."
                  />
                </div>
                <button type="button" onClick={loadProducts} className="ui-btn" title="Search">
                  <Settings2 className="h-4 w-4" />
                  Lọc
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className={`text-left ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    <th className="py-2 pr-3">Tên</th>
                    <th className="py-2 pr-3">Mã</th>
                    <th className="py-2 pr-3">Giá</th>
                    <th className="py-2 pr-3">Trạng thái</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {loadingProducts ? (
                    <tr>
                      <td colSpan={5} className={`py-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                        Đang tải...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={`py-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                        Không có mặt hàng.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <tr key={p.id} className="border-t border-(--surface-border)">
                        <td className="py-3 pr-3 font-bold">{p.name}</td>
                        <td className="py-3 pr-3 text-xs opacity-80">{p.code || "-"}</td>
                        <td className="py-3 pr-3 font-semibold">{Number(p.price || 0).toLocaleString("vi-VN")} VND</td>
                        <td className="py-3 pr-3">
                          <span className={`inline-flex items-center h-7 px-2 rounded-xl border text-xs font-bold ${p.isActive ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700" : "bg-slate-500/10 border-slate-400/25 text-slate-600"}`}>
                            {p.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 pr-1">
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" className="ui-btn" onClick={() => openEditProduct(p)}>
                              <Pencil className="h-4 w-4" />
                              Edit
                            </button>
                            <button type="button" className="ui-btn" onClick={() => deleteProduct(p)}>
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {categoryModalOpen && (
        <ModalShell
          title={editingCategory ? "Sửa Category" : "Thêm Category"}
          onClose={() => {
            if (categorySaving) return;
            setCategoryModalOpen(false);
          }}
        >
          <div className="grid grid-cols-1 gap-3">
            <div>
              <div className="text-sm font-semibold">Tên</div>
              <input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
                className="ui-input w-full mt-1"
                placeholder="Ví dụ: Kháng sinh"
              />
            </div>
            <div>
              <div className="text-sm font-semibold">Sort order</div>
              <input
                value={categoryForm.sortOrder}
                onChange={(e) => setCategoryForm((p) => ({ ...p, sortOrder: e.target.value }))}
                className="ui-input w-full mt-1"
                inputMode="numeric"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" className="ui-btn" onClick={() => setCategoryModalOpen(false)} disabled={categorySaving}>
                Huỷ
              </button>
              <button
                type="button"
                onClick={saveCategory}
                disabled={categorySaving}
                className="h-10 px-4 rounded-2xl text-sm font-extrabold border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                Lưu
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {productModalOpen && (
        <ModalShell
          title={editingProduct ? "Sửa mặt hàng" : "Thêm mặt hàng"}
          onClose={() => {
            if (productSaving) return;
            setProductModalOpen(false);
          }}
        >
          <div className="grid grid-cols-1 gap-3">
            <div>
              <div className="text-sm font-semibold">Tên</div>
              <input
                value={productForm.name}
                onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                className="ui-input w-full mt-1"
                placeholder="Tên mặt hàng"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm font-semibold">Mã</div>
                <input
                  value={productForm.code}
                  onChange={(e) => setProductForm((p) => ({ ...p, code: e.target.value }))}
                  className="ui-input w-full mt-1"
                  placeholder="SKU / mã"
                />
              </div>
              <div>
                <div className="text-sm font-semibold">Giá (VND)</div>
                <input
                  value={productForm.price}
                  onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
                  className="ui-input w-full mt-1"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm font-semibold">Category</div>
                <select
                  value={productForm.categoryId}
                  onChange={(e) => setProductForm((p) => ({ ...p, categoryId: e.target.value }))}
                  className="ui-input w-full mt-1"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={productForm.isActive}
                  onChange={(e) => setProductForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                <label htmlFor="isActive" className="text-sm font-semibold">
                  Active
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" className="ui-btn" onClick={() => setProductModalOpen(false)} disabled={productSaving}>
                Huỷ
              </button>
              <button
                type="button"
                onClick={saveProduct}
                disabled={productSaving}
                className="h-10 px-4 rounded-2xl text-sm font-extrabold border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                Lưu
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
