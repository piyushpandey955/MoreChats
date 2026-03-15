"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Archive,
  UserPlus,
  Loader2,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { api, type Lead, type Message, type LeadDetail } from "@/lib/api";
import CategoryBadge from "@/components/CategoryBadge";
import PlatformBadge from "@/components/PlatformBadge";
import { cn, STATUS_COLORS } from "@/lib/utils";

const SCORE_LABELS: { key: keyof Lead; label: string }[] = [
  { key: "score_ambitious", label: "Ambitious" },
  { key: "score_romantic", label: "Romantic" },
  { key: "score_sweet", label: "Sweet" },
  { key: "score_friend", label: "Friend" },
  { key: "score_fling", label: "Fling" },
  { key: "score_nurturer", label: "Nurturer" },
];

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [data, setData] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [crafting, setCrafting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editedMessages, setEditedMessages] = useState<Record<number, string>>({});

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getLeadDetail(id);
      setData(res);
      setEditedMessages(
        Object.fromEntries((res.messages || []).map((m: Message) => [m.id, m.text]))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load lead");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleCraftMessages = async () => {
    setCrafting(true);
    try {
      const messages = await api.craftMessages(id);
      setData((prev) => (prev ? { ...prev, messages } : null));
      setEditedMessages(Object.fromEntries(messages.map((m) => [m.id, m.text])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to craft messages");
    } finally {
      setCrafting(false);
    }
  };

  const handleApproveSend = async (messageId: number) => {
    setActionLoading(`send-${messageId}`);
    try {
      const text = editedMessages[messageId];
      await api.approveMessage(messageId, text);
      await fetchDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMoveToEngaging = async () => {
    setActionLoading("engaging");
    try {
      await api.updateLeadStatus(id, "engaging");
      await fetchDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async () => {
    setActionLoading("archive");
    try {
      await api.archiveLead(id);
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to archive");
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-red-400 mb-4">{error || "Lead not found"}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>
    );
  }

  const { lead, reddit_user, messages } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to leads
      </Link>

      {/* Header Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              u/{lead.username}
            </h1>
            {lead.display_name && (
              <p className="text-slate-500 mt-0.5">{lead.display_name}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <PlatformBadge platform={lead.platform} size="md" />
              <CategoryBadge category={lead.primary_category} size="md" />
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium",
                  STATUS_COLORS[lead.status] || "bg-slate-500/20 text-slate-300 border-slate-500/30"
                )}
              >
                {lead.status}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Match</p>
            <p
              className={cn(
                "text-2xl font-bold",
                lead.match_score >= 70
                  ? "text-emerald-400"
                  : lead.match_score >= 50
                    ? "text-amber-400"
                    : "text-slate-400"
              )}
            >
              {lead.match_score.toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {/* Platform-specific profile */}
      {reddit_user && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Profile</h2>
          <div className="space-y-4">
            {(reddit_user.original_post_title || reddit_user.original_post_text) && (
              <div className="rounded-lg bg-slate-950/60 p-4 border border-slate-800">
                {reddit_user.original_post_title && (
                  <h3 className="font-medium text-slate-200 mb-2">
                    {reddit_user.original_post_title}
                  </h3>
                )}
                {reddit_user.original_post_text && (
                  <p className="text-sm text-slate-400 whitespace-pre-wrap">
                    {reddit_user.original_post_text}
                  </p>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
              <span>{reddit_user.karma.toLocaleString()} karma</span>
              {reddit_user.account_age_days != null && (
                <span>~{Math.floor(reddit_user.account_age_days / 365)}y old account</span>
              )}
            </div>
            {reddit_user.post_intent && (
              <p className="text-sm">
                <span className="text-slate-500">Intent: </span>
                <span className="text-slate-300">{reddit_user.post_intent}</span>
              </p>
            )}
            {reddit_user.active_subreddits &&
              reddit_user.active_subreddits.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                    Active subreddits
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {reddit_user.active_subreddits.slice(0, 10).map((s, i) => (
                      <span
                        key={i}
                        className="text-xs bg-slate-900 text-slate-400 px-2 py-1 rounded"
                      >
                        r/{s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-300" />
          AI Analysis
        </h2>
        <div className="space-y-4">
          {lead.personality_traits && lead.personality_traits.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                Personality traits
              </p>
              <div className="flex flex-wrap gap-2">
                {lead.personality_traits.map((t, i) => (
                  <span
                    key={i}
                    className="text-sm bg-slate-900 text-slate-300 px-3 py-1 rounded-lg"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {lead.interest_tags && lead.interest_tags.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                Interest tags
              </p>
              <div className="flex flex-wrap gap-2">
                {lead.interest_tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-sm bg-slate-900 text-slate-400 px-3 py-1 rounded-lg"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {lead.ai_analysis_summary && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                Summary
              </p>
              <p className="text-slate-300 text-sm leading-relaxed">
                {lead.ai_analysis_summary}
              </p>
            </div>
          )}
          {!lead.personality_traits?.length &&
            !lead.interest_tags?.length &&
            !lead.ai_analysis_summary && (
              <p className="text-slate-500 text-sm">No AI analysis available yet.</p>
            )}
        </div>
      </div>

      {/* Score bars */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Category scores</h2>
        <div className="space-y-3">
          {SCORE_LABELS.map(({ key, label }) => {
            const score = lead[key] as number;
            return (
              <div key={key} className="flex items-center gap-4">
                <span className="w-24 text-sm text-slate-400">{label}</span>
                <div className="flex-1 h-2.5 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500/70 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm text-slate-500">
                  {score.toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Message Variants */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-orange-300" />
          Message Variants
        </h2>
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">No messages crafted yet.</p>
            <button
              onClick={handleCraftMessages}
              disabled={crafting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
            >
              {crafting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Craft Messages
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {messages
              .sort((a, b) => a.variant_number - b.variant_number)
              .map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col"
                >
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                    Variant {msg.variant_number}
                  </p>
                  <textarea
                    value={editedMessages[msg.id] ?? msg.text}
                    onChange={(e) =>
                      setEditedMessages((prev) => ({ ...prev, [msg.id]: e.target.value }))
                    }
                    className="w-full min-h-[80px] p-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm resize-y mb-3 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                    placeholder="Message text..."
                  />
                  {msg.rationale && (
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                      {msg.rationale}
                    </p>
                  )}
                  <button
                    onClick={() => handleApproveSend(msg.id)}
                    disabled={
                      actionLoading === `send-${msg.id}` || msg.status === "sent"
                    }
                    className="mt-auto inline-flex items-center justify-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    {actionLoading === `send-${msg.id}` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {msg.status === "sent" ? "Sent" : "Approve & Send"}
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleMoveToEngaging}
          disabled={actionLoading === "engaging" || lead.status === "engaging"}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
        >
          {actionLoading === "engaging" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          Move to Engaging
        </button>
        <button
          onClick={handleArchive}
          disabled={actionLoading === "archive"}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:cursor-not-allowed text-slate-200 rounded-lg font-medium transition-colors"
        >
          {actionLoading === "archive" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Archive className="w-4 h-4" />
          )}
          Archive
        </button>
      </div>
    </div>
  );
}
