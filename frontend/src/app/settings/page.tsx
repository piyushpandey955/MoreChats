"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api, type RateLimits, type SettingsConfig } from "@/lib/api";
import { Calendar, Link2, Loader2, MapPin, MessageSquare, Shield, User, Zap } from "lucide-react";

export default function SettingsPage() {
  const [config, setConfig] = useState<SettingsConfig | null>(null);
  const [rateLimits, setRateLimits] = useState<RateLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [configData, limitsData] = await Promise.all([api.getConfig(), api.getRateLimits()]);
        setConfig(configData);
        setRateLimits(limitsData);
      } catch (err) {
        console.error("Failed to fetch settings:", err);
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

  const subreddits = config?.monitored_subreddits ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">Settings</h1>
        <p className="mt-1 text-slate-400">Configure account, limits, integrations, and safety controls.</p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Account Configuration</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard icon={<User className="h-4 w-4" />} label="Persona Name" value={config?.persona_name ?? "—"} />
          <InfoCard
            icon={<Link2 className="h-4 w-4" />}
            label="Reddit Handle"
            value={config?.reddit_handle ? `u/${config.reddit_handle}` : "—"}
          />
          <InfoCard icon={<Calendar className="h-4 w-4" />} label="Target Age Range" value={config?.target_age_range ?? "—"} />
          <InfoCard icon={<MapPin className="h-4 w-4" />} label="Target Location" value={config?.target_location ?? "—"} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Monitored Subreddits</h2>
        <div className="flex flex-wrap gap-2">
          {subreddits.length === 0 ? (
            <p className="text-sm text-slate-500">None configured</p>
          ) : (
            subreddits.map((sub) => (
              <span
                key={sub}
                className="rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-200"
              >
                r/{sub}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Rate Limits</h2>
        <div className="rounded-xl border border-orange-400/20 bg-orange-500/10 px-4 py-3 inline-flex items-center gap-3">
          <Zap className="h-4 w-4 text-orange-300" />
          <p className="text-sm text-orange-200">Reddit DMs/day: {rateLimits?.reddit?.max_dms_per_day ?? "—"}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Connection Status</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatusCard icon={<MessageSquare className="h-4 w-4" />} title="Reddit API" status="Connected" color="emerald" />
          <StatusCard icon={<Zap className="h-4 w-4" />} title="Gemini AI" status="Connected" color="blue" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Shield className="h-4 w-4 text-slate-400" />
          Safety Controls
        </h2>
        <div className="space-y-3">
          <ToggleRow title="Pause Automation" subtitle="Stop all outbound actions immediately." />
          <ToggleRow title="Quiet Hours" subtitle="Automatically pause outreach during configured hours." enabled />
        </div>
      </section>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex items-start gap-3">
      <div className="rounded-md bg-slate-900 p-2 text-slate-400">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-200">{value}</p>
      </div>
    </div>
  );
}

function StatusCard({
  icon,
  title,
  status,
  color,
}: {
  icon: ReactNode;
  title: string;
  status: string;
  color: "emerald" | "blue";
}) {
  const colorClasses =
    color === "emerald"
      ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-200"
      : "bg-blue-500/10 border-blue-400/30 text-blue-200";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-slate-900 p-2 text-slate-400">{icon}</div>
        <div>
          <p className="text-sm font-semibold text-slate-200">{title}</p>
          <p className="text-xs text-slate-500">{status}</p>
        </div>
      </div>
      <span className={`rounded-full border px-2 py-0.5 text-[11px] ${colorClasses}`}>Live</span>
    </div>
  );
}

function ToggleRow({ title, subtitle, enabled = false }: { title: string; subtitle: string; enabled?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <div
        className={`relative h-6 w-11 rounded-full ${enabled ? "bg-orange-500" : "bg-slate-700"}`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${enabled ? "right-1" : "left-1"}`}
        />
      </div>
    </div>
  );
}
