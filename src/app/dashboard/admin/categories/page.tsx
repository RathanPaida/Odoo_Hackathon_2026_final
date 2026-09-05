"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderTree,
  Package,
  Plus,
  Eye,
  Edit2,
  Trash2,
  ArrowLeft,
  ChevronDown,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import s from "./admin-categories.module.css";

interface CategoryRow {
  id: string;
  name: string;
  description: string;
  productCount: number;
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
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string }>({
    name: "Admin",
    email: "admin@dealflow.com",
    role: "ADMIN"
  });

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

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const json = await res.json();
          if (json.user) {
            setCurrentUser(json.user);
          }
        }
      } catch {
        // Fallback to default
      }
    }
    loadUser();
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/catalog/categories");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCategories(json.data);
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
    <RoleSidebar
      role={currentUser.role}
      userName={currentUser.name}
      userEmail={currentUser.email}
    >
      <div className={s.page}>
        <div className={s.container}>
          {/* Header */}
          <div className={`${s.header} ${s.animateFadeIn}`}>
            <div className={s.headerContent}>
              <div className={s.headerBadge}>
                <FolderTree size={14} />
                Catalog Governance
              </div>
              <h1 className={s.title}>Product Categories</h1>
              <p className={s.subtitle}>
                Manage taxonomy classification, category structure, and assign products with custom pricing rules.
              </p>
            </div>
            <div className={s.headerActions}>
              <button
                type="button"
                onClick={() => openAddProductModal()}
                className={s.primaryBtn}
              >
                <Plus size={16} />
                Add Product
              </button>
              <Link href="/dashboard/admin" className={s.backLink}>
                <ArrowLeft size={15} />
                Back to Overview
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className={`${s.statsGrid} ${s.animateFadeIn}`}>
            <div className={s.statCard}>
              <div className={s.statLabel}>Total Categories</div>
              <div className={s.statValue}>{categories.length}</div>
            </div>
            <div className={s.statCard}>
              <div className={s.statLabel}>Catalog Products</div>
              <div className={`${s.statValue} ${s.statValueBrand}`}>{totalProducts}</div>
            </div>
            <div className={s.statCard}>
              <div className={s.statLabel}>Governance Status</div>
              <div className={`${s.statValue} ${s.statValueSuccess}`}>Active</div>
            </div>
          </div>

          {/* Create Category Form */}
          <section className={`${s.card} ${s.animateFadeIn}`}>
            <div className={s.sectionTitle}>
              <Sparkles size={18} className={s.sectionIcon} />
              Create New Category
            </div>
            <form onSubmit={handleCreateCategory} className={s.formGrid}>
              <div className={s.formGroup}>
                <label htmlFor="cat-name" className={s.formLabel}>
                  Category Name *
                </label>
                <input
                  id="cat-name"
                  type="text"
                  className={s.formInput}
                  placeholder="e.g. Hardware, Cloud Services, Enterprise Support"
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
                  placeholder="e.g. Server hardware, SaaS subscriptions, SLA maintenance"
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
                  <>
                    <Plus size={16} />
                    Create Category
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Categories Table */}
          <div className={`${s.tableCard} ${s.animateFadeIn}`}>
            {loading ? (
              <div className={s.emptyState}>
                <svg className={s.spinner} width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth="2.5" style={{ margin: "0 auto 1rem", display: "block" }}>
                  <path strokeLinecap="round" d="M12 3a9 9 0 0 1 9 9" />
                </svg>
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <div className={s.emptyState}>
                No categories created yet. Use the form above to add your first classification.
              </div>
            ) : (
              <div className={s.tableWrapper}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Products Assigned</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
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
                            <Package size={12} />
                            {cat.productCount} {cat.productCount === 1 ? "product" : "products"}
                          </span>
                        </td>
                        <td>
                          <div className={s.btnRow}>
                            <button
                              type="button"
                              className={s.actionBtn}
                              onClick={() => loadCategoryProducts(cat)}
                            >
                              <Eye size={14} />
                              View Products
                            </button>
                            <button
                              type="button"
                              className={s.actionBtnPrimary}
                              onClick={() => openAddProductModal(cat.name)}
                            >
                              <Plus size={14} />
                              Add Product
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
        </div>

        {/* Modal: View Category Products */}
        {activeCategory && (
          <div className={s.modalOverlay} onClick={() => setActiveCategory(null)}>
            <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={s.modalHeader}>
                <div>
                  <h3 className={s.modalTitle}>Products in "{activeCategory.name}"</h3>
                  <span className={s.catDesc}>{activeCategory.description || "Product catalog under this classification"}</span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button
                    type="button"
                    className={s.actionBtnPrimary}
                    onClick={() => openAddProductModal(activeCategory.name)}
                  >
                    <Plus size={14} />
                    Add Product
                  </button>
                  <button
                    type="button"
                    className={s.closeBtn}
                    onClick={() => setActiveCategory(null)}
                    aria-label="Close dialog"
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
                    No products assigned to "{activeCategory.name}" yet. Click "+ Add Product" to add one!
                  </div>
                ) : (
                  <div className={s.tableCard}>
                    <div className={s.tableWrapper}>
                      <table className={s.table}>
                        <thead>
                          <tr>
                            <th>Product Name</th>
                            <th>SKU</th>
                            <th>Billing Type</th>
                            <th>List Price</th>
                            <th>Unit Cost</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryProducts.map((p) => (
                            <tr key={p.id}>
                              <td><strong style={{ color: "#f1f5f9" }}>{p.name}</strong></td>
                              <td><span style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "#c4b5fd" }}>{p.sku}</span></td>
                              <td>
                                <span
                                  className={s.badgeCount}
                                  style={{
                                    background: p.billingType === "RECURRING" ? "rgba(245, 158, 11, 0.15)" : "rgba(109, 40, 217, 0.2)",
                                    color: p.billingType === "RECURRING" ? "#fcd34d" : "#c4b5fd",
                                    borderColor: p.billingType === "RECURRING" ? "rgba(245, 158, 11, 0.35)" : "rgba(139, 92, 246, 0.3)"
                                  }}
                                >
                                  {p.billingType || "ONE_TIME"}
                                </span>
                              </td>
                              <td style={{ fontWeight: 600 }}>${Number(p.listPrice).toLocaleString()}</td>
                              <td style={{ color: "#94a3b8" }}>${Number(p.unitCost).toLocaleString()}</td>
                              <td>
                                <div className={s.btnRow}>
                                  <button
                                    type="button"
                                    className={s.actionBtn}
                                    onClick={() => openEditProductModal(p)}
                                  >
                                    <Edit2 size={13} />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className={s.actionBtnDanger}
                                    onClick={() => handleDeleteProduct(p.id)}
                                  >
                                    <Trash2 size={13} />
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
            <div className={s.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "42rem" }}>
              <div className={s.modalHeader}>
                <h3 className={s.modalTitle}>{editingProduct ? "Edit Product" : "Add New Product"}</h3>
                <button
                  type="button"
                  className={s.closeBtn}
                  onClick={() => setProductModalOpen(false)}
                  aria-label="Close dialog"
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
                      placeholder="e.g. Enterprise Cloud Server X15"
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
                      <div className={s.selectWrapper}>
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
                        <ChevronDown size={16} className={s.selectArrow} />
                      </div>
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
                      <div className={s.selectWrapper}>
                        <select
                          className={s.selectInput}
                          value={prodBillingType}
                          onChange={(e) => setProdBillingType(e.target.value)}
                        >
                          <option value="ONE_TIME">ONE_TIME</option>
                          <option value="RECURRING">RECURRING</option>
                        </select>
                        <ChevronDown size={16} className={s.selectArrow} />
                      </div>
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

        {/* Floating Toast Notification */}
        {toast && (
          <div
            className={toast.type === "success" ? s.toastSuccess : s.toastError}
            onClick={() => setToast(null)}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </RoleSidebar>
  );
}
