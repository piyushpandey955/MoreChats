"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type PipelineStats } from "@/lib/api";
import { cn, CATEGORY_COLORS, CATEGORY_LABELS, STATUS_COLORS } from "@/lib/utils";
import { Loader2, MessageCircle, TrendingUp, Users } from "lucide-react";

const PIPELINE_STATUS_ORDER = [
  "discovered",
  "analyzed",
  "engaging",
  "messaged",
  "replied",
  "active",
  "archived",
];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        setStats(await api.getStats());
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.warn(`Failed to fetch stats: ${message}`);
        setStats(null);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const categoryEntries = useMemo(
    () => Object.entries(stats?.by_category ?? {}).sort((a, b) => b[1] - a[1]),
    [stats]
  );
  const statusEntries = useMemo(
    () =>
      PIPELINE_STATUS_ORDER.filter((s) => (stats?.by_status ?? {})[s] !== undefined).map((s) => ({
        status: s,
        count: stats?.by_status[s] ?? 0,
      })),
    [stats]
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
        Failed to load analytics.
      </div>
    );
  }

  const maxCategory = Math.max(...Object.values(stats.by_category ?? {}), 1);
  const maxStatus = Math.max(...Object.values(stats.by_status ?? {}), 1);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">Analytics</h1>
        <p className="mt-1 text-slate-400">Realtime pipeline performance and conversion signals.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-500/10 p-2 text-orange-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Total Leads</p>
              <p className="text-2xl font-bold text-slate-100">{stats.total_leads}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Overall Reply Rate</p>
              <p className="text-2xl font-bold text-emerald-300">{stats.response_rate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-500/10 p-2 text-orange-300">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Reddit Reply Rate</p>
              <p className="text-2xl font-bold text-orange-300">{stats.reddit_response_rate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Leads by Category</h2>
        <div className="space-y-4">
          {categoryEntries.length === 0 ? (
            <p className="text-sm text-slate-500">No category data yet.</p>
          ) : (
            categoryEntries.map(([cat, count]) => (
              <div key={cat}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-slate-300">{CATEGORY_LABELS[cat] ?? cat}</span>
                  <span className="text-sm font-semibold text-slate-100">{count}</span>
                </div>
                <div className="h-7 rounded-lg bg-slate-950/70 overflow-hidden">
                  <div
                    className={cn("h-full border", CATEGORY_COLORS[cat] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30")}
                    style={{ width: `${(count / maxCategory) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Status Funnel</h2>
        <div className="space-y-4">
          {statusEntries.length === 0 ? (
            <p className="text-sm text-slate-500">No status data yet.</p>
          ) : (
            statusEntries.map(({ status, count }) => (
              <div key={status}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm capitalize text-slate-300">{status}</span>
                  <span className="text-sm font-semibold text-slate-100">{count}</span>
                </div>
                <div className="h-7 rounded-lg bg-slate-950/70 overflow-hidden">
                  <div
                    className={cn("h-full", STATUS_COLORS[status] ?? "bg-slate-500/20 text-slate-300")}
                    style={{ width: `${(count / maxStatus) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
