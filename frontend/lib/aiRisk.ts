const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8000";

export type RiskAssessment = {
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  risk_score: number;
  reasons: string[];
  disclaimer: string;
};

async function postAssessment<T extends object>(
  path: string,
  input: T
): Promise<RiskAssessment | null> {
  try {
    const res = await fetch(`${AI_SERVICE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    return (await res.json()) as RiskAssessment;
  } catch {
    return null;
  }
}

export async function assessRequestRisk(input: {
  amount: number;
  fund_max_request: number;
  requester_reputation_score: number;
  requester_prior_requests: number;
  requester_prior_defaults: number;
  reason_text: string;
  repayment_period_days: number;
  fund_reserve_balance: number;
  // Optional — omit if you don't have on-chain wallet stats to hand; the
  // service defaults to neutral values when these are absent.
  requester_wallet_age_days?: number;
  requester_tx_count?: number;
}): Promise<RiskAssessment | null> {
  return postAssessment("/assess/request", input);
}

export async function assessMilestoneRisk(input: {
  milestone_amount: number;
  campaign_reserve_balance: number;
  campaign_raised: number;
  campaign_target: number;
  organizer_prior_milestones_released: number;
  organizer_prior_milestones_rejected: number;
  campaign_verified: boolean;
  organizer_wallet_age_days?: number;
}): Promise<RiskAssessment | null> {
  return postAssessment("/assess/milestone", input);
}

/// Whole-campaign / organizer-level risk. Call this once when a campaign is
/// created (or when a verifier opens a campaign for review) — separate from
/// per-milestone checks, which use assessMilestoneRisk above.
export async function assessCampaignRisk(input: {
  funding_target: number;
  campaign_raised?: number;
  donor_count?: number;
  top_donor_amount?: number;
  campaign_verified: boolean;
  organizer_wallet_age_days?: number;
  organizer_tx_count?: number;
  organizer_prior_campaigns_created?: number;
  organizer_prior_campaigns_flagged?: number;
  description_length?: number;
  has_cover_image?: boolean;
  has_location?: boolean;
}): Promise<RiskAssessment | null> {
  return postAssessment("/assess/campaign", input);
}