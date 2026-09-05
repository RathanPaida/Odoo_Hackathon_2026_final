"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Modal, Button, useToast } from "@/components/ui";
import s from "../customer.module.css";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  listPrice: number | string;
  billingType: string;
}

interface RequestItem {
  productId: string;
  qty: number;
  subscriptionMonths?: number;
}

export function CustomerNewQuoteButton({ className }: { className?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingProducts, setFetchingProducts] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [items, setItems] = useState<RequestItem[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && products.length === 0) {
      setFetchingProducts(true);
      fetch("/api/catalog/products")
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data) {
            setProducts(res.data);
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error("Failed to load catalog", "Please check your network connection.");
        })
        .finally(() => setFetchingProducts(false));
    }
  }, [open, products.length, toast]);

  const categories = ["ALL", ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddItem = (productId: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId ? { ...i, qty: i.qty + 1 } : i
        );
      }
      const prod = products.find((p) => p.id === productId);
      return [
        ...prev,
        {
          productId,
          qty: 1,
          subscriptionMonths: prod?.billingType === "RECURRING" ? 12 : undefined,
        },
      ];
    });
  };

  const handleUpdateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, qty } : i))
    );
  };

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const calculateEstimate = () => {
    return items.reduce((sum, item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) return sum;
      return sum + Number(prod.listPrice) * item.qty;
    }, 0);
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.warning("Empty request", "Please add at least one product to your quote request.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/quotes/customer-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          notes: notes.trim() || undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to submit quote request");
      }

      toast.success(
        "Quote requested successfully!",
        `Quote ${body.data.quote.quoteNumber} has been created and sent to our sales team.`
      );
      setOpen(false);
      setItems([]);
      setNotes("");

      if (body.data.portalUrl) {
        router.push(body.data.portalUrl);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      toast.error("Could not submit request", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className || s.primaryBtn}
      >
        <Plus size={16} strokeWidth={2.5} />
        <span>New Quote</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Request a Quotation"
        description="Select the products and quantities you need. Our team will tailor the pricing for your account."
        size="xl"
      >
        <div className="space-y-6">
          {/* Main Grid: Products Catalog on Left, Order Selection on Right */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Catalog (7 cols) */}
            <div className="md:col-span-7 flex flex-col space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search products or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[var(--surface-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-[var(--surface-input)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c === "ALL" ? "All Categories" : c}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`border border-[var(--border)] rounded-xl overflow-hidden bg-[rgba(15,15,35,0.4)] max-h-[340px] overflow-y-auto ${s.customScrollbar}`}>
                {fetchingProducts ? (
                  <div className="py-12 text-center text-sm text-[var(--muted-foreground)]">
                    Loading product catalog...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="py-12 text-center text-sm text-[var(--muted-foreground)]">
                    No products found matching your search.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {filteredProducts.map((p) => {
                      const inCart = items.find((i) => i.productId === p.id);
                      return (
                        <div
                          key={p.id}
                          className="p-3 flex items-center justify-between hover:bg-[rgba(109,40,217,0.1)] transition-colors"
                        >
                          <div className="pr-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-[var(--foreground)]">
                                {p.name}
                              </span>
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]">
                                {p.category}
                              </span>
                            </div>
                            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                              SKU: {p.sku} • {p.billingType === "RECURRING" ? "Recurring / Month" : "One-Time"}
                            </div>
                            <div className="text-xs font-semibold text-violet-400 mt-1">
                              ₹{Number(p.listPrice).toLocaleString()}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant={inCart ? "secondary" : "primary"}
                            onClick={() => handleAddItem(p.id)}
                            className="shrink-0 text-xs gap-1"
                          >
                            <Plus size={13} />
                            {inCart ? `Add (${inCart.qty})` : "Add"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Items (5 cols) */}
            <div className="md:col-span-5 flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                  <ShoppingCart size={14} /> Selected Products ({items.length})
                </span>
                {items.length > 0 && (
                  <button
                    onClick={() => setItems([])}
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className={`border border-[var(--border)] rounded-xl overflow-hidden bg-[rgba(15,15,35,0.4)] flex-1 min-h-[160px] max-h-[220px] overflow-y-auto ${s.customScrollbar}`}>
                {items.length === 0 ? (
                  <div className="py-10 px-4 text-center text-xs text-[var(--muted-foreground)]">
                    No items selected yet. Click &quot;Add&quot; on any product from the catalog to build your quote.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {items.map((item) => {
                      const prod = products.find((p) => p.id === item.productId);
                      if (!prod) return null;
                      const lineTotal = Number(prod.listPrice) * item.qty;

                      return (
                        <div key={item.productId} className="p-2.5 flex items-center justify-between">
                          <div className="flex-1 pr-2 min-w-0">
                            <div className="text-xs font-medium text-[var(--foreground)] truncate">
                              {prod.name}
                            </div>
                            <div className="text-[11px] text-[var(--muted-foreground)]">
                              ₹{Number(prod.listPrice).toLocaleString()} × {item.qty} ={" "}
                              <span className="text-violet-300 font-medium">₹{lineTotal.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              value={item.qty}
                              onChange={(e) =>
                                handleUpdateQty(item.productId, parseInt(e.target.value) || 1)
                              }
                              className="w-12 px-1.5 py-1 text-center bg-[var(--surface-input)] border border-[var(--border)] rounded text-xs text-[var(--foreground)]"
                            />
                            <button
                              onClick={() => handleRemoveItem(item.productId)}
                              className="p-1 text-[var(--muted-foreground)] hover:text-rose-400 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Estimate Total */}
              <div className="p-3 bg-[rgba(109,40,217,0.15)] border border-[rgba(139,92,246,0.3)] rounded-xl flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">
                  Estimated List Total
                </span>
                <span className="text-sm font-bold text-white">
                  ₹{calculateEstimate().toLocaleString()}
                </span>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                  Special Notes or Requirements
                </label>
                <textarea
                  placeholder="E.g., Requested delivery timeframe, volume discount inquiries..."
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--surface-input)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-[var(--border)] flex justify-between items-center">
            <p className="text-xs text-[var(--muted-foreground)]">
              Your quotation will be drafted immediately and assigned to our sales team for custom discounts.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={loading}
                disabled={items.length === 0}
              >
                Submit Request
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
