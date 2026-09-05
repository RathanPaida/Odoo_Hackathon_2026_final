"use client";

import { useState, useEffect } from "react";
import { Card, Badge, Button, Modal, Field, Select, Input } from "@/components/ui";
import {
  Truck,
  Warehouse as WarehouseIcon,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Clock,
  Sparkles,
} from "lucide-react";
import s from "./fulfillment.module.css";

export default function FulfillmentPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [backorders, setBackorders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Allocation simulation state
  const [allocating, setAllocating] = useState(false);
  const [allocationResult, setAllocationResult] = useState<any | null>(null);

  // Manual Override state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideWarehouseId, setOverrideWarehouseId] = useState("");
  const [overrideQty, setOverrideQty] = useState("");
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wRes, sRes, bRes] = await Promise.all([
        fetch("/api/fulfillment/warehouses"),
        fetch("/api/fulfillment/stocks"),
        fetch("/api/fulfillment/backorders"),
      ]);

      const wData = await wRes.json();
      const sData = await sRes.json();
      const bData = await bRes.json();

      if (wData.success) {
        setWarehouses(wData.data);
        if (wData.data.length > 0 && !overrideWarehouseId) {
          setOverrideWarehouseId(wData.data[0].id);
        }
      }
      if (sData.success) setStocks(sData.data);
      if (bData.success) setBackorders(bData.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunAllocation = async () => {
    try {
      setAllocating(true);
      setAllocationResult(null);
      setOverrideError(null);
      setOverrideSuccess(null);

      // Runs allocation on the demo order: ord11111-1111-1111-1111-111111111111
      const res = await fetch("/api/fulfillment/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: "ord11111-1111-1111-1111-111111111111",
          customerCoords: { lat: 40.7128, lng: -74.006 }, // NY customer
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAllocationResult(data.data);
        fetchData();
      } else {
        setOverrideError(data.error?.message || "Allocation failed.");
      }
    } catch (err: any) {
      setOverrideError(err.message || "Request failed.");
    } finally {
      setAllocating(false);
    }
  };

  const handleManualOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocationResult?.fulfillment?.id) return;
    try {
      setOverrideSubmitting(true);
      setOverrideError(null);
      setOverrideSuccess(null);

      // Attempt to override allocation to the selected warehouse
      const qty = parseInt(overrideQty) || 8;
      const res = await fetch("/api/fulfillment/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillmentId: allocationResult.fulfillment.id,
          proposedSplits: [
            {
              orderLineId: "ol-laptop-demo1",
              warehouseId: overrideWarehouseId,
              quantity: qty,
            },
          ],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOverrideSuccess("Manual warehouse override validated and applied successfully!");
        setShowOverrideModal(false);
        fetchData();
        // Re-read fulfillment
        setAllocationResult((prev: any) => ({
          ...prev,
          fulfillment: data.data,
        }));
      } else {
        setOverrideError(data.error?.message || "Override failed validation.");
      }
    } catch (err: any) {
      setOverrideError(err.message || "Request failed.");
    } finally {
      setOverrideSubmitting(false);
    }
  };

  return (
    <main className={s.page}>
      <div className={s.container}>
        <div className={s.header}>
          <div className={s.headerContent}>
            <div className={s.headerIcon}>
              <Truck size={14} />
              Fulfillment Operations
            </div>
            <h1 className={s.title}>Multi-warehouse fulfillment &amp; backorders</h1>
            <p className={s.subtitle}>
              Multi-factor scoring (distance, shipping base cost, shipment consolidation) with backend stock validation.
            </p>
          </div>
          <div className={s.headerActions}>
            <button className={s.primaryBtn} onClick={handleRunAllocation} disabled={allocating}>
              <Sparkles size={14} />
              {allocating ? "Running..." : "Simulate allocation on demo order"}
            </button>
          </div>
        </div>

        {overrideSuccess && (
          <div className={`${s.alert} ${s.alertSuccess}`}>
            <CheckCircle2 size={18} />
            <span>{overrideSuccess}</span>
          </div>
        )}
        {overrideError && (
          <div className={`${s.alert} ${s.alertError}`}>
            <AlertTriangle size={18} />
            <span>{overrideError}</span>
          </div>
        )}

        <div className={s.warehouseGrid}>
          {warehouses.map((wh) => (
            <div key={wh.id} className={s.warehouseCard}>
              <div className={s.warehouseHeader}>
                <h3 className={s.warehouseName}>{wh.name}</h3>
                <span className={s.badgeInfo}>Priority {wh.priority}</span>
              </div>
              <p className={s.warehouseMeta}>
                {Number(wh.latitude).toFixed(2)}, {Number(wh.longitude).toFixed(2)} · ${Number(wh.shippingBaseCost).toFixed(2)} base rate
              </p>
              <div className={s.warehouseDivider} />
              <p className={s.stockTitle}>Stock</p>
              {wh.stocks?.length > 0 ? (
                <ul className={s.stockList}>
                  {wh.stocks.map((st: any) => {
                    const usable = st.availableQuantity - st.reservedQuantity;
                    return (
                      <li key={st.id} className={s.stockItem}>
                        <span className={s.stockProduct}>{st.product?.name}</span>
                        <span>
                          <span className={s.stockQty}>{usable}</span>
                          <span className={s.stockOnHand}>({st.availableQuantity} on hand)</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <span className="text-xs text-[var(--muted-foreground)]">No stock recorded</span>
              )}
            </div>
          ))}
        </div>

        {allocationResult && (
          <div className={`${s.card} ${s.cardHighlight} ${s.animateFadeIn}`}>
            <div className={s.sectionTitle}>
              <span className={s.sectionIcon}><Truck size={18} /></span>
              Order fulfillment plan: {allocationResult.fulfillment.orderId}
            </div>

            <div className={s.statsRow}>
              <div className={s.statBox}>
                <p className={s.statLabel}>Fulfillment status</p>
                <p className={`${s.statValue} ${s.statValuePositive}`}>{allocationResult.fulfillment.status}</p>
              </div>
              <div className={s.statBox}>
                <p className={s.statLabel}>Consolidated shipments</p>
                <p className={s.statValue}>{allocationResult.shipmentCount} shipments</p>
              </div>
              <div className={s.statBox}>
                <p className={s.statLabel}>Total shipping cost</p>
                <p className={`${s.statValue} ${s.statValueBrand}`}>${Number(allocationResult.estimatedShippingCost).toFixed(2)}</p>
              </div>
            </div>

            <div className={s.sectionTitle} style={{marginTop: '1.5rem'}}>
              <span className={s.sectionIcon}><WarehouseIcon size={16} /></span>
              Greedy warehouse allocations
            </div>
            <div className={s.tableCard}>
              <div className={s.tableWrapper}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Order line</th>
                      <th>Allocated warehouse</th>
                      <th>Quantity</th>
                      <th>Shipping cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocationResult.allocations.map((alloc: any, idx: number) => {
                      const wh = warehouses.find((w) => w.id === alloc.warehouseId);
                      return (
                        <tr key={idx}>
                          <td className={s.cellMuted}>{alloc.orderLineId}</td>
                          <td className={s.cellPrimary}>{wh?.name ?? alloc.warehouseId}</td>
                          <td className={s.cellPrimary}>{alloc.quantity} units</td>
                          <td className={s.cellMono}>${alloc.shippingCost.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end'}}>
              <button className={s.secondaryBtn} onClick={() => { setOverrideQty("8"); setShowOverrideModal(true); }}>
                <Edit3 size={14} />
                Test manual override
              </button>
            </div>
          </div>
        )}

        <div className={`${s.card} ${s.animateFadeIn}`} style={{marginTop: '2rem'}}>
          <div className={s.sectionTitle}>
            <span className={s.sectionIcon}><Clock size={16} /></span>
            Backorders log
          </div>
          <p className={s.subtitle} style={{marginBottom: '1.5rem'}}>
            Created automatically when usable inventory across all warehouses can't fulfill a line quantity.
          </p>

          {backorders.length === 0 ? (
            <div className="px-2 py-8 text-center text-sm text-[var(--muted-foreground)]">
              No open backorders.
            </div>
          ) : (
            <div className={s.tableCard}>
              <div className={s.tableWrapper}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Backorder ID</th>
                      <th>Order line</th>
                      <th>Unfulfilled</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backorders.map((bo) => (
                      <tr key={bo.id}>
                        <td className={s.cellMuted}>{bo.id}</td>
                        <td className={s.cellPrimary}>{bo.orderLineId}</td>
                        <td className={s.cellPrimary}>{bo.quantity} units</td>
                        <td><span className={`${s.statusBadge} ${s.badgePending}`}>{bo.status}</span></td>
                        <td className={s.cellMuted}>{new Date(bo.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showOverrideModal && (
        <div className={s.modal}>
          <div className={s.modalContent}>
            <div className={s.modalHeader}>
              <div>
                <h2 className={s.modalTitle}>Manual warehouse override</h2>
                <p className={s.modalDescription}>Reassign order fulfillment to a specific warehouse. Stock is strictly validated on the backend.</p>
              </div>
              <button className={s.modalClose} onClick={() => setShowOverrideModal(false)}>
                ✕
              </button>
            </div>
            <div className={s.modalBody}>
              <form onSubmit={handleManualOverride}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Destination warehouse</label>
                  <select
                    className={s.formSelect}
                    value={overrideWarehouseId}
                    onChange={(e) => setOverrideWarehouseId(e.target.value)}
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} (Priority {w.priority})
                      </option>
                    ))}
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Quantity to ship</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={overrideQty}
                    onChange={(e) => setOverrideQty(e.target.value)}
                    className={s.formInput}
                  />
                  <p className={s.formHint}>Testing with &gt; 5 units on New York will trigger a backend stock validation error.</p>
                </div>
              </form>
            </div>
            <div className={s.modalFooter}>
              <button className={s.ghostBtn} onClick={() => setShowOverrideModal(false)}>
                Cancel
              </button>
              <button className={s.primaryBtn} onClick={handleManualOverride} disabled={overrideSubmitting}>
                {overrideSubmitting ? "Applying..." : "Apply override"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

