"""
Relivio AI Risk Assessment Service
-----------------------------------
A small, EXPLAINABLE, rules-based scoring service that assists (never decides)
community voting on emergency requests and campaign milestones. It never
approves or rejects anything on its own — governance always has final say
on-chain. This deliberately avoids opaque ML scoring for a life-impacting
financial decision; every score below is traceable to a named rule.

Run:
    pip install fastapi uvicorn pydantic
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal

app = FastAPI(
    title="Relivio Risk Assessment Service",
    description="Explainable, rules-based assistive risk scoring for emergency requests and campaign milestones. Advisory only — never auto-approves or auto-rejects.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to the deployed frontend origin in production
    allow_methods=["*"],
    allow_headers=["*"],
)


class RequestAssessmentInput(BaseModel):
    amount: float = Field(..., description="Requested amount in RUSD")
    fund_max_request: float = Field(..., description="Fund's configured max emergency request")
    requester_reputation_score: int = Field(..., ge=0, le=100)
    requester_prior_requests: int = Field(0, ge=0)
    requester_prior_defaults: int = Field(0, ge=0)
    reason_text: str = Field(..., description="Free-text reason provided by requester")
    repayment_period_days: int = Field(0, ge=0, description="0 = donation-style, no repayment")
    fund_reserve_balance: float = Field(..., description="Fund's current emergency reserve")


class AssessmentOutput(BaseModel):
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    risk_score: int = Field(..., ge=0, le=100, description="Higher = higher risk")
    reasons: list[str]
    disclaimer: str = (
        "Advisory only. This score does not approve or reject anything — "
        "the community vote and smart contract retain full control."
    )


VAGUE_REASON_MARKERS = ["help", "emergency", "please", "urgent", "asap"]


@app.post("/assess/request", response_model=AssessmentOutput)
def assess_request(input: RequestAssessmentInput) -> AssessmentOutput:
    score = 0
    reasons: list[str] = []

    # 1. Amount relative to fund's own configured max.
    ratio = input.amount / max(input.fund_max_request, 1)
    if ratio > 0.9:
        score += 20
        reasons.append("Requested amount is near the fund's configured maximum.")
    elif ratio > 0.6:
        score += 10
        reasons.append("Requested amount is a large share of the fund's max request size.")

    # 2. Amount relative to available reserve (liquidity risk, not creditworthiness).
    reserve_ratio = input.amount / max(input.fund_reserve_balance, 1)
    if reserve_ratio > 0.5:
        score += 20
        reasons.append("Requested amount would consume over half the fund's current reserve.")

    # 3. Reputation.
    if input.requester_reputation_score < 40:
        score += 25
        reasons.append("Requester reputation score is low.")
    elif input.requester_reputation_score < 60:
        score += 10
        reasons.append("Requester reputation score is below average.")

    # 4. Prior default history.
    if input.requester_prior_defaults > 0:
        score += 25
        reasons.append(f"Requester has {input.requester_prior_defaults} prior default(s).")

    # 5. First-time requester with a large ask.
    if input.requester_prior_requests == 0 and ratio > 0.5:
        score += 10
        reasons.append("First-time requester asking for a large amount relative to fund limits.")

    # 6. Reason quality — purely a transparency nudge, not a rejection signal.
    words = input.reason_text.strip().split()
    if len(words) < 6:
        score += 10
        reasons.append("Reason provided is very short — voters may want more detail.")
    elif all(w.lower().strip(".,!") in VAGUE_REASON_MARKERS for w in words if w):
        score += 5
        reasons.append("Reason text is generic; consider asking the requester for specifics.")

    score = min(score, 100)
    level: Literal["LOW", "MEDIUM", "HIGH"] = "LOW" if score < 30 else "MEDIUM" if score < 60 else "HIGH"

    if not reasons:
        reasons.append("No elevated-risk signals detected under current rules.")

    return AssessmentOutput(risk_level=level, risk_score=score, reasons=reasons)


class MilestoneAssessmentInput(BaseModel):
    milestone_amount: float
    campaign_reserve_balance: float
    campaign_raised: float
    campaign_target: float
    organizer_prior_milestones_released: int = 0
    organizer_prior_milestones_rejected: int = 0
    campaign_verified: bool = False


@app.post("/assess/milestone", response_model=AssessmentOutput)
def assess_milestone(input: MilestoneAssessmentInput) -> AssessmentOutput:
    score = 0
    reasons: list[str] = []

    if not input.campaign_verified:
        score += 20
        reasons.append("Campaign has not been verified by the platform verifier.")

    reserve_ratio = input.milestone_amount / max(input.campaign_reserve_balance, 1)
    if reserve_ratio > 0.6:
        score += 20
        reasons.append("Milestone would consume a large share of the current reserve.")

    if input.organizer_prior_milestones_rejected > 0:
        score += 20
        reasons.append(
            f"Organizer has had {input.organizer_prior_milestones_rejected} milestone(s) rejected before."
        )

    progress = input.campaign_raised / max(input.campaign_target, 1)
    if progress < 0.2:
        score += 10
        reasons.append("Campaign has raised less than 20% of its funding target so far.")

    score = min(score, 100)
    level: Literal["LOW", "MEDIUM", "HIGH"] = "LOW" if score < 30 else "MEDIUM" if score < 60 else "HIGH"

    if not reasons:
        reasons.append("No elevated-risk signals detected under current rules.")

    return AssessmentOutput(risk_level=level, risk_score=score, reasons=reasons)


@app.get("/health")
def health():
    return {"status": "ok", "service": "relivio-ai-risk"}
