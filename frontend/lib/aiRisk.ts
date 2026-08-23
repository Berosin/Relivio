const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8000";

export type RiskAssessment = {
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  risk_score: number;
  reasons: string[];
  disclaimer: string;
};

export async function assessRequestRisk(input: {
  amount: number;
  fund_max_request: number;
  requester_reputation_score: number;
  requester_prior_requests: number;
  requester_prior_defaults: number;
  reason_text: string;
  repayment_period_days: number;
  fund_reserve_balance: number;
}): Promise<RiskAssessment | null> {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/assess/request`, {
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

export async function assessMilestoneRisk(input: {
  milestone_amount: number;
  campaign_reserve_balance: number;
  campaign_raised: number;
  campaign_target: number;
  organizer_prior_milestones_released: number;
  organizer_prior_milestones_rejected: number;
  campaign_verified: boolean;
}): Promise<RiskAssessment | null> {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/assess/milestone`, {
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