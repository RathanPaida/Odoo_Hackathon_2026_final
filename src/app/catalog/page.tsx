"use client";

import { useState, useEffect } from "react";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Card, CardHeader, CardTitle, Field, Input, Textarea, Select, Badge, Button, Modal, useToast } from "@/components/ui";
import {
  Package,
  Plus,
  FolderPlus,
  Tag,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Layers,
  DollarSign,
} from "lucide-react";

export default function CatalogPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

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

  const [saving, setSaving] = useState(false);
  const toast = useToast();

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
      toast.success("Product created successfully");
      setShowProductModal(false);
      setName("");
      setDescription("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
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
      toast.success("Category created successfully");
      setShowCategoryModal(false);
      setCatName("");
      setCatDesc("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="surface-page min-h-screen flex flex-col">
      <NavigationHeader />

      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <Card tone="paper" className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6">
            <div>
              <div className="flex items-center gap-2 text-[var(--primary)] text-xs font-semibold uppercase tracking-wider mb-1">
                <Package className="h-4 w-4" />
                <span>Catalog</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                Product Catalog &amp; Categories
              </h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Manage base price lists, cost basis, category hierarchies, and target margins consumed by Quotations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="secondary" leftIcon={<FolderPlus size={16} />} onClick={() => setShowCategoryModal(true)}>
                Add Category
              </Button>
              <Button leftIcon={<Plus size={16} />} onClick={() => setShowProductModal(true)}>
                Create Product
              </Button>
            </div>
          </div>
        </Card>

        <Card tone="paper" className="mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-3 p-4 scrollbar-thin">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                selectedCategory === "ALL"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "bg-[var(--paper)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
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
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--paper)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {cat.name} ({cat._count?.products ?? 0})
              </button>
            ))}
          </div>
        </Card>

        {loading ? (
          <Card tone="paper" className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--muted-foreground)]">Loading catalog items…</p>
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card tone="paper" className="py-16 text-center border-dashed">
            <Package className="h-10 w-10 text-[var(--muted-foreground)] mx-auto mb-3" />
            <p className="font-medium text-[var(--foreground)]">No products found in this category</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Create your first product or select another category.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => {
              const base = Number(product.basePrice);
              const cost = Number(product.costPrice);
              const margin = base > 0 ? (((base - cost) / base) * 100).toFixed(1) : "0";
              const minMargin = Number(product.minimumMargin);

              return (
                <Card key={product.id} tone="paper" className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <Badge tone="neutral">
                        <Tag className="h-3 w-3 mr-1 text-[var(--primary)]" />
                        {product.category?.name ?? "General"}
                      </Badge>
                      <Badge tone={product.productType === "SUBSCRIPTION" ? "negotiating" : "info"}>
                        {product.productType}
                      </Badge>
                    </div>

                    <h3 className="text-base font-semibold text-[var(--foreground)] mt-2">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">{product.description}</p>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-[var(--paper-border)]">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[var(--muted-foreground)] block">Base Price</span>
                        <span className="text-[var(--foreground)] font-semibold text-sm tabular">
                          ${Number(product.basePrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--muted-foreground)] block">Cost Price</span>
                        <span className="text-[var(--foreground)] font-medium tabular">
                          ${Number(product.costPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs bg-[var(--paper)] p-2.5 rounded-lg border border-[var(--paper-border)]">
                      <span className="text-[var(--muted-foreground)] flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-[var(--status-approved-fg)]" />
                        Base Margin:
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            Number(margin) >= minMargin
                              ? "text-[var(--status-approved-fg)]"
                              : "text-[var(--status-pending-fg)]"
                          }`}
                        >
                          {margin}%
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          (Min: {minMargin}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={showProductModal}
        onClose={() => setShowProductModal(false)}
        title="Create new product"
        description="Define catalog pricing, cost structure, and minimum margin ceilings."
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowProductModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProduct} loading={saving}>
              Save product
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <Field label="Product name" htmlFor="prod-name" required>
            <Input
              id="prod-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Enterprise Laptop X15"
            />
          </Field>
          <Field label="Description" htmlFor="prod-desc">
            <Textarea
              id="prod-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of product features…"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" htmlFor="prod-cat" required>
              <Select id="prod-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Type" htmlFor="prod-type" required>
              <Select id="prod-type" value={productType} onChange={(e) => setProductType(e.target.value)}>
                <option value="ONE_TIME">One-Time (Hardware/Service)</option>
                <option value="SUBSCRIPTION">Subscription (Recurring)</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Base price ($)" htmlFor="prod-base" required>
              <Input id="prod-base" type="number" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
            </Field>
            <Field label="Cost price ($)" htmlFor="prod-cost" required>
              <Input id="prod-cost" type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tax rate (%)" htmlFor="prod-tax">
              <Input id="prod-tax" type="number" step="0.1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </Field>
            <Field label="Minimum margin (%)" htmlFor="prod-margin">
              <Input id="prod-margin" type="number" step="0.1" value={minimumMargin} onChange={(e) => setMinimumMargin(e.target.value)} />
            </Field>
          </div>
          <div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--paper-border)] text-xs flex items-center justify-between">
            <div>
              <span className="text-[var(--muted-foreground)] block">Calculated profit &amp; margin</span>
              <span className="font-semibold text-[var(--foreground)] tabular">
                ${profit.toFixed(2)} ({calculatedMargin}%)
              </span>
            </div>
            <div>
              {meetsMinMargin ? (
                <span className="text-[var(--status-approved-fg)] flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="h-4 w-4" /> Meets ceiling
                </span>
              ) : (
                <span className="text-[var(--status-rejected-fg)] flex items-center gap-1 font-semibold">
                  <AlertCircle className="h-4 w-4" /> Below min margin
                </span>
              )}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Add product category"
        description="Categories govern product grouping and discount limits."
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCategoryModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory} loading={saving}>
              Create category
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <Field label="Category name" htmlFor="cat-name" required>
            <Input
              id="cat-name"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Infrastructure, Security, Accessories"
            />
          </Field>
          <Field label="Description" htmlFor="cat-desc">
            <Textarea
              id="cat-desc"
              rows={2}
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="Description of products in this category…"
            />
          </Field>
        </form>
      </Modal>
    </main>
  );
}