import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { NavigationHeader } from "@/components/NavigationHeader";
import Link from "next/link";
import { CheckSquare, ShieldCheck, Package, Truck, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ManagerDashboardPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SALES_MANAGER" && user.role !== "ADMIN")) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <NavigationHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        <header className="mb-8">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Management Console</span>
          <h1 className="text-3xl font-black text-white mt-1">Welcome back, {user.name}</h1>
          <p className="text-sm text-slate-400 mt-1">
            Sales Manager Workspace — Discount governance, quote approval queues, and catalog oversight.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/approvals"
            className="group p-6 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                  <CheckSquare className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Open Queue <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Approval Queue</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Review and decide on quotations flagged by the blended risk engine with line-by-line discount breakdown.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
              Multi-level governance with append-only audit trail
            </div>
          </Link>

          <Link
            href="/governance"
            className="group p-6 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-violet-600/10 text-violet-400 border border-violet-500/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold text-violet-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Configure <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Discount Governance</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Maintain customer-tier ceilings, category discount limits, and test live calculations in the simulator.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
              Gold / Silver / Bronze tiers and category caps
            </div>
          </Link>

          <Link
            href="/catalog"
            className="group p-6 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                  <Package className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Manage <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Product Catalog</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Browse catalog products, define base and cost pricing, target margins, and category structures.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
              One-Time & Subscription offerings
            </div>
          </Link>

          <Link
            href="/fulfillment"
            className="group p-6 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20">
                  <Truck className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  View Split Engine <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Warehouse & Fulfillment</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Monitor multi-warehouse inventory levels, fulfillment split allocations, and manage backorders.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
              Greedy multi-warehouse allocation with manual override
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
