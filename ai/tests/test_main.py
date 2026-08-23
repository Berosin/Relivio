"""
Tests for the Relivio AI risk assessment service.

These are deliberately black-box: they POST to the FastAPI app via
TestClient and assert on risk_level / risk_score / reasons, the same shape
the frontend consumes. Each test is named after the rule it's checking so a
failing test tells you exactly which scoring rule broke.

Run:
    pip install -r requirements.txt pytest httpx
    pytest
"""

from fastapi.testclient import TestClient

from services.main import app

client = TestClient(app)


def base_request(**overrides) -> dict:
    payload = {
        "amount": 100,
        "fund_max_request": 1000,
        "requester_reputation_score": 80,
        "requester_prior_requests": 3,
        "requester_prior_defaults": 0,
        "reason_text": "Need help covering an unexpected medical bill this month",
        "repayment_period_days": 90,
        "fund_reserve_balance": 5000,
        "requester_wallet_age_days": 365,
        "requester_tx_count": 50,
    }
    payload.update(overrides)
    return payload


def base_milestone(**overrides) -> dict:
    payload = {
        "milestone_amount": 1000,
        "campaign_reserve_balance": 10000,
        "campaign_raised": 15000,
        "campaign_target": 20000,
        "organizer_prior_milestones_released": 2,
        "organizer_prior_milestones_rejected": 0,
        "campaign_verified": True,
        "organizer_wallet_age_days": 365,
    }
    payload.update(overrides)
    return payload


def base_campaign(**overrides) -> dict:
    payload = {
        "funding_target": 25000,
        "campaign_raised": 12000,
        "donor_count": 340,
        "top_donor_amount": 500,
        "campaign_verified": True,
        "organizer_wallet_age_days": 900,
        "organizer_tx_count": 400,
        "organizer_prior_campaigns_created": 3,
        "organizer_prior_campaigns_flagged": 0,
        "description_length": 600,
        "has_cover_image": True,
        "has_location": True,
    }
    payload.update(overrides)
    return payload


class TestHealth:
    def test_health_ok(self):
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"


class TestAssessRequest:
    def test_healthy_request_is_low_risk(self):
        res = client.post("/assess/request", json=base_request())
        assert res.status_code == 200
        body = res.json()
        assert body["risk_level"] == "LOW"
        assert body["risk_score"] < 30

    def test_amount_near_fund_max_raises_score(self):
        low = client.post("/assess/request", json=base_request(amount=100)).json()
        high = client.post(
            "/assess/request", json=base_request(amount=950, fund_max_request=1000)
        ).json()
        assert high["risk_score"] > low["risk_score"]
        assert any("fund's configured maximum" in r for r in high["reasons"])

    def test_amount_consuming_half_reserve_flagged(self):
        body = client.post(
            "/assess/request",
            json=base_request(amount=600, fund_reserve_balance=1000, fund_max_request=10_000),
        ).json()
        assert any("half the fund's current reserve" in r for r in body["reasons"])

    def test_low_reputation_raises_score(self):
        body = client.post("/assess/request", json=base_request(requester_reputation_score=20)).json()
        assert any("reputation score is low" in r for r in body["reasons"])
        assert body["risk_score"] >= 25

    def test_prior_default_is_flagged_and_named(self):
        body = client.post(
            "/assess/request", json=base_request(requester_prior_defaults=2)
        ).json()
        assert any("2 prior default" in r for r in body["reasons"])

    def test_first_time_requester_with_large_ask(self):
        body = client.post(
            "/assess/request",
            json=base_request(requester_prior_requests=0, amount=700, fund_max_request=1000),
        ).json()
        assert any("First-time requester" in r for r in body["reasons"])

    def test_short_reason_text_flagged(self):
        body = client.post("/assess/request", json=base_request(reason_text="help me")).json()
        assert any("very short" in r for r in body["reasons"])

    def test_new_wallet_flagged(self):
        body = client.post(
            "/assess/request", json=base_request(requester_wallet_age_days=1, requester_tx_count=0)
        ).json()
        assert any("created within the last 3 days" in r for r in body["reasons"])
        assert any("no prior on-chain transaction history" in r for r in body["reasons"])

    def test_established_wallet_not_flagged(self):
        body = client.post(
            "/assess/request",
            json=base_request(requester_wallet_age_days=365, requester_tx_count=50),
        ).json()
        assert not any("wallet was created" in r.lower() for r in body["reasons"])

    def test_compounding_signals_reach_high_risk(self):
        body = client.post(
            "/assess/request",
            json=base_request(
                amount=950,
                fund_max_request=1000,
                fund_reserve_balance=1000,
                requester_reputation_score=15,
                requester_prior_defaults=1,
                requester_prior_requests=0,
                reason_text="help",
                requester_wallet_age_days=1,
                requester_tx_count=0,
            ),
        ).json()
        assert body["risk_level"] == "HIGH"
        assert body["risk_score"] >= 60

    def test_score_never_exceeds_100(self):
        body = client.post(
            "/assess/request",
            json=base_request(
                amount=10_000,
                fund_max_request=1000,
                fund_reserve_balance=10,
                requester_reputation_score=0,
                requester_prior_defaults=5,
                requester_prior_requests=0,
                reason_text="x",
                requester_wallet_age_days=0,
                requester_tx_count=0,
            ),
        ).json()
        assert body["risk_score"] <= 100

    def test_disclaimer_always_present(self):
        body = client.post("/assess/request", json=base_request()).json()
        assert "advisory" in body["disclaimer"].lower()


class TestAssessMilestone:
    def test_healthy_milestone_is_low_risk(self):
        body = client.post("/assess/milestone", json=base_milestone()).json()
        assert body["risk_level"] == "LOW"

    def test_unverified_campaign_flagged(self):
        body = client.post(
            "/assess/milestone", json=base_milestone(campaign_verified=False)
        ).json()
        assert any("not been verified" in r for r in body["reasons"])

    def test_milestone_consuming_reserve_flagged(self):
        body = client.post(
            "/assess/milestone",
            json=base_milestone(milestone_amount=7000, campaign_reserve_balance=10000),
        ).json()
        assert any("large share of the current reserve" in r for r in body["reasons"])

    def test_prior_rejected_milestone_named_in_reason(self):
        body = client.post(
            "/assess/milestone", json=base_milestone(organizer_prior_milestones_rejected=3)
        ).json()
        assert any("3 milestone(s) rejected" in r for r in body["reasons"])

    def test_low_progress_campaign_flagged(self):
        body = client.post(
            "/assess/milestone",
            json=base_milestone(campaign_raised=1000, campaign_target=20000),
        ).json()
        assert any("less than 20%" in r for r in body["reasons"])

    def test_new_wallet_ignored_once_organizer_has_track_record(self):
        body = client.post(
            "/assess/milestone",
            json=base_milestone(
                organizer_wallet_age_days=1, organizer_prior_milestones_released=2
            ),
        ).json()
        assert not any("wallet was created" in r.lower() for r in body["reasons"])

    def test_new_wallet_flagged_for_first_time_organizer(self):
        body = client.post(
            "/assess/milestone",
            json=base_milestone(
                organizer_wallet_age_days=1, organizer_prior_milestones_released=0
            ),
        ).json()
        assert any("wallet was created" in r.lower() for r in body["reasons"])


class TestAssessCampaign:
    def test_healthy_established_campaign_is_low_risk(self):
        body = client.post("/assess/campaign", json=base_campaign()).json()
        assert body["risk_level"] == "LOW"
        assert body["risk_score"] < 30

    def test_unverified_campaign_flagged(self):
        body = client.post(
            "/assess/campaign", json=base_campaign(campaign_verified=False)
        ).json()
        assert any("not been verified" in r for r in body["reasons"])

    def test_prior_flagged_campaigns_named_in_reason(self):
        body = client.post(
            "/assess/campaign", json=base_campaign(organizer_prior_campaigns_flagged=2)
        ).json()
        assert any("2 prior campaign(s) flagged" in r for r in body["reasons"])

    def test_first_time_organizer_large_target_flagged(self):
        body = client.post(
            "/assess/campaign",
            json=base_campaign(organizer_prior_campaigns_created=0, funding_target=50_000),
        ).json()
        assert any("First-time organizer" in r for r in body["reasons"])

    def test_returning_organizer_large_target_not_flagged(self):
        body = client.post(
            "/assess/campaign",
            json=base_campaign(organizer_prior_campaigns_created=5, funding_target=50_000),
        ).json()
        assert not any("First-time organizer" in r for r in body["reasons"])

    def test_wallet_age_skipped_for_returning_organizer(self):
        body = client.post(
            "/assess/campaign",
            json=base_campaign(organizer_prior_campaigns_created=5, organizer_wallet_age_days=1),
        ).json()
        assert not any("wallet was created" in r.lower() for r in body["reasons"])

    def test_wash_trading_pattern_flagged(self):
        body = client.post(
            "/assess/campaign",
            json=base_campaign(
                campaign_raised=20000, donor_count=2, top_donor_amount=19000
            ),
        ).json()
        assert any("wash-trading or self-funding pattern" in r for r in body["reasons"])
        assert body["risk_score"] >= 25

    def test_moderate_donor_concentration_flagged_but_lighter(self):
        body = client.post(
            "/assess/campaign",
            json=base_campaign(
                campaign_raised=10000, donor_count=4, top_donor_amount=6000
            ),
        ).json()
        assert any("concentrated in a small number of donor wallets" in r for r in body["reasons"])

    def test_broad_donor_base_not_flagged(self):
        body = client.post(
            "/assess/campaign",
            json=base_campaign(campaign_raised=10000, donor_count=340, top_donor_amount=200),
        ).json()
        assert not any("concentrat" in r.lower() for r in body["reasons"])

    def test_no_donations_yet_does_not_error_on_concentration_check(self):
        # New campaign at creation time: campaign_raised=0 must not raise a
        # ZeroDivisionError or otherwise blow up the concentration check.
        res = client.post(
            "/assess/campaign",
            json=base_campaign(campaign_raised=0, donor_count=0, top_donor_amount=0),
        )
        assert res.status_code == 200

    def test_thin_metadata_flagged_with_all_gaps_named(self):
        body = client.post(
            "/assess/campaign",
            json=base_campaign(description_length=5, has_cover_image=False, has_location=False),
        ).json()
        reason = next(r for r in body["reasons"] if "missing" in r.lower())
        assert "a substantive description" in reason
        assert "a cover image" in reason
        assert "a location" in reason

    def test_complete_metadata_not_flagged(self):
        body = client.post(
            "/assess/campaign",
            json=base_campaign(description_length=600, has_cover_image=True, has_location=True),
        ).json()
        assert not any("missing" in r.lower() for r in body["reasons"])

    def test_compounding_signals_reach_high_risk(self):
        body = client.post(
            "/assess/campaign",
            json=base_campaign(
                campaign_verified=False,
                organizer_prior_campaigns_created=0,
                organizer_prior_campaigns_flagged=1,
                organizer_wallet_age_days=1,
                organizer_tx_count=0,
                funding_target=50_000,
                campaign_raised=20000,
                donor_count=2,
                top_donor_amount=19000,
                description_length=0,
                has_cover_image=False,
                has_location=False,
            ),
        ).json()
        assert body["risk_level"] == "HIGH"

    def test_score_never_exceeds_100(self):
        body = client.post(
            "/assess/campaign",
            json=base_campaign(
                campaign_verified=False,
                organizer_prior_campaigns_created=0,
                organizer_prior_campaigns_flagged=10,
                organizer_wallet_age_days=0,
                organizer_tx_count=0,
                funding_target=999_999,
                campaign_raised=20000,
                donor_count=1,
                top_donor_amount=20000,
                description_length=0,
                has_cover_image=False,
                has_location=False,
            ),
        ).json()
        assert body["risk_score"] <= 100


class TestNeverAutoDecides:
    """The service must only ever advise — this is a project requirement,
    not just a nice-to-have, so it gets its own explicit test."""

    def test_response_never_contains_a_decision_field(self):
        for path, payload in (
            ("/assess/request", base_request()),
            ("/assess/milestone", base_milestone()),
            ("/assess/campaign", base_campaign()),
        ):
            body = client.post(path, json=payload).json()
            for forbidden_key in ("approved", "rejected", "decision", "auto_approve", "auto_reject"):
                assert forbidden_key not in body
            assert "advisory" in body["disclaimer"].lower()