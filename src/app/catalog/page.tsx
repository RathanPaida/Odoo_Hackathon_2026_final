"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Plus,
  FolderPlus,
  Tag,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import styles from "./catalog.module.css";

interface Category {
  id: string;
  name: string;
  description?: string;
  _count?: { products: number };
}

interface Product {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  category?: Category;
  productType: string;
  basePrice: string;
  costPrice: string;
  minimumMargin: number;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

export default function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [productType, setProductType] = useState("ONE_TIME");
  const [basePrice, setBasePrice] = useState("1000");
  const [costPrice, setCostPrice] = useState("700");
  const [taxRate, setTaxRate] = useState("8.0");
  const [minimumMargin, setMinimumMargin] = useState("15.0");

  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [cRes, pRes] = await Promise.all([
        fetch("/api/catalog/categories"),
        fetch("/api/catalog/products"),
      ]);
      const cData = await cRes.json();
      const pData = await pRes.json();
      if (cData.success) setCategories(cData.data);
      if (pData.success) setProducts(pData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const baseNum = parseFloat(basePrice) || 0;
  const costNum = parseFloat(costPrice) || 0;
  const profit = Math.max(0, baseNum - costNum);
  const calculatedMargin = baseNum > 0 ? ((profit / baseNum) * 100).toFixed(1) : "0.0";
  const meetsMinMargin = parseFloat(calculatedMargin) >= (parseFloat(minimumMargin) || 0);

  const filteredProducts =
    selectedCategory === "ALL"
      ? products
      : products.filter((p) => p.categoryId === selectedCategory);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/catalog/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          categoryId,
          productType,
          basePrice: parseFloat(basePrice),
          costPrice: parseFloat(costPrice),
          taxRate: parseFloat(taxRate),
          minimumMargin: parseFloat(minimumMargin),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to create product");
      showToast("Product created successfully", "success");
      setShowProductModal(false);
      setName("");
      setDescription("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/catalog/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: catName, description: catDesc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to create category");
      showToast("Category created successfully", "success");
      setShowCategoryModal(false);
      setCatName("");
      setCatDesc("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerIcon}>
              <Package size={16} />
              <span>Catalog Management</span>
            </div>
            <h1 className={styles.title}>Product Catalog & Categories</h1>
            <p className={styles.subtitle}>
              Manage base price lists, cost basis, category hierarchies, and target margins consumed by Quotations.
            </p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.secondaryBtn} onClick={() => setShowCategoryModal(true)}>
              <FolderPlus size={16} />
              Add Category
            </button>
            <button className={styles.primaryBtn} onClick={() => setShowProductModal(true)}>
              <Plus size={16} />
              Create Product
            </button>
          </div>
        </header>

        <section className={`${styles.card} ${styles.animateFadeIn}`} style={{ marginBottom: "1.5rem", padding: "1rem 1.25rem" }}>
          <div className={styles.filterTabs}>
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`${styles.filterTab} ${selectedCategory === "ALL" ? styles.filterTabActive : ""}`}
            >
              All ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`${styles.filterTab} ${selectedCategory === cat.id ? styles.filterTabActive : ""}`}
              >
                {cat.name} ({cat._count?.products ?? 0})
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <section className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p style={{ color: "#94a3b8" }}>Loading catalog items...</p>
          </section>
        ) : filteredProducts.length === 0 ? (
          <section className={`${styles.card} ${styles.animateFadeIn}`}>
            <div className={styles.emptyState}>
              <Package className={styles.emptyIcon} />
              <p className={styles.emptyText}>No products found in this category</p>
              <p className={styles.emptySubtext}>Create your first product or select another category.</p>
            </div>
          </section>
        ) : (
          <div className={`${styles.productGrid} ${styles.animateFadeIn}`}>
            {filteredProducts.map((product) => {
              const base = Number(product.basePrice);
              const cost = Number(product.costPrice);
              const margin = base > 0 ? (((base - cost) / base) * 100).toFixed(1) : "0";
              const minMargin = Number(product.minimumMargin);
              const marginClass = Number(margin) >= minMargin ? styles.marginGood : Number(margin) >= minMargin - 5 ? styles.marginWarning : styles.marginBad;

              return (
                <div key={product.id} className={styles.productCard}>
                  <div className={styles.productHeader}>
                    <span className={`${styles.statusBadge} ${styles.badgePrimary}`}>
                      <Tag size={10} style={{ marginRight: "0.25rem" }} />
                      {product.category?.name ?? "General"}
                    </span>
                    <span className={`${styles.statusBadge} ${product.productType === "SUBSCRIPTION" ? styles.badgeNegotiating : styles.badgeInfo}`}>
                      {product.productType}
                    </span>
                  </div>

                  <h3 className={styles.productName}>{product.name}</h3>
                  {product.description && (
                    <p className={styles.productDescription}>{product.description}</p>
                  )}

                  <div className={styles.productDivider}></div>

                  <div className={styles.productPricing}>
                    <div className={styles.priceItem}>
                      <div className={styles.priceLabel}>Base Price</div>
                      <div className={styles.priceValue}>
                        ${Number(product.basePrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className={styles.priceItem}>
                      <div className={styles.priceLabel}>Cost Price</div>
                      <div className={styles.priceValue}>
                        ${Number(product.costPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className={styles.marginIndicator}>
                    <div className={styles.marginLabel}>
                      <TrendingUp size={14} style={{ color: Number(margin) >= minMargin ? "#34d399" : "#f87171" }} />
                      <span>Base Margin:</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className={`${styles.marginValue} ${marginClass}`}>{margin}%</span>
                      <div className={styles.marginMin}>Min: {minMargin}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showProductModal && (
        <div className={styles.modal} onClick={() => setShowProductModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Create New Product</h2>
                <p className={styles.modalDescription}>Define catalog pricing, cost structure, and minimum margin ceilings.</p>
              </div>
              <button className={styles.modalClose} onClick={() => setShowProductModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateProduct}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Product Name *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Enterprise Laptop X15"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Description</label>
                  <textarea
                    className={styles.formTextarea}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief summary of product features..."
                    rows={2}
                  />
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Category *</label>
                    <select
                      className={styles.formSelect}
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      required
                    >
                      <option value="">Select a category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Type *</label>
                    <select
                      className={styles.formSelect}
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                    >
                      <option value="ONE_TIME">One-Time (Hardware/Service)</option>
                      <option value="SUBSCRIPTION">Subscription (Recurring)</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Base Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className={styles.formInput}
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Cost Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className={styles.formInput}
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className={styles.formInput}
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Minimum Margin (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className={styles.formInput}
                      value={minimumMargin}
                      onChange={(e) => setMinimumMargin(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.calcBox}>
                  <div>
                    <div className={styles.calcLabel}>Calculated Profit & Margin</div>
                    <div className={styles.calcValue}>${profit.toFixed(2)} ({calculatedMargin}%)</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {meetsMinMargin ? (
                      <>
                        <CheckCircle2 size={20} style={{ color: "#34d399" }} />
                        <span style={{ color: "#34d399", fontWeight: 600, fontSize: "0.875rem" }}>Meets Minimum</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={20} style={{ color: "#f87171" }} />
                        <span style={{ color: "#f87171", fontWeight: 600, fontSize: "0.875rem" }}>Below Minimum</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.ghostBtn} onClick={() => setShowProductModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={saving}>
                  {saving ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className={styles.modal} onClick={() => setShowCategoryModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "32rem" }}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Add Product Category</h2>
                <p className={styles.modalDescription}>Categories govern product grouping and discount limits.</p>
              </div>
              <button className={styles.modalClose} onClick={() => setShowCategoryModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCategory}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Category Name *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g. Infrastructure, Security, Accessories"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Description</label>
                  <textarea
                    className={styles.formTextarea}
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    placeholder="Description of products in this category..."
                    rows={2}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.ghostBtn} onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={saving}>
                  {saving ? "Creating..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          padding: "1rem 1.5rem",
          borderRadius: "1rem",
          background: toast.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
          border: `1px solid ${toast.type === "success" ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
          color: toast.type === "success" ? "#6ee7b7" : "#fca5a5",
          fontWeight: 600,
          fontSize: "0.875rem",
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          animation: "fadeIn 0.3s ease",
          backdropFilter: "blur(8px)",
        }}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}
    </main>
  );
}
