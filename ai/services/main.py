"""
Relivio AI Risk Assessment Service
-----------------------------------
A small, EXPLAINABLE, rules-based scoring service that assists (never decides)
community voting on emergency requests, campaign milestones, and whole
campaigns/organizers. It never approves, rejects, freezes, or confiscates
funds on its own — governance and the smart contracts always retain full
control. This deliberately avoids opaque ML scoring for a life-impacting
financial decision; every point on every score below is traceable to a
named rule in `reasons`.

Three endpoints, matching the platform's three risk-relevant moments:
    POST /assess/request   -> an individual emergency-assistance request
    POST /assess/milestone -> a single campaign milestone release
    POST /assess/campaign  -> a whole campaign / its organizer (spec #25:
                               organizer wallet history, campaign history,
                               funding target, transaction patterns,
                               unusual activity, metadata consistency)

The inputs to /assess/campaign are numbers the frontend/indexer already has
(or can get cheaply via viem + the Supabase off-chain metadata tables) —
this service does not itself talk to a chain, a DB, or any paid API.

Run:
    pip install -r requirements.txt
    uvicorn services.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal

app = FastAPI(
    title="Relivio Risk Assessment Service",
    description=(
        "Explainable, rules-based assistive risk scoring for emergency requests, "
        "campaign milestones, and campaigns/organizers. Advisory only — never "
        "auto-approves, auto-rejects, freezes, or confiscates funds."
    ),
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to the deployed frontend origin in production
    allow_methods=["*"],
    allow_headers=["*"],
)


class AssessmentOutput(BaseModel):
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    risk_score: int = Field(..., ge=0, le=100, description="Higher = higher risk")
    reasons: list[str]
    disclaimer: str = (
        "Advisory only. This score does not approve, reject, freeze, or "
        "confiscate anything — governance and the smart contracts retain "
        "full control."
    )


def _finalize(score: int, reasons: list[str]) -> AssessmentOutput:
    """Shared scoring -> level mapping so all three endpoints stay consistent."""
    score = max(0, min(score, 100))
    level: Literal["LOW", "MEDIUM", "HIGH"] = (
        "LOW" if score < 30 else "MEDIUM" if score < 60 else "HIGH"
    )
    if not reasons:
        reasons = ["No elevated-risk signals detected under current rules."]
    return AssessmentOutput(risk_level=level, risk_score=score, reasons=reasons)


# Wallet-age thresholds shared by request/milestone/campaign scoring. A brand
# new wallet isn't proof of fraud, but Sybil/burner-wallet attacks on
# emergency-relief platforms overwhelmingly use freshly created wallets, so
# it's a legitimate, explainable signal — never sufficient on its own to
# raise HIGH by itself, always combined with other signals.
def _wallet_age_score(age_days: int) -> tuple[int, str | None]:
    if age_days < 3:
        return 20, "Wallet was created within the last 3 days."
    if age_days < 14:
        return 10, "Wallet is less than 2 weeks old."
    return 0, None


def _tx_count_score(tx_count: int) -> tuple[int, str | None]:
    if tx_count == 0:
        return 15, "Wallet has no prior on-chain transaction history."
    if tx_count < 3:
        return 5, "Wallet has very limited on-chain transaction history."
    return 0, None


VAGUE_REASON_MARKERS = ["help", "emergency", "please", "urgent", "asap"]


class RequestAssessmentInput(BaseModel):
    amount: float = Field(..., description="Requested amount in RUSD")
    fund_max_request: float = Field(..., description="Fund's configured max emergency request")
    requester_reputation_score: int = Field(..., ge=0, le=100)
    requester_prior_requests: int = Field(0, ge=0)
    requester_prior_defaults: int = Field(0, ge=0)
    reason_text: str = Field(..., description="Free-text reason provided by requester")
    repayment_period_days: int = Field(0, ge=0, description="0 = donation-style, no repayment")
    fund_reserve_balance: float = Field(..., description="Fund's current emergency reserve")
    requester_wallet_age_days: int = Field(
        365, ge=0, description="Age of requester's wallet in days (on-chain, from first tx). Defaults old/neutral if unknown."
    )
    requester_tx_count: int = Field(
        50, ge=0, description="Total on-chain transaction count for requester's wallet. Defaults high/neutral if unknown."
    )


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

    # 7. Requester wallet history (spec #25: "organizer wallet history" applied
    #    at the requester level too — Sybil/burner-wallet signal).
    age_pts, age_reason = _wallet_age_score(input.requester_wallet_age_days)
    if age_reason:
        score += age_pts
        reasons.append(age_reason)

    tx_pts, tx_reason = _tx_count_score(input.requester_tx_count)
    if tx_reason:
        score += tx_pts
        reasons.append(tx_reason)

    return _finalize(score, reasons)


class MilestoneAssessmentInput(BaseModel):
    milestone_amount: float
    campaign_reserve_balance: float
    campaign_raised: float
    campaign_target: float
    organizer_prior_milestones_released: int = 0
    organizer_prior_milestones_rejected: int = 0
    campaign_verified: bool = False
    organizer_wallet_age_days: int = Field(
        365, ge=0, description="Age of organizer's wallet in days. Defaults old/neutral if unknown."
    )


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

    # Organizer wallet history — only weighted if this organizer has no track
    # record on the platform yet; an organizer with released milestones has
    # already demonstrated legitimacy regardless of wallet age.
    if input.organizer_prior_milestones_released == 0:
        age_pts, age_reason = _wallet_age_score(input.organizer_wallet_age_days)
        if age_reason:
            score += age_pts
            reasons.append(f"{age_reason} (organizer has no prior released milestones yet.)")

    return _finalize(score, reasons)


class CampaignAssessmentInput(BaseModel):
    """Whole-campaign / organizer-level risk (spec #25). Run this once when a
    campaign is created or when a verifier reviews it — separate from
    per-milestone checks, which use /assess/milestone."""

    funding_target: float = Field(..., description="Campaign's funding target in RUSD")
    campaign_raised: float = Field(0, ge=0, description="Total raised so far")
    donor_count: int = Field(0, ge=0, description="Number of unique donor wallets")
    top_donor_amount: float = Field(
        0, ge=0, description="Largest single donation received (wash-trading / self-funding signal)"
    )
    campaign_verified: bool = False

    organizer_wallet_age_days: int = Field(365, ge=0)
    organizer_tx_count: int = Field(50, ge=0)
    organizer_prior_campaigns_created: int = Field(0, ge=0)
    organizer_prior_campaigns_flagged: int = Field(
        0, ge=0, description="Prior campaigns by this organizer that verifiers/governance flagged or rejected"
    )

    description_length: int = Field(0, ge=0, description="Character count of the campaign's long_description")
    has_cover_image: bool = False
    has_location: bool = False


@app.post("/assess/campaign", response_model=AssessmentOutput)
def assess_campaign(input: CampaignAssessmentInput) -> AssessmentOutput:
    score = 0
    reasons: list[str] = []

    # 1. Verification status.
    if not input.campaign_verified:
        score += 15
        reasons.append("Campaign has not been verified by the platform verifier.")

    # 2. Organizer campaign history — prior flags are the strongest signal
    #    available, since a prior flag was itself a human governance decision.
    if input.organizer_prior_campaigns_flagged > 0:
        score += 25
        reasons.append(
            f"Organizer has had {input.organizer_prior_campaigns_flagged} prior campaign(s) flagged/rejected."
        )

    # 3. First-time organizer with a large ask — track record substitutes for
    #    wallet age once an organizer has run campaigns before.
    if input.organizer_prior_campaigns_created == 0:
        if input.funding_target > 10_000:
            score += 10
            reasons.append("First-time organizer on Relivio is requesting a large funding target.")

        age_pts, age_reason = _wallet_age_score(input.organizer_wallet_age_days)
        if age_reason:
            score += age_pts
            reasons.append(f"{age_reason} (organizer has no prior campaigns on Relivio.)")

        tx_pts, tx_reason = _tx_count_score(input.organizer_tx_count)
        if tx_reason:
            score += tx_pts
            reasons.append(tx_reason)

    # 4. Donor concentration — "transaction patterns / unusual activity."
    #    A handful of wallets accounting for most of the funds raised is a
    #    classic wash-trading / self-funding pattern used to fake momentum.
    if input.campaign_raised > 0:
        concentration = input.top_donor_amount / input.campaign_raised
        if input.donor_count <= 2 and concentration > 0.8:
            score += 25
            reasons.append(
                "A single donor accounts for most of the funds raised, from very few unique donors — "
                "possible wash-trading or self-funding pattern."
            )
        elif input.donor_count <= 5 and concentration > 0.5:
            score += 10
            reasons.append("Funds raised are concentrated in a small number of donor wallets.")

    # 5. Campaign metadata consistency/completeness — thin or missing
    #    metadata makes independent verification harder for both voters and
    #    verifiers, which is itself a fraud-surface signal (spec: "campaign
    #    metadata consistency").
    metadata_gaps: list[str] = []
    if input.description_length < 40:
        metadata_gaps.append("a substantive description")
    if not input.has_cover_image:
        metadata_gaps.append("a cover image")
    if not input.has_location:
        metadata_gaps.append("a location")
    if metadata_gaps:
        score += 5 * len(metadata_gaps)
        reasons.append(
            "Campaign listing is missing " + ", ".join(metadata_gaps) +
            " — thin metadata makes independent verification harder."
        )

    return _finalize(score, reasons)


@app.get("/health")
def health():
    return {"status": "ok", "service": "relivio-ai-risk"}