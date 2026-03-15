"use client";

import { useEffect, useState } from "react";
import { api, type KanbanLead, type PipelineRun } from "@/lib/api";
import { cn, CATEGORY_COLORS, timeAgo } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";

const COLUMNS = [
  { key: "discovered", label: "Discovered", dot: "bg-blue-400" },
  { key: "analyzed", label: "Analyzed", dot: "bg-purple-400" },
  { key: "engaging", label: "Engaging", dot: "bg-orange-400" },
  { key: "messaged", label: "Messaged", dot: "bg-indigo-400" },
  { key: "replied", label: "Replied", dot: "bg-emerald-400" },
  { key: "active", label: "Active", dot: "bg-indigo-400" },
];

function displayNameForLead(lead: KanbanLead) {
  if (lead.display_name?.trim()) return lead.display_name.trim();
  return lead.username
    .replace(/^u\//, "")
    .replaceAll("_", " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function initialsForLead(lead: KanbanLead) {
  const parts = displayNameForLead(lead).split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function labelRunType(t: string) {
  return t
    .replace(/_/g, " ")
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function LeadCardMini({ lead }: { lead: KanbanLead }) {
  return (
    <Link href={`/lead/${lead.id}`}>
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 hover:border-orange-400/30">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-100 truncate">u/{lead.username}</p>
          <p
            className={cn(
              "text-[11px] font-semibold",
              lead.match_score >= 70 ? "text-emerald-300" : lead.match_score >= 50 ? "text-amber-300" : "text-slate-400"
            )}
          >
            {lead.match_score.toFixed(0)}
          </p>
        </div>
        {lead.primary_category && (
          <span
            className={cn(
              "inline-block rounded-full px-2 py-0.5 text-[11px] border",
              CATEGORY_COLORS[lead.primary_category] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30"
            )}
          >
            {lead.primary_category}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function PipelineKanbanPage() {
  const [kanban, setKanban] = useState<Record<string, KanbanLead[]>>({});
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string>("discovered");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [kanbanData, runsData] = await Promise.all([api.getKanban(), api.getPipelineRuns()]);
        setKanban(kanbanData);
        setRuns(runsData);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.warn(`Failed to fetch pipeline data: ${message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  const activeLeads = kanban[activeStage] ?? [];

  return (
    <>
      {/* ───── MOBILE ───── */}
      <div className="lg:hidden -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 -mb-20 min-h-screen bg-[#23140f] flex flex-col">
        {/* Header – matches design: filter icon · title · search · avatar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-orange-500/10 bg-[#23140f]/80 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
              <Filter className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">MoreChats</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400">
              <Search className="h-5 w-5" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/20 text-xs font-bold text-orange-500">
              MC
            </div>
          </div>
        </header>

        {/* Stage tab bar – horizontal scroll */}
        <div className="sticky top-[52px] z-30 overflow-x-auto border-b border-orange-500/5 bg-[#23140f] no-scrollbar">
          <div className="flex min-w-max gap-6 px-4">
            {COLUMNS.map((col) => {
              const count = kanban[col.key]?.length ?? 0;
              const active = activeStage === col.key;
              return (
                <button
                  key={col.key}
                  onClick={() => setActiveStage(col.key)}
                  className={cn(
                    "relative flex items-center gap-1.5 py-4 text-sm font-semibold transition-colors",
                    active ? "text-orange-500" : "text-slate-500"
                  )}
                >
                  {col.label}
                  <span
                    className={cn(
                      "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none",
                      active ? "bg-orange-500/20 text-orange-500" : "bg-slate-800 text-slate-400"
                    )}
                  >
                    {count}
                  </span>
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 px-4 pb-32 pt-5">
          {/* Recent Runs */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Recent Runs</h3>
              <button className="text-xs font-semibold text-orange-500">View All</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {runs.length === 0 ? (
                <div className="w-full rounded-xl border border-slate-800 bg-slate-800/50 p-4 text-sm text-slate-400">
                  No pipeline runs yet.
                </div>
              ) : (
                runs.slice(0, 8).map((run) => (
                  <div
                    key={run.id}
                    className="w-44 shrink-0 rounded-xl border border-slate-800 bg-slate-800/50 p-3 shadow-sm"
                  >
                    <p className="truncate text-xs font-bold text-white">{labelRunType(run.run_type)}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {run.started_at ? timeAgo(run.started_at) : "just now"}
                    </p>
                    <div
                      className={cn(
                        "mt-2 flex items-center gap-1 text-[10px] font-semibold",
                        run.status === "completed"
                          ? "text-green-500"
                          : run.status === "failed"
                            ? "text-red-500"
                            : "text-orange-500"
                      )}
                    >
                      {run.status === "completed" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      )}
                      {run.status === "completed" ? "Completed" : "Running..."}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Lead cards */}
          <section>
            <h3 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              {activeStage} Leads
            </h3>
            <div className="space-y-3">
              {activeLeads.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-8 text-center text-sm text-slate-500">
                  No leads in this stage.
                </div>
              ) : (
                activeLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex gap-4 rounded-xl border border-slate-800 bg-slate-800/40 p-4"
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800 text-lg font-bold text-slate-300">
                      {initialsForLead(lead)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 pr-2">
                          <h4 className="truncate text-base font-bold text-white">{displayNameForLead(lead)}</h4>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {lead.primary_category ?? "Reddit"} &bull; Technology
                          </p>
                        </div>
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10 px-1.5 text-[10px] font-black text-orange-500">
                          {lead.match_score.toFixed(0)}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Link
                          href={`/lead/${lead.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-[10px] font-bold text-white"
                        >
                          Details <ArrowRight className="h-3 w-3" />
                        </Link>
                        <button className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-2 py-1.5 text-slate-400">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* FAB */}
        <button className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/40">
          <Plus className="h-7 w-7" />
        </button>
      </div>

      {/* ───── DESKTOP ───── */}
      <div className="hidden lg:block space-y-6">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">Pipeline</h1>
          <p className="text-slate-400 mt-1">Kanban view for your outreach lifecycle.</p>
        </header>

        <section className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-max">
            {COLUMNS.map((col) => {
              const leads = kanban[col.key] ?? [];
              return (
                <div key={col.key} className="w-72 rounded-2xl border border-slate-800 bg-slate-900/40">
                  <div className="flex items-center justify-between p-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className={cn("size-2 rounded-full", col.dot)} />
                      <p className="text-sm font-semibold text-slate-200">{col.label}</p>
                    </div>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">{leads.length}</span>
                  </div>
                  <div className="space-y-2 p-3 max-h-[60vh] overflow-y-auto">
                    {leads.length === 0 ? (
                      <p className="text-xs text-slate-500 py-3 text-center">No leads</p>
                    ) : (
                      leads.map((lead) => <LeadCardMini key={lead.id} lead={lead} />)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Recent Pipeline Runs</h2>
          <div className="space-y-3">
            {runs.length === 0 ? (
              <p className="text-sm text-slate-500">No pipeline runs yet.</p>
            ) : (
              runs.slice(0, 10).map((run) => (
                <div
                  key={run.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <p className="text-sm text-slate-300 capitalize">{run.run_type.replace(/_/g, " ")}</p>
                  <span
                    className={cn(
                      "text-xs capitalize",
                      run.status === "completed" ? "text-emerald-300" : run.status === "failed" ? "text-red-300" : "text-amber-300"
                    )}
                  >
                    {run.status}
                  </span>
                  {(run.leads_discovered ?? 0) > 0 && (
                    <span className="text-xs text-orange-300">{run.leads_discovered} leads</span>
                  )}
                  {run.status === "completed" && <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto" />}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}
