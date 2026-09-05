"use client";

import { useState, useEffect } from "react";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Card, CardHeader, CardTitle, Badge, Button, Modal, Field, Select, Input } from "@/components/ui";
import {
  Truck,
  Warehouse as WarehouseIcon,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Clock,
  Sparkles,
} from "lucide-react";

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
    <main className="surface-page min-h-screen flex flex-col">
      <NavigationHeader />

      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <Card tone="paper" className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                Multi-warehouse fulfillment &amp; backorders
              </h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Multi-factor scoring (distance, shipping base cost, shipment consolidation) with backend stock validation.
              </p>
            </div>
            <Button onClick={handleRunAllocation} loading={allocating} leftIcon={<Sparkles size={14} />}>
              Simulate allocation on demo order
            </Button>
          </div>
        </Card>

        {overrideSuccess && (
          <Card tone="paper" className="mb-6 p-4 flex items-center gap-2 bg-[var(--status-approved-bg)] border-[var(--status-approved-bd)]">
            <CheckCircle2 className="h-5 w-5 text-[var(--status-approved-fg)]" />
            <span className="text-sm font-medium text-[var(--status-approved-fg)]">{overrideSuccess}</span>
          </Card>
        )}
        {overrideError && (
          <Card tone="paper" className="mb-6 p-4 flex items-center gap-2 bg-[var(--status-rejected-bg)] border-[var(--status-rejected-bd)]">
            <AlertTriangle className="h-5 w-5 text-[var(--status-rejected-fg)]" />
            <span className="text-sm font-medium text-[var(--status-rejected-fg)]">{overrideError}</span>
          </Card>
        )}

        <div className="mb-10">
          <h2 className="text-base font-semibold tracking-tight mb-4 flex items-center gap-2 text-[var(--foreground)]">
            <WarehouseIcon className="h-4 w-4 text-[var(--primary-hover)]" />
            Active regional warehouses
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {warehouses.map((wh) => (
              <Card key={wh.id} tone="paper" className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Badge tone="info">Priority {wh.priority}</Badge>
                  <span className="text-xs text-[var(--muted-foreground)] tabular">
                    {Number(wh.latitude).toFixed(2)}, {Number(wh.longitude).toFixed(2)}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)]">{wh.name}</h3>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Base shipping rate: ${Number(wh.shippingBaseCost).toFixed(2)}
                  </p>
                </div>
                <div className="pt-3 border-t border-[var(--paper-border)]">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                    Stock
                  </p>
                  {wh.stocks?.length > 0 ? (
                    <ul className="space-y-1 text-xs tabular">
                      {wh.stocks.map((st: any) => {
                        const usable = st.availableQuantity - st.reservedQuantity;
                        return (
                          <li key={st.id} className="flex justify-between items-center">
                            <span className="truncate max-w-[140px] text-[var(--muted-foreground)]">
                              {st.product?.name}
                            </span>
                            <span>
                              <span className="font-semibold text-[var(--status-approved-fg)]">{usable}</span>
                              <span className="text-[var(--muted-foreground)] ml-1 text-[10px]">
                                ({st.availableQuantity} on hand)
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <span className="text-xs text-[var(--muted-foreground)]">No stock recorded</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {allocationResult && (
          <Card tone="paper" className="mb-10 border-[var(--primary)]/30 bg-[var(--background)]/40">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-4 border-b border-[var(--paper-border)]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--primary-hover)] mb-1">
                  Multi-warehouse split result
                </p>
                <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                  Order fulfillment plan: {allocationResult.fulfillment.orderId}
                </h2>
              </div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Edit3 size={14} />}
                onClick={() => {
                  setOverrideQty("8");
                  setShowOverrideModal(true);
                }}
              >
                Test manual override
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <SummaryStat
                label="Fulfillment status"
                value={allocationResult.fulfillment.status}
                tone="positive"
              />
              <SummaryStat
                label="Consolidated shipments"
                value={`${allocationResult.shipmentCount} shipments`}
              />
              <SummaryStat
                label="Total shipping cost"
                value={`$${Number(allocationResult.estimatedShippingCost).toFixed(2)}`}
                tone="brand"
              />
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                Greedy warehouse allocations
              </h3>
              <Card tone="paper" className="overflow-hidden">
                <table className="w-full text-xs text-left tabular">
                  <thead className="bg-[var(--background)] text-[var(--muted-foreground)] uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">Order line</th>
                      <th className="px-4 py-2.5">Allocated warehouse</th>
                      <th className="px-4 py-2.5">Quantity</th>
                      <th className="px-4 py-2.5">Shipping cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocationResult.allocations.map((alloc: any, idx: number) => {
                      const wh = warehouses.find((w) => w.id === alloc.warehouseId);
                      return (
                        <tr key={idx} className="border-t border-[var(--paper-border)]">
                          <td className="px-4 py-2.5 text-[var(--muted-foreground)]">{alloc.orderLineId}</td>
                          <td className="px-4 py-2.5 font-medium">{wh?.name ?? alloc.warehouseId}</td>
                          <td className="px-4 py-2.5 text-[var(--primary-hover)] font-semibold">
                            {alloc.quantity} units
                          </td>
                          <td className="px-4 py-2.5">${alloc.shippingCost.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
          </Card>
        )}

        <Card tone="paper">
          <CardHeader>
            <div>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[var(--status-pending-fg)]" />
                  Backorders log
                </span>
              </CardTitle>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Created automatically when usable inventory across all warehouses can’t fulfill a line quantity.
              </p>
            </div>
            <Badge tone={backorders.length > 0 ? "pending" : "neutral"} dot>
              {backorders.length} open
            </Badge>
          </CardHeader>

          {backorders.length === 0 ? (
            <div className="px-2 py-8 text-center text-sm text-[var(--muted-foreground)]">
              No open backorders.
            </div>
          ) : (
            <Card tone="paper" className="overflow-hidden">
              <table className="w-full text-xs text-left tabular">
                <thead className="bg-[var(--background)] text-[var(--muted-foreground)] uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5">Backorder ID</th>
                    <th className="px-4 py-2.5">Order line</th>
                    <th className="px-4 py-2.5">Unfulfilled</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {backorders.map((bo) => (
                    <tr key={bo.id} className="border-t border-[var(--paper-border)]">
                      <td className="px-4 py-2.5 text-[var(--muted-foreground)]">{bo.id}</td>
                      <td className="px-4 py-2.5">{bo.orderLineId}</td>
                      <td className="px-4 py-2.5 text-[var(--status-pending-fg)] font-semibold">{bo.quantity} units</td>
                      <td className="px-4 py-2.5">
                        <Badge tone="pending">{bo.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
                        {new Date(bo.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </Card>
      </div>

      {/* Manual Override Modal */}
      <Modal
        open={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        title="Manual warehouse override"
        description="Reassign order fulfillment to a specific warehouse. Stock is strictly validated on the backend."
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowOverrideModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleManualOverride} loading={overrideSubmitting}>
              Apply override
            </Button>
          </div>
        }
      >
        <form onSubmit={handleManualOverride} className="space-y-4">
          <Field label="Destination warehouse" htmlFor="wh">
            <Select
              id="wh"
              value={overrideWarehouseId}
              onChange={(e) => setOverrideWarehouseId(e.target.value)}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Priority {w.priority})
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Quantity to ship"
            htmlFor="qty"
            hint="Testing with > 5 units on New York will trigger a backend stock validation error."
          >
            <Input
              id="qty"
              type="number"
              min={1}
              required
              value={overrideQty}
              onChange={(e) => setOverrideQty(e.target.value)}
            />
          </Field>
        </form>
      </Modal>
    </main>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "brand";
}) {
  const valueColor =
    tone === "positive" ? "text-emerald-400" : tone === "brand" ? "text-[var(--primary-hover)]" : "";
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className={`mt-1 text-lg font-semibold tabular ${valueColor}`}>{value}</p>
    </div>
  );
}
