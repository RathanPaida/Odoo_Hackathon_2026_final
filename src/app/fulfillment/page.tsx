"use client";

import { useState, useEffect } from "react";
import { NavigationHeader } from "@/components/NavigationHeader";
import { 
  Truck, 
  Warehouse as WarehouseIcon, 
  Package, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Edit3, 
  Plus, 
  ArrowRight, 
  DollarSign, 
  Clock,
  Sparkles,
  Sliders
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <NavigationHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Truck className="h-4 w-4" />
              <span>Person 2 Responsibility</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Multi-Warehouse Fulfillment & Backorders</h1>
            <p className="text-slate-400 text-sm mt-1">
              Multi-factor scoring algorithm (distance, shipping base cost, shipment consolidation penalty) with backend stock validation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunAllocation}
              disabled={allocating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {allocating ? "Running Algorithm..." : "Simulate Allocation on Demo Order"}
            </button>
          </div>
        </div>

        {/* Alerts */}
        {overrideSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            {overrideSuccess}
          </div>
        )}
        {overrideError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            {overrideError}
          </div>
        )}

        {/* Warehouses Grid */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <WarehouseIcon className="h-5 w-5 text-indigo-400" />
            Active Regional Warehouses
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {warehouses.map((wh) => (
              <div
                key={wh.id}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                      Priority {wh.priority}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {Number(wh.latitude).toFixed(2)}, {Number(wh.longitude).toFixed(2)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mt-1">{wh.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-500" />
                    Base Shipping Rate: ${Number(wh.shippingBaseCost).toFixed(2)}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <span className="text-xs text-slate-500 block mb-1 font-medium">Stock Levels:</span>
                  <div className="space-y-1">
                    {wh.stocks && wh.stocks.length > 0 ? (
                      wh.stocks.map((st: any) => {
                        const usable = st.availableQuantity - st.reservedQuantity;
                        return (
                          <div key={st.id} className="flex justify-between items-center text-xs">
                            <span className="text-slate-300 truncate max-w-[140px]">{st.product?.name}</span>
                            <span className="font-mono">
                              <span className="font-semibold text-emerald-400">{usable} usable</span>
                              <span className="text-slate-500 text-[10px] ml-1">({st.availableQuantity} avail)</span>
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-600">No stock recorded</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Allocation Visualizer Banner */}
        {allocationResult && (
          <div className="mb-10 rounded-2xl border border-indigo-900/60 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                  Multi-Warehouse Split Result (Section 15)
                </span>
                <h2 className="text-xl font-black text-white">
                  Order Fulfillment Plan: {allocationResult.fulfillment.orderId}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setOverrideQty("8");
                    setShowOverrideModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                >
                  <Edit3 className="h-3.5 w-3.5 text-indigo-400" />
                  Test Manual Override
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">Fulfillment Status</span>
                <span className="text-lg font-bold text-emerald-400 mt-1 block">
                  {allocationResult.fulfillment.status}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">Consolidated Shipments</span>
                <span className="text-lg font-bold text-white mt-1 block">
                  {allocationResult.shipmentCount} Shipments
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">Total Shipping Cost</span>
                <span className="text-lg font-bold text-indigo-300 mt-1 block">
                  ${Number(allocationResult.estimatedShippingCost).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Split Breakdown */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Greedy Warehouse Allocations:</h3>
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Order Line</th>
                      <th className="p-3">Allocated Warehouse</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Shipping Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {allocationResult.allocations.map((alloc: any, idx: number) => {
                      const wh = warehouses.find((w) => w.id === alloc.warehouseId);
                      return (
                        <tr key={idx} className="hover:bg-slate-800/20">
                          <td className="p-3 font-mono text-slate-300">{alloc.orderLineId}</td>
                          <td className="p-3 font-medium text-white">{wh?.name ?? alloc.warehouseId}</td>
                          <td className="p-3 font-bold text-indigo-400">{alloc.quantity} units</td>
                          <td className="p-3 text-slate-300 font-medium">${alloc.shippingCost.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Backorders Section */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                Backorders Log
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically created when usable inventory across all warehouses cannot fulfill line quantity.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 text-slate-300">
              {backorders.length} Open Backorders
            </span>
          </div>

          {backorders.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No open backorders currently.</p>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Backorder ID</th>
                    <th className="p-3">Order Line</th>
                    <th className="p-3">Unfulfilled Quantity</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {backorders.map((bo) => (
                    <tr key={bo.id}>
                      <td className="p-3 font-mono text-slate-400">{bo.id}</td>
                      <td className="p-3 font-mono text-slate-300">{bo.orderLineId}</td>
                      <td className="p-3 font-bold text-amber-400">{bo.quantity} units</td>
                      <td className="p-3">
                        <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          {bo.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{new Date(bo.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Manual Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Manual Warehouse Override</h2>
            <p className="text-xs text-slate-400 mb-5">
              Reassign order fulfillment to a specific warehouse. Stock is strictly validated on the backend.
            </p>

            <form onSubmit={handleManualOverride} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Destination Warehouse
                </label>
                <select
                  value={overrideWarehouseId}
                  onChange={(e) => setOverrideWarehouseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Priority {w.priority})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Quantity to Ship
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={overrideQty}
                  onChange={(e) => setOverrideQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Tip: Testing with &gt; 5 units on New York will trigger backend stock validation error!
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overrideSubmitting}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {overrideSubmitting ? "Validating..." : "Apply Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
