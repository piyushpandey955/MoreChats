/**
 * API client for CircleBuilder backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API request failed");
  }
  return res.json();
}

export interface Lead {
  id: number;
  platform: "reddit";
  username: string;
  display_name: string | null;
  status: string;
  primary_category: string | null;
  source: string | null;
  score_ambitious: number;
  score_romantic: number;
  score_sweet: number;
  score_friend: number;
  score_fling: number;
  score_nurturer: number;
  match_score: number;
  approachability_score: number;
  age_estimate: number | null;
  location: string | null;
  personality_traits: string[] | null;
  interest_tags: string[] | null;
  ai_analysis_summary: string | null;
  discovered_at: string;
  last_interaction_at: string | null;
}

export interface PipelineStats {
  total_leads: number;
  by_status: Record<string, number>;
  by_platform: Record<string, number>;
  by_category: Record<string, number>;
  response_rate: number;
  reddit_response_rate: number;
}

export interface Message {
  id: number;
  lead_id: number;
  platform: "reddit";
  variant_number: number;
  text: string;
  rationale: string | null;
  status: string;
  send_method: string;
  sent_at: string | null;
  created_at: string;
}

export interface RedditUser {
  karma: number;
  account_age_days: number | null;
  active_subreddits: string[] | null;
  original_post_title: string | null;
  original_post_text: string | null;
  post_intent: string | null;
}

export interface LeadDetail {
  lead: Lead;
  reddit_user: RedditUser | null;
  messages: Message[];
}

export interface KanbanLead {
  id: number;
  platform: "reddit";
  username: string;
  display_name: string | null;
  primary_category: string | null;
  match_score: number;
  age_estimate?: number | null;
  discovered_at?: string | null;
}

export interface PipelineRun {
  id: number;
  platform: "reddit";
  run_type: string;
  started_at: string | null;
  finished_at: string | null;
  leads_discovered?: number;
  actions_taken?: number;
  status: string;
  errors?: string | null;
}

export interface PersonaData {
  archetype?: string;
  platforms?: {
    reddit?: {
      username?: string;
      bio_options?: string[];
      key_subreddits?: string[];
      karma_target?: string;
      comment_style?: string;
    };
  };
}

export interface ChecklistItem {
  key: string;
  label: string;
  weight: number;
  passed?: boolean;
  score?: number;
}

export interface SettingsConfig {
  persona_name?: string;
  reddit_handle?: string;
  target_age_range?: string;
  target_location?: string;
  monitored_subreddits?: string[];
}

export interface RateLimits {
  reddit?: {
    max_dms_per_day?: number;
  };
}

export interface BioVariant {
  text?: string;
  bio?: string;
  rationale?: string;
}

export interface BioVariantsResponse {
  variants?: BioVariant[];
  bios?: BioVariant[] | string[];
}

export const api = {
  getLeads: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchAPI<Lead[]>(`/api/leads/${query}`);
  },
  getLeadDetail: (id: number) => fetchAPI<LeadDetail>(`/api/leads/${id}`),
  updateLeadStatus: (id: number, status: string) =>
    fetchAPI(`/api/leads/${id}/status?new_status=${status}`, { method: "PATCH" }),
  archiveLead: (id: number) => fetchAPI(`/api/leads/${id}`, { method: "DELETE" }),

  getStats: () => fetchAPI<PipelineStats>("/api/leads/stats"),

  craftMessages: (leadId: number) =>
    fetchAPI<Message[]>(`/api/messages/craft/${leadId}`, { method: "POST" }),
  getMessagesForLead: (leadId: number) =>
    fetchAPI<Message[]>(`/api/messages/lead/${leadId}`),
  approveMessage: (messageId: number, editedText?: string, sendMethod?: string) =>
    fetchAPI("/api/messages/approve", {
      method: "POST",
      body: JSON.stringify({
        message_id: messageId,
        edited_text: editedText || null,
        send_method: sendMethod || null,
      }),
    }),

  getKanban: () => fetchAPI<Record<string, KanbanLead[]>>("/api/pipeline/kanban"),
  getPipelineRuns: () => fetchAPI<PipelineRun[]>("/api/pipeline/runs"),
  triggerRedditScan: () => fetchAPI("/api/pipeline/trigger/reddit-scan", { method: "POST" }),
  triggerReplyCheck: () => fetchAPI("/api/pipeline/trigger/reply-check", { method: "POST" }),

  getPersona: () => fetchAPI<PersonaData>("/api/settings/persona"),
  getRedditChecklist: () => fetchAPI<ChecklistItem[]>("/api/settings/reddit-checklist"),
  getConfig: () => fetchAPI<SettingsConfig>("/api/settings/config"),
  getRateLimits: () => fetchAPI<RateLimits>("/api/settings/rate-limits"),
  generateBios: (platform: "reddit") =>
    fetchAPI<BioVariantsResponse>(`/api/settings/generate-bios?platform=${platform}`, { method: "POST" }),
  scoreRedditProfile: (data: Record<string, unknown>) =>
    fetchAPI("/api/settings/score-reddit-profile", { method: "POST", body: JSON.stringify(data) }),
};
