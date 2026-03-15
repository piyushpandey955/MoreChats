"use client";

import Link from "next/link";
import { cn, timeAgo } from "@/lib/utils";
import CategoryBadge from "./CategoryBadge";
import PlatformBadge from "./PlatformBadge";
import type { Lead } from "@/lib/api";

interface LeadCardProps {
  lead: Lead;
}

export default function LeadCard({ lead }: LeadCardProps) {
  return (
    <Link href={`/lead/${lead.id}`}>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 hover:border-orange-400/30 hover:bg-slate-900/70 transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <PlatformBadge platform={lead.platform} />
            <span className="text-xs text-slate-500">{timeAgo(lead.discovered_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-slate-500">Match</p>
              <p className={cn(
                "text-sm font-bold",
                lead.match_score >= 70 ? "text-emerald-400" :
                lead.match_score >= 50 ? "text-amber-300" : "text-slate-400"
              )}>
                {lead.match_score.toFixed(0)}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <h3 className="font-semibold text-slate-100 group-hover:text-orange-200 transition-colors">
            u/{lead.username}
          </h3>
          {lead.display_name && (
            <p className="text-sm text-slate-500">{lead.display_name}</p>
          )}
        </div>

        {lead.ai_analysis_summary && (
          <p className="text-xs text-slate-400 mb-3 line-clamp-2">
            {lead.ai_analysis_summary}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <CategoryBadge category={lead.primary_category} />
          {lead.age_estimate && (
            <span className="text-xs text-slate-500">Age ~{lead.age_estimate}</span>
          )}
          {lead.location && (
            <span className="text-xs text-slate-500">{lead.location}</span>
          )}
        </div>

        {lead.interest_tags && lead.interest_tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {lead.interest_tags.slice(0, 4).map((tag, i) => (
              <span key={i} className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
            {lead.interest_tags.length > 4 && (
              <span className="text-xs text-slate-500">+{lead.interest_tags.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
