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
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Main Grid: Products Catalog on Left, Order Selection on Right */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "1.25rem" }}>
            {/* Catalog (7 cols) */}
            <div style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div style={{ display: "flex", gap: "0.625rem" }}>
                <input
                  type="text"
                  placeholder="Search products or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "0.625rem 0.875rem",
                    borderRadius: "0.625rem",
                    background: "#161616",
                    border: "1px solid rgba(255, 255, 255, 0.16)",
                    color: "#ffffff",
                    fontSize: "0.875rem",
                    outline: "none",
                  }}
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    padding: "0.625rem 0.875rem",
                    borderRadius: "0.625rem",
                    background: "#161616",
                    border: "1px solid rgba(255, 255, 255, 0.16)",
                    color: "#ffffff",
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {categories.map((c) => (
                    <option key={c} value={c} style={{ background: "#161616", color: "#ffffff" }}>
                      {c === "ALL" ? "All Categories" : c}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className={s.customScrollbar}
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "0.875rem",
                  background: "#111111",
                  maxHeight: "340px",
                  overflowY: "auto",
                }}
              >
                {fetchingProducts ? (
                  <div style={{ padding: "3rem 1rem", textAlign: "center", fontSize: "0.875rem", color: "#888888" }}>
                    Loading product catalog...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div style={{ padding: "3rem 1rem", textAlign: "center", fontSize: "0.875rem", color: "#888888" }}>
                    No products found matching your search.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {filteredProducts.map((p, idx) => {
                      const inCart = items.find((i) => i.productId === p.id);
                      return (
                        <div
                          key={p.id}
                          style={{
                            padding: "0.875rem 1rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderBottom: idx === filteredProducts.length - 1 ? "none" : "1px solid rgba(255, 255, 255, 0.06)",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          <div style={{ paddingRight: "0.75rem", flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#ffffff" }}>
                                {p.name}
                              </span>
                              <span style={{
                                fontSize: "0.625rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                padding: "0.125rem 0.4rem",
                                borderRadius: "0.375rem",
                                background: "rgba(255, 255, 255, 0.08)",
                                color: "#aaaaaa",
                                border: "1px solid rgba(255, 255, 255, 0.12)",
                              }}>
                                {p.category}
                              </span>
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#888888", marginTop: "0.2rem" }}>
                              SKU: {p.sku} &middot; {p.billingType === "RECURRING" ? "Recurring / Month" : "One-Time"}
                            </div>
                            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#ffffff", marginTop: "0.35rem" }}>
                              ₹{Number(p.listPrice).toLocaleString()}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddItem(p.id)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.375rem",
                              padding: "0.45rem 0.85rem",
                              borderRadius: "0.5rem",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              border: inCart ? "1px solid rgba(255, 255, 255, 0.25)" : "none",
                              background: inCart ? "rgba(255, 255, 255, 0.12)" : "#ffffff",
                              color: inCart ? "#ffffff" : "#000000",
                              transition: "all 0.15s ease",
                              flexShrink: 0,
                            }}
                          >
                            <Plus size={13} strokeWidth={2.5} />
                            {inCart ? `Added (${inCart.qty})` : "Add"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Items (5 cols) */}
            <div style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#cccccc", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <ShoppingCart size={14} color="#ffffff" /> Selected Products ({items.length})
                </span>
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setItems([])}
                    style={{ fontSize: "0.75rem", color: "#f87171", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div
                className={s.customScrollbar}
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "0.875rem",
                  background: "#111111",
                  minHeight: "150px",
                  maxHeight: "185px",
                  overflowY: "auto",
                  padding: items.length === 0 ? "2.5rem 1rem" : 0,
                }}
              >
                {items.length === 0 ? (
                  <div style={{ textAlign: "center", fontSize: "0.75rem", color: "#888888", lineHeight: 1.5 }}>
                    No items selected yet. Click &quot;Add&quot; on any product from the catalog to build your quote.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {items.map((item, idx) => {
                      const prod = products.find((p) => p.id === item.productId);
                      if (!prod) return null;
                      const lineTotal = Number(prod.listPrice) * item.qty;

                      return (
                        <div
                          key={item.productId}
                          style={{
                            padding: "0.625rem 0.875rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderBottom: idx === items.length - 1 ? "none" : "1px solid rgba(255, 255, 255, 0.06)",
                          }}
                        >
                          <div style={{ flex: 1, paddingRight: "0.5rem", minWidth: 0 }}>
                            <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {prod.name}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#888888", marginTop: "0.1rem" }}>
                              ₹{Number(prod.listPrice).toLocaleString()} &times; {item.qty} ={" "}
                              <span style={{ color: "#ffffff", fontWeight: 600 }}>₹{lineTotal.toLocaleString()}</span>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                            <input
                              type="number"
                              min={1}
                              value={item.qty}
                              onChange={(e) =>
                                handleUpdateQty(item.productId, parseInt(e.target.value) || 1)
                              }
                              style={{
                                width: "3.25rem",
                                padding: "0.25rem 0.4rem",
                                textAlign: "center",
                                background: "#161616",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                borderRadius: "0.375rem",
                                fontSize: "0.75rem",
                                color: "#ffffff",
                                outline: "none",
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.productId)}
                              style={{
                                padding: "0.3rem",
                                background: "none",
                                border: "none",
                                color: "#888888",
                                cursor: "pointer",
                                transition: "color 0.15s ease",
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "#f87171"}
                              onMouseLeave={(e) => e.currentTarget.style.color = "#888888"}
                              title="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Estimate Total */}
              <div style={{
                padding: "0.875rem 1rem",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#aaaaaa" }}>
                  Estimated List Total
                </span>
                <span style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff" }}>
                  ₹{calculateEstimate().toLocaleString()}
                </span>
              </div>

              {/* Additional Notes */}
              <div>
                <label style={{ display: "block", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888888", marginBottom: "0.35rem" }}>
                  Special Notes or Requirements
                </label>
                <textarea
                  placeholder="E.g., Requested delivery timeframe, volume discount inquiries..."
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    background: "#161616",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                    color: "#ffffff",
                    resize: "none",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div style={{
            paddingTop: "1rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}>
            <p style={{ fontSize: "0.75rem", color: "#888888", margin: 0, flex: 1, lineHeight: 1.4 }}>
              Your quotation will be drafted immediately and assigned to our sales team for custom discounts.
            </p>
            <div style={{ display: "flex", gap: "0.625rem", flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                style={{
                  padding: "0.55rem 1.125rem",
                  borderRadius: "0.625rem",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || items.length === 0}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.55rem 1.25rem",
                  borderRadius: "0.625rem",
                  background: "#ffffff",
                  color: "#000000",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  border: "none",
                  cursor: loading || items.length === 0 ? "not-allowed" : "pointer",
                  opacity: loading || items.length === 0 ? 0.5 : 1,
                  boxShadow: "0 2px 10px rgba(255, 255, 255, 0.15)",
                  transition: "all 0.15s ease",
                }}
              >
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
