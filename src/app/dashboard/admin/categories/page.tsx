"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import s from "./admin-categories.module.css";

interface CategoryRow {
  id: string;
  name: string;
  description: string;
  productCount: number;
  maxDiscount?: number;
}

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  listPrice: number;
  unitCost: number;
  billingType: string;
  taxRate?: number;
  minimumMargin?: number;
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Category discount percentage edits { [catIdOrName]: string }
  const [discountInputs, setDiscountInputs] = useState<Record<string, string>>({});
  const [savingDiscounts, setSavingDiscounts] = useState<Record<string, boolean>>({});

  // Category creation form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Products under category view / manage modal
  const [activeCategory, setActiveCategory] = useState<CategoryRow | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<ProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Add / Edit Product modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodSku, setProdSku] = useState("");
  const [prodCategory, setProdCategory] = useState("");
  const [prodListPrice, setProdListPrice] = useState("1000");
  const [prodUnitCost, setProdUnitCost] = useState("700");
  const [prodBillingType, setProdBillingType] = useState("ONE_TIME");
  const [prodTaxRate, setProdTaxRate] = useState("18.0");
  const [prodMinMargin, setProdMinMargin] = useState("10.0");

  const fetchCategories = useCallback(async () => {
    try {
      const [catRes, govRes] = await Promise.all([
        fetch("/api/catalog/categories"),
        fetch("/api/governance/categories"),
      ]);

      if (catRes.status === 401 || govRes.status === 401) {
        router.push("/login");
        return;
      }

      const catJson = await catRes.json();
      const govJson = await govRes.json();

      const govLimits: Record<string, number> = {};
      if (govJson.success && Array.isArray(govJson.data)) {
        govJson.data.forEach((g: any) => {
          govLimits[g.categoryName.toLowerCase()] = Number(g.maximumDiscount);
          govLimits[g.categoryId] = Number(g.maximumDiscount);
        });
      }

      if (catJson.success && Array.isArray(catJson.data)) {
        const dMap: Record<string, string> = {};
        const enriched = catJson.data.map((cat: CategoryRow) => {
          const discount = govLimits[cat.name.toLowerCase()] ?? govLimits[cat.id] ?? 15.0;
          dMap[cat.id] = String(discount);
          return {
            ...cat,
            maxDiscount: discount,
          };
        });
        setCategories(enriched);
        setDiscountInputs(dMap);
      }
    } catch {
      setToast({ message: "Failed to load categories.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSaveDiscount = async (cat: CategoryRow) => {
    const rawVal = discountInputs[cat.id];
    const val = parseFloat(rawVal);
    if (isNaN(val) || val < 0 || val > 100) {
      setToast({ message: "Please enter a valid discount percentage between 0 and 100.", type: "error" });
      return;
    }

    setSavingDiscounts((prev) => ({ ...prev, [cat.id]: true }));
    try {
      const res = await fetch("/api/governance/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: cat.id,
          maximumDiscount: val,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update discount percentage.");
      }

      setToast({
        message: `Updated max discount ceiling for "${cat.name}" to ${val}%.`,
        type: "success",
      });

      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, maxDiscount: val } : c))
      );
    } catch (err: any) {
      setToast({ message: err.message || "Failed to update discount.", type: "error" });
    } finally {
      setSavingDiscounts((prev) => ({ ...prev, [cat.id]: false }));
    }
  };

  // Load products for selected category
  const loadCategoryProducts = async (cat: CategoryRow) => {
    setActiveCategory(cat);
    setLoadingProducts(true);
    try {
      const res = await fetch(`/api/catalog/products?category=${encodeURIComponent(cat.name)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCategoryProducts(json.data);
      } else {
        setCategoryProducts([]);
      }
    } catch {
      setToast({ message: "Failed to fetch products for " + cat.name, type: "error" });
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/catalog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setToast({ message: json.error?.message || "Failed to create category.", type: "error" });
        return;
      }

      setToast({ message: `Category "${name.trim()}" created successfully!`, type: "success" });
      setName("");
      setDescription("");
      await fetchCategories();
    } catch {
      setToast({ message: "Network error. Please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const openAddProductModal = (categoryName?: string) => {
    setEditingProduct(null);
    setProdName("");
    setProdSku(`SKU-${Date.now().toString(36).toUpperCase().slice(-5)}`);
    setProdCategory(categoryName || activeCategory?.name || (categories[0]?.name ?? "Hardware"));
    setProdListPrice("1000");
    setProdUnitCost("700");
    setProdBillingType("ONE_TIME");
    setProdTaxRate("18.0");
    setProdMinMargin("10.0");
    setProductModalOpen(true);
  };

  const openEditProductModal = (p: ProductRow) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdSku(p.sku);
    setProdCategory(p.category);
    setProdListPrice(String(p.listPrice));
    setProdUnitCost(String(p.unitCost));
    setProdBillingType(p.billingType || "ONE_TIME");
    setProdTaxRate(String(p.taxRate ?? 18));
    setProdMinMargin(String(p.minimumMargin ?? 10));
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingProduct ? `/api/catalog/products/${editingProduct.id}` : "/api/catalog/products";
      const method = editingProduct ? "PUT" : "POST";

      const payload = {
        name: prodName,
        sku: prodSku,
        category: prodCategory,
        listPrice: parseFloat(prodListPrice),
        unitCost: parseFloat(prodUnitCost),
        billingType: prodBillingType,
        taxRate: parseFloat(prodTaxRate),
        minimumMargin: parseFloat(prodMinMargin),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to save product");
      }

      setToast({
        message: editingProduct ? "Product updated successfully!" : "Product created successfully!",
        type: "success",
      });

      setProductModalOpen(false);
      await fetchCategories();
      if (activeCategory) {
        await loadCategoryProducts(activeCategory);
      }
    } catch (err: any) {
      setToast({ message: err.message || "Failed to save product", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`/api/catalog/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        setToast({ message: "Product deleted.", type: "success" });
        if (activeCategory) loadCategoryProducts(activeCategory);
        fetchCategories();
      }
    } catch {
      setToast({ message: "Failed to delete product.", type: "error" });
    }
  };

  const totalProducts = categories.reduce((acc, c) => acc + (c.productCount || 0), 0);

  return (
    <div className={s.page}>
      {/* Top bar */}
      <header className={s.topBar}>
        <div className={s.brand}>
          <div className={s.mark}>D</div>
          <span className={s.wordmark}>DealFlow360</span>
        </div>
        <nav className={s.navLinks}>
          <Link href="/dashboard/admin" className={s.navLink}>
            Dashboard
          </Link>
          <Link href="/dashboard/admin/users" className={s.navLink}>
            Users
          </Link>
          <Link href="/dashboard/admin/categories" className={s.navLinkActive}>
            Categories
          </Link>
          <Link href="/governance" className={s.navLink}>
            Discount Governance
          </Link>
        </nav>
      </header>

      <main className={s.main}>
        {/* Header */}
        <div className={s.header}>
          <div>
            <h1 className={s.title}>Product Categories</h1>
            <p className={s.subtitle}>
              Manage product classification, governance hierarchies, and category products
            </p>
          </div>
          <div className={s.headerActions}>
            <button
              onClick={() => openAddProductModal()}
              className={s.actionBtnPrimary}
              style={{ padding: "0.5625rem 1.25rem", fontSize: "0.875rem" }}
            >
              + Add Product
            </button>
            <Link href="/dashboard/admin" className={s.navLink} style={{ color: "var(--accent)" }}>
              ← Back to Overview
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className={s.statRow}>
          <div className={s.stat}>
            <span className={s.statNum}>{categories.length}</span> Total Categories
          </div>
          <div className={s.stat}>
            <span className={s.statNum}>{totalProducts}</span> Catalog Products
          </div>
        </div>

        {/* Create Category Form */}
        <section className={s.createCard}>
          <h2 className={s.createTitle}>Create New Category</h2>
          <form onSubmit={handleCreateCategory} className={s.formGrid}>
            <div className={s.formGroup}>
              <label htmlFor="cat-name" className={s.formLabel}>
                Category Name *
              </label>
              <input
                id="cat-name"
                type="text"
                className={s.formInput}
                placeholder="e.g. Hardware, Software, Services"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className={s.formGroup}>
              <label htmlFor="cat-desc" className={s.formLabel}>
                Description
              </label>
              <input
                id="cat-desc"
                type="text"
                className={s.formInput}
                placeholder="e.g. Computer hardware, Software products, Professional services"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button type="submit" className={s.primaryBtn} disabled={saving || !name.trim()}>
              {saving ? (
                <>
                  <svg className={s.spinner} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" d="M12 3a9 9 0 0 1 9 9" />
                  </svg>
                  Saving...
                </>
              ) : (
                "+ Create Category"
              )}
            </button>
          </form>
        </section>

        {/* Categories Table */}
        {loading ? (
          <div className={s.emptyState}>
            <svg className={s.spinner} width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ margin: "0 auto 0.75rem", display: "block" }}>
              <path strokeLinecap="round" d="M12 3a9 9 0 0 1 9 9" />
            </svg>
            Loading categories…
          </div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Products Assigned</th>
                  <th>Max Discount %</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={s.emptyState}>
                      No categories created yet. Create one above to get started.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id || cat.name}>
                      <td>
                        <div className={s.categoryCell}>
                          <div className={s.catIcon}>
                            {cat.name.charAt(0).toUpperCase()}
                          </div>
                          <span className={s.catName}>{cat.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={s.catDesc}>{cat.description || "—"}</span>
                      </td>
                      <td>
                        <span className={s.badgeCount}>
                          {cat.productCount} {cat.productCount === 1 ? "product" : "products"}
                        </span>
                      </td>
                      <td>
                        <div className={s.discountCell}>
                          <div className={s.discountInputWrap}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              className={s.discountInput}
                              value={discountInputs[cat.id] ?? cat.maxDiscount ?? 15}
                              onChange={(e) =>
                                setDiscountInputs((prev) => ({
                                  ...prev,
                                  [cat.id]: e.target.value,
                                }))
                              }
                            />
                            <span className={s.discountUnit}>%</span>
                          </div>
                          <button
                            type="button"
                            className={s.discountSaveBtn}
                            disabled={
                              savingDiscounts[cat.id] ||
                              discountInputs[cat.id] === undefined ||
                              parseFloat(discountInputs[cat.id]) === cat.maxDiscount
                            }
                            onClick={() => handleSaveDiscount(cat)}
                          >
                            {savingDiscounts[cat.id] ? "..." : "Save"}
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className={s.btnRow}>
                          <button
                            type="button"
                            className={s.actionBtn}
                            onClick={() => loadCategoryProducts(cat)}
                          >
                            👁 View Products
                          </button>
                          <button
                            type="button"
                            className={s.actionBtnPrimary}
                            onClick={() => openAddProductModal(cat.name)}
                          >
                            + Add Product
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal: View Category Products */}
      {activeCategory && (
        <div className={s.modalOverlay} onClick={() => setActiveCategory(null)}>
          <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div>
                <h3 className={s.modalTitle}>Products in "{activeCategory.name}"</h3>
                <span className={s.catDesc}>{activeCategory.description}</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button
                  type="button"
                  className={s.actionBtnPrimary}
                  onClick={() => openAddProductModal(activeCategory.name)}
                >
                  + Add Product
                </button>
                <button
                  type="button"
                  className={s.closeBtn}
                  onClick={() => setActiveCategory(null)}
                >
                  ×
                </button>
              </div>
            </div>

            <div className={s.modalBody}>
              {loadingProducts ? (
                <div className={s.emptyState}>Loading category products…</div>
              ) : categoryProducts.length === 0 ? (
                <div className={s.emptyProducts}>
                  No products in this category yet. Click "+ Add Product" to add one!
                </div>
              ) : (
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>SKU</th>
                        <th>Type</th>
                        <th>List Price</th>
                        <th>Unit Cost</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryProducts.map((p) => (
                        <tr key={p.id}>
                          <td><strong>{p.name}</strong></td>
                          <td><span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--slate)" }}>{p.sku}</span></td>
                          <td>
                            <span className={s.badgeCount} style={{ background: p.billingType === "RECURRING" ? "#fef3c7" : "#e8f0fe", color: p.billingType === "RECURRING" ? "#92400e" : "#1a56db" }}>
                              {p.billingType || "ONE_TIME"}
                            </span>
                          </td>
                          <td>${Number(p.listPrice).toLocaleString()}</td>
                          <td>${Number(p.unitCost).toLocaleString()}</td>
                          <td>
                            <div className={s.btnRow}>
                              <button
                                type="button"
                                className={s.actionBtn}
                                onClick={() => openEditProductModal(p)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className={s.actionBtn}
                                style={{ color: "var(--danger)" }}
                                onClick={() => handleDeleteProduct(p.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={s.modalFooter}>
              <button
                type="button"
                className={s.cancelBtn}
                onClick={() => setActiveCategory(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Product */}
      {productModalOpen && (
        <div className={s.modalOverlay} onClick={() => setProductModalOpen(false)}>
          <div className={s.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "38rem" }}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>{editingProduct ? "Edit Product" : "Add New Product"}</h3>
              <button
                type="button"
                className={s.closeBtn}
                onClick={() => setProductModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div className={s.modalBody}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Product Name *</label>
                  <input
                    type="text"
                    className={s.formInput}
                    placeholder="e.g. Enterprise Laptop X15"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    required
                  />
                </div>

                <div className={s.formRow2}>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>SKU *</label>
                    <input
                      type="text"
                      className={s.formInput}
                      placeholder="e.g. HW-LAPTOP-01"
                      value={prodSku}
                      onChange={(e) => setProdSku(e.target.value)}
                      required
                    />
                  </div>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Category *</label>
                    <select
                      className={s.selectInput}
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      required
                    >
                      {categories.map((c) => (
                        <option key={c.id || c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={s.formRow3}>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>List Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className={s.formInput}
                      value={prodListPrice}
                      onChange={(e) => setProdListPrice(e.target.value)}
                      required
                    />
                  </div>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Unit Cost ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className={s.formInput}
                      value={prodUnitCost}
                      onChange={(e) => setProdUnitCost(e.target.value)}
                      required
                    />
                  </div>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Billing Type *</label>
                    <select
                      className={s.selectInput}
                      value={prodBillingType}
                      onChange={(e) => setProdBillingType(e.target.value)}
                    >
                      <option value="ONE_TIME">ONE_TIME</option>
                      <option value="RECURRING">RECURRING</option>
                    </select>
                  </div>
                </div>

                <div className={s.formRow2}>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className={s.formInput}
                      value={prodTaxRate}
                      onChange={(e) => setProdTaxRate(e.target.value)}
                    />
                  </div>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Min Margin (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className={s.formInput}
                      value={prodMinMargin}
                      onChange={(e) => setProdMinMargin(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className={s.modalFooter}>
                <button
                  type="button"
                  className={s.cancelBtn}
                  onClick={() => setProductModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={s.primaryBtn}
                  disabled={saving || !prodName.trim() || !prodSku.trim()}
                >
                  {saving ? "Saving..." : editingProduct ? "Update Product" : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast feedback */}
      {toast && (
        <div
          className={toast.type === "success" ? s.toastSuccess : s.toastError}
          onClick={() => setToast(null)}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

