"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type ChecklistItem, type PersonaData } from "@/lib/api";
import { CheckSquare, Loader2, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProfileSetupPage() {
  const [persona, setPersona] = useState<PersonaData | null>(null);
  const [redditChecklist, setRedditChecklist] = useState<ChecklistItem[]>([]);
  const [redditBioOptions, setRedditBioOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingBios, setGeneratingBios] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [personaData, rdList] = await Promise.all([api.getPersona(), api.getRedditChecklist()]);
        setPersona(personaData);
        setRedditChecklist(rdList);
        setRedditBioOptions(personaData?.platforms?.reddit?.bio_options ?? []);
      } catch (err) {
        console.error("Failed to fetch profile data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleGenerateRedditBios() {
    setGeneratingBios(true);
    try {
      const result = await api.generateBios("reddit");
      const variants = result?.variants ?? result?.bios ?? (Array.isArray(result) ? result : []);
      if (Array.isArray(variants)) {
        const texts = variants
          .map((v: { text?: string; bio?: string } | string) => (typeof v === "string" ? v : (v.text ?? v.bio ?? "")))
          .filter(Boolean);
        if (texts.length > 0) setRedditBioOptions(texts);
      }
    } catch (err) {
      console.error("Failed to generate bios:", err);
    } finally {
      setGeneratingBios(false);
    }
  }

  const redditData = persona?.platforms?.reddit;
  const readiness = useMemo(() => {
    if (!redditChecklist.length) return 0;
    return Math.round((redditChecklist.filter((i) => i.passed).length / redditChecklist.length) * 100);
  }, [redditChecklist]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">Profile Setup</h1>
        <p className="mt-1 text-slate-400">Build a trusted Reddit persona before outreach.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <h2 className="text-lg font-semibold text-slate-100 mb-3">Persona Summary</h2>
            <p className="text-sm text-slate-300">
              <span className="text-orange-300 font-medium">u/{redditData?.username ?? "—"}</span> · {persona?.archetype ?? "The Quiet Storm"}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-orange-300" />
              Reddit Readiness Checklist
            </h2>
            <div className="space-y-2">
              {redditChecklist.map((item) => (
                <label
                  key={item.key}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
                    item.passed
                      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                      : "border-slate-800 bg-slate-950/60 text-slate-300"
                  )}
                >
                  <input type="checkbox" defaultChecked={item.passed} className="accent-orange-500" />
                  <span>{item.label}</span>
                  <span className="ml-auto text-xs text-slate-500">{item.weight} pts</span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Bio Options</h2>
              <button
                onClick={handleGenerateRedditBios}
                disabled={generatingBios}
                className="inline-flex items-center gap-2 rounded-xl border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-200 hover:bg-orange-500/20 disabled:opacity-60"
              >
                {generatingBios ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Regenerate
              </button>
            </div>
            <div className="space-y-3">
              {redditBioOptions.map((bio, i) => (
                <div key={i} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
                  {bio}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-orange-400/20 bg-orange-500/10 p-5">
            <h3 className="text-lg font-semibold text-slate-100 mb-3">Readiness</h3>
            <p className="text-4xl font-bold text-orange-200 mb-1">{readiness}%</p>
            <p className="text-xs text-slate-400">Checklist completion score</p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Target Subreddits</h3>
            <div className="flex flex-wrap gap-2">
              {(redditData?.key_subreddits ?? []).map((sub) => (
                <span key={sub} className="rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-200">
                  {sub}
                </span>
              ))}
            </div>
            {redditData?.karma_target && <p className="mt-3 text-xs text-slate-500">Karma target: {redditData.karma_target}</p>}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-orange-300" />
              Comment Style Guide
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {redditData?.comment_style ??
                "Observational, philosophical but accessible, dry humor one-liners, warm when relevant. Quality over quantity."}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
