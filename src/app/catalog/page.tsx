"use client";

import { useState, useEffect } from "react";
import { NavigationHeader } from "@/components/NavigationHeader";
import { 
  Package, 
  Plus, 
  FolderPlus, 
  Tag, 
  Layers, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  AlertCircle 
} from "lucide-react";

export default function CatalogPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // New product form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [productType, setProductType] = useState("ONE_TIME");
  const [basePrice, setBasePrice] = useState("1000");
  const [costPrice, setCostPrice] = useState("700");
  const [taxRate, setTaxRate] = useState("8.0");
  const [minimumMargin, setMinimumMargin] = useState("15.0");

  // New category form
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Calculate live margin preview
  const baseNum = parseFloat(basePrice) || 0;
  const costNum = parseFloat(costPrice) || 0;
  const profit = Math.max(0, baseNum - costNum);
  const calculatedMargin = baseNum > 0 ? ((profit / baseNum) * 100).toFixed(1) : "0.0";
  const meetsMinMargin = parseFloat(calculatedMargin) >= (parseFloat(minimumMargin) || 0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, prodRes] = await Promise.all([
        fetch("/api/catalog/categories"),
        fetch("/api/catalog/products"),
      ]);

      const catData = await catRes.json();
      const prodData = await prodRes.json();

      if (catData.success) {
        setCategories(catData.data);
        if (catData.data.length > 0 && !categoryId) {
          setCategoryId(catData.data[0].id);
        }
      }
      if (prodData.success) setProducts(prodData.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/catalog/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      if (data.success) {
        setFeedback({ type: "success", message: `Product "${name}" created successfully!` });
        setShowProductModal(false);
        setName("");
        setDescription("");
        fetchData();
      } else {
        setFeedback({ type: "error", message: data.error?.message || "Failed to create product." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Request failed." });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/catalog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName, description: catDesc }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: `Category "${catName}" added!` });
        setShowCategoryModal(false);
        setCatName("");
        setCatDesc("");
        fetchData();
      } else {
        setFeedback({ type: "error", message: data.error?.message || "Failed to create category." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Request failed." });
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = selectedCategory === "ALL" 
    ? products 
    : products.filter((p) => p.categoryId === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <NavigationHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Package className="h-4 w-4" />
              <span>Person 2 Responsibility</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Product Catalog & Categories</h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage base price lists, cost basis, category hierarchies, and target margins consumed by Quotations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-sm font-medium transition-all"
            >
              <FolderPlus className="h-4 w-4 text-slate-400" />
              Add Category
            </button>
            <button
              onClick={() => setShowProductModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="h-4 w-4" />
              Create Product
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${
              feedback.type === "success"
                ? "bg-emerald-950/60 border-emerald-800/80 text-emerald-300"
                : "bg-rose-950/60 border-rose-800/80 text-rose-300"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              selectedCategory === "ALL"
                ? "bg-indigo-600 text-white"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800"
            }`}
          >
            All Categories ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800"
              }`}
            >
              {cat.name} ({cat._count?.products ?? 0})
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm">Loading catalog items...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
            <Package className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">No products found in this category</p>
            <p className="text-slate-500 text-xs mt-1">Create your first product or select another category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => {
              const base = Number(product.basePrice);
              const cost = Number(product.costPrice);
              const margin = base > 0 ? (((base - cost) / base) * 100).toFixed(1) : "0";
              const minMargin = Number(product.minimumMargin);

              return (
                <div
                  key={product.id}
                  className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                        <Tag className="h-3 w-3 text-indigo-400" />
                        {product.category?.name ?? "General"}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                          product.productType === "SUBSCRIPTION"
                            ? "bg-purple-950 text-purple-300 border border-purple-800/50"
                            : "bg-blue-950 text-blue-300 border border-blue-800/50"
                        }`}
                      >
                        {product.productType}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-white mt-2">{product.name}</h3>
                    {product.description && (
                      <p className="text-slate-400 text-xs mt-1 line-clamp-2">{product.description}</p>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800/80">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block">Base Price</span>
                        <span className="text-white font-semibold text-sm">
                          ${Number(product.basePrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Cost Price</span>
                        <span className="text-slate-300 font-medium">
                          ${Number(product.costPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/50">
                      <span className="text-slate-400 flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        Base Margin:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${Number(margin) >= minMargin ? "text-emerald-400" : "text-amber-400"}`}>
                          {margin}%
                        </span>
                        <span className="text-[10px] text-slate-500">
                          (Min: {minMargin}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Create New Product</h2>
            <p className="text-xs text-slate-400 mb-5">Define catalog pricing, cost structure, and minimum margin ceilings.</p>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Enterprise Laptop X15"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of product features..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Type</label>
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ONE_TIME">One-Time (Hardware/Service)</option>
                    <option value="SUBSCRIPTION">Subscription (Recurring)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Base Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Minimum Margin (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={minimumMargin}
                    onChange={(e) => setMinimumMargin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Live Margin Calculation Card */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block">Calculated Profit & Margin</span>
                  <span className="font-semibold text-white">${profit.toFixed(2)} ({calculatedMargin}%)</span>
                </div>
                <div>
                  {meetsMinMargin ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="h-4 w-4" /> Meets Ceiling
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1 font-semibold">
                      <AlertCircle className="h-4 w-4" /> Below Min Margin
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Add Product Category</h2>
            <p className="text-xs text-slate-400 mb-5">Categories govern product grouping and discount limits.</p>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Infrastructure, Security, Accessories"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Description of products in this category..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
