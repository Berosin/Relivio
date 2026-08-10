"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { ADDRESSES } from "@/lib/addresses";
import { parseRUSD } from "@/lib/format";

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
  const { isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [form, setForm] = useState({
    name: "",
    campaignType: 1, // DISASTER_RELIEF
    description: "",
    beneficiaryInfo: "",
    fundingTarget: "100000",
    deadlineDays: "60",
    emergencyReservePercent: "30",
    votingThresholdPercent: "60",
    votingDurationHours: "24",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

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
  
  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-bold">Create Relief Campaign</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Public campaign for disaster or community relief (Core Use Case 2). Verification is
        performed separately by the platform verifier.
      </p>

      <div className="mt-8 space-y-4">
        <Field label="Campaign name">
          <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} />
        </Field>
        <Field label="Campaign type">
          <select
            className="input"
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
            className="input"
            rows={3}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </Field>
        <Field label="Beneficiary info (org/coalition, no personal PII)">
          <input
            className="input"
            value={form.beneficiaryInfo}
            onChange={(e) => update("beneficiaryInfo", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Funding target (RUSD)">
            <input
              className="input"
              type="number"
              value={form.fundingTarget}
              onChange={(e) => update("fundingTarget", e.target.value)}
            />
          </Field>
          <Field label="Deadline (days)">
            <input
              className="input"
              type="number"
              value={form.deadlineDays}
              onChange={(e) => update("deadlineDays", e.target.value)}
            />
          </Field>
          <Field label="Emergency reserve (%)">
            <input
              className="input"
              type="number"
              value={form.emergencyReservePercent}
              onChange={(e) => update("emergencyReservePercent", e.target.value)}
            />
          </Field>
          <Field label="Milestone approval threshold (%)">
            <input
              className="input"
              type="number"
              value={form.votingThresholdPercent}
              onChange={(e) => update("votingThresholdPercent", e.target.value)}
            />
          </Field>
          <Field label="Milestone voting duration (hours)">
            <input
              className="input"
              type="number"
              value={form.votingDurationHours}
              onChange={(e) => update("votingDurationHours", e.target.value)}
            />
          </Field>
        </div>
        <p className="text-xs text-neutral-600">
          Remaining {100 - Number(form.emergencyReservePercent || 0)}% goes to the DeFi yield
          engine (SIMULATED TESTNET YIELD).
        </p>

        <button
          onClick={submit}
          disabled={!isConnected || isPending || isConfirming}
          className="w-full rounded-lg bg-sky-500 px-4 py-3 font-semibold text-black hover:bg-sky-400 disabled:opacity-50"
        >
          {!isConnected
            ? "Connect wallet to continue"
            : isPending
            ? "Confirm in wallet..."
            : isConfirming
            ? "Deploying campaign..."
            : "Create Campaign"}
        </button>
        {error && <p className="text-sm text-red-400">{error.message}</p>}
        {isSuccess && <p className="text-sm text-sky-400">Campaign created! Redirecting...</p>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-400">{label}</span>
      {children}
    </label>
  );
}
