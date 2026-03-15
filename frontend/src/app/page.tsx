"use client";

import { useCallback, useEffect, useState } from "react";
import LeadCard from "@/components/LeadCard";
import { api, type Lead, type PipelineStats } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Bell, ChevronDown, Loader2, Search, Sparkles, TrendingUp } from "lucide-react";

const CATEGORIES = [
  "ambitious",
  "romantic",
  "sweet",
  "friend",
  "fling",
  "nurturer",
] as const;

const SORT_OPTIONS = [
  { value: "discovered_at", label: "Newest" },
  { value: "match_score", label: "Match" },
  { value: "approachability_score", label: "Approachability" },
] as const;

export default function DiscoveryFeed() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("discovered_at");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        platform: "reddit",
        sort_by: sortBy,
        sort_order: "desc",
      };
      if (categoryFilter) params.category = categoryFilter;

      const [leadsData, statsData] = await Promise.all([api.getLeads(params), api.getStats()]);
      setLeads(leadsData);
      setStats(statsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.warn(`Failed to fetch leads/stats: ${message}`);
      setLeads([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, sortBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function triggerAction(fn: () => Promise<unknown>, actionId: string) {
    setActionLoading(actionId);
    try {
      await fn();
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.warn(`Action failed: ${message}`);
    } finally {
      setActionLoading(null);
    }
  }

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Newest";

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-orange-400/40 focus:outline-none"
              placeholder="Search leads, subreddits, or keywords..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerAction(api.triggerRedditScan, "reddit-scan")}
              disabled={!!actionLoading}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400",
                actionLoading === "reddit-scan" && "opacity-60 cursor-not-allowed"
              )}
            >
              {actionLoading === "reddit-scan" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Run Reddit Scan
            </button>
            <button
              onClick={() => triggerAction(api.triggerReplyCheck, "reply-check")}
              disabled={!!actionLoading}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border border-orange-400/30 bg-orange-500/10 px-4 py-2.5 text-sm font-semibold text-orange-200 transition hover:bg-orange-500/20",
                actionLoading === "reply-check" && "opacity-60 cursor-not-allowed"
              )}
            >
              {actionLoading === "reply-check" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Check Replies
            </button>
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200">
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {stats && (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Total Leads</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-slate-100">{stats.total_leads}</p>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                <TrendingUp className="h-3.5 w-3.5" /> steady
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Reply Rate</p>
            <p className="text-3xl font-bold text-emerald-300">{stats.response_rate.toFixed(1)}%</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Leads This Week</p>
            <p className="text-3xl font-bold text-orange-300">{stats.by_platform?.reddit ?? 0}</p>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  categoryFilter === cat
                    ? "border-orange-400/40 bg-orange-500/20 text-orange-200"
                    : "border-slate-700 bg-slate-950/70 text-slate-400 hover:text-slate-200"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative">
            <button
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-300"
            >
              {sortLabel}
              <ChevronDown className={cn("h-4 w-4 transition-transform", sortDropdownOpen && "rotate-180")} />
            </button>
            {sortDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortDropdownOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-2 min-w-[180px] rounded-lg border border-slate-700 bg-slate-950 py-1 shadow-xl">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSortBy(opt.value);
                        setSortDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2 text-left text-sm",
                        sortBy === opt.value ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
            <p className="text-slate-300">No leads found for current filters.</p>
            <button
              onClick={() => triggerAction(api.triggerRedditScan, "reddit-scan")}
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Run Reddit Scan
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
