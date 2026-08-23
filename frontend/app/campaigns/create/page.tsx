"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { ADDRESSES } from "@/lib/addresses";
import { parseRUSD } from "@/lib/format";
import { assessCampaignRisk, type RiskAssessment } from "@/lib/aiRisk";
import { RiskBadge } from "@/components/RiskBadge";
import { SpatialCard } from "@/components/SpatialCard";

const CAMPAIGN_TYPES = [
  "INDIVIDUAL_EMERGENCY",
  "DISASTER_RELIEF",
  "COMMUNITY_RELIEF",
  "MEDICAL_RELIEF",
  "REBUILDING",
  "HUMANITARIAN_RELIEF",
  "OTHER",
];

export default function CreateCampaignPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: cooldownRemaining } = useReadContract({
    address: ADDRESSES.campaignFactory,
    abi: ABIS.CampaignFactory,
    functionName: "cooldownRemaining",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && ADDRESSES.campaignFactory), refetchInterval: 15_000 },
  });
  const cooldownSeconds = cooldownRemaining ? Number(cooldownRemaining) : 0;
  const cooldownActive = cooldownSeconds > 0;

  const [form, setForm] = useState({
    name: "",
    campaignType: 1,
    description: "",
    beneficiaryInfo: "",
    fundingTarget: "100000",
    deadlineDays: "60",
    emergencyReservePercent: "30",
    votingThresholdPercent: "60",
    votingDurationHours: "24",
  });
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [checkingRisk, setCheckingRisk] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Debounced advisory risk check as the organizer fills in the form. A brand
  // new campaign always has campaign_verified=false, zero donors, and zero
  // raised — verification happens separately, after creation. This gives the
  // organizer an early, non-blocking signal (e.g. "your description is too
  // thin", "large ask for a first-time organizer") before they ever submit
  // the on-chain transaction.
  useEffect(() => {
    const target = Number(form.fundingTarget);
    if (!target || target <= 0) {
      setRisk(null);
      return;
    }
    const t = setTimeout(async () => {
      setCheckingRisk(true);
      const result = await assessCampaignRisk({
        funding_target: target,
        campaign_raised: 0,
        donor_count: 0,
        top_donor_amount: 0,
        campaign_verified: false,
        description_length: form.description.length,
        has_cover_image: false, // no cover-image upload field in this form yet
        has_location: false, // no dedicated location field in this form yet
      });
      setRisk(result);
      setCheckingRisk(false);
    }, 600);
    return () => clearTimeout(t);
  }, [form.fundingTarget, form.description]);

  function submit() {
    if (!ADDRESSES.campaignFactory) return;
    const reserveBps = BigInt(Number(form.emergencyReservePercent) * 100);
    writeContract({
      address: ADDRESSES.campaignFactory,
      abi: ABIS.CampaignFactory,
      functionName: "createCampaign",
      args: [
        {
          name: form.name,
          campaignType: form.campaignType,
          description: form.description,
          beneficiaryInfo: form.beneficiaryInfo,
          fundingTarget: parseRUSD(form.fundingTarget),
          deadline: BigInt(Math.floor(Date.now() / 1000) + Number(form.deadlineDays) * 86400),
          emergencyReserveBps: reserveBps,
          defiAllocationBps: 10_000n - reserveBps,
          votingThresholdBps: BigInt(Number(form.votingThresholdPercent) * 100),
          votingDuration: BigInt(Number(form.votingDurationHours) * 3600),
        },
      ],
    });
  }

  useEffect(() => {
    if (isSuccess) {
      const t = setTimeout(() => router.push("/campaigns"), 1200);
      return () => clearTimeout(t);
    }
  }, [isSuccess, router]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) {
      e.currentTarget.reportValidity();
      return;
    }
    submit();
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <SpatialCard className="p-8 sm:p-10">
        <h1 className="text-2xl font-bold text-neutral-900">Create Relief Campaign</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Public campaign for disaster or community relief (Core Use Case 2). Verification is
          performed separately by the platform verifier.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Field label="Campaign name">
            <input className="input-light" required value={form.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <Field label="Campaign type">
            <select
              className="input-light"
              required
              value={form.campaignType}
              onChange={(e) => update("campaignType", Number(e.target.value))}
            >
              {CAMPAIGN_TYPES.map((t, i) => (
                <option key={t} value={i}>
                  {t.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea
              className="input-light"
              rows={3}
              required
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>
          <Field label="Beneficiary info (org/coalition, no personal PII)">
            <input
              className="input-light"
              required
              value={form.beneficiaryInfo}
              onChange={(e) => update("beneficiaryInfo", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Funding target (RUSD)">
              <input
                className="input-light"
                type="number"
                min="0.000001"
                step="any"
                required
                value={form.fundingTarget}
                onChange={(e) => update("fundingTarget", e.target.value)}
              />
            </Field>
            <Field label="Deadline (days)">
              <input
                className="input-light"
                type="number"
                min="1"
                required
                value={form.deadlineDays}
                onChange={(e) => update("deadlineDays", e.target.value)}
              />
            </Field>
            <Field label="Emergency reserve (%)">
              <input
                className="input-light"
                type="number"
                min="0"
                max="100"
                required
                value={form.emergencyReservePercent}
                onChange={(e) => update("emergencyReservePercent", e.target.value)}
              />
            </Field>
            <Field label="Milestone approval threshold (%)">
              <input
                className="input-light"
                type="number"
                min="1"
                max="100"
                required
                value={form.votingThresholdPercent}
                onChange={(e) => update("votingThresholdPercent", e.target.value)}
              />
            </Field>
            <Field label="Milestone voting duration (hours)">
              <input
                className="input-light"
                type="number"
                min="0.01"
                step="any"
                required
                value={form.votingDurationHours}
                onChange={(e) => update("votingDurationHours", e.target.value)}
              />
            </Field>
          </div>
          <p className="text-xs text-neutral-500">
            Remaining {100 - Number(form.emergencyReservePercent || 0)}% goes to the DeFi yield
            engine (SIMULATED TESTNET YIELD).
          </p>

          {checkingRisk && <p className="text-xs text-neutral-500">Checking advisory risk signal...</p>}
          {risk && <RiskBadge assessment={risk} />}

          {cooldownActive && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              To prevent spam, each wallet can only create one campaign per hour. You can create
              another campaign in {formatCooldown(cooldownSeconds)}.
            </p>
          )}

          <button
            type="submit"
            disabled={!isConnected || isPending || isConfirming || cooldownActive}
            className="btn-shine w-full rounded-lg border-2 border-neutral-900 bg-neutral-900 px-4 py-3 font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition-colors hover:bg-white hover:text-neutral-900 disabled:opacity-40"
          >
            {!isConnected
              ? "Connect wallet to continue"
              : cooldownActive
              ? `Wait ${formatCooldown(cooldownSeconds)}`
              : isPending
              ? "Confirm in wallet..."
              : isConfirming
              ? "Deploying campaign..."
              : "Create Campaign"}
          </button>
          {error && <p role="alert" className="text-sm text-red-600">{getFriendlyErrorMessage(error)}</p>}
          {isSuccess && <p role="status" className="text-sm font-medium text-neutral-900">Campaign created! Redirecting...</p>}
        </form>
      </SpatialCard>
    </div>
  );
}

function formatCooldown(seconds: number): string {
  if (seconds >= 3600) return `${Math.ceil(seconds / 3600)}h`;
  if (seconds >= 60) return `${Math.ceil(seconds / 60)}m`;
  return `${seconds}s`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-600">{label}</span>
      {children}
    </label>
  );
}