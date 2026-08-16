"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { ADDRESSES } from "@/lib/addresses";
import { parseRUSD } from "@/lib/format";
import { SpatialCard } from "@/components/SpatialCard";

export default function CreateFundPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: cooldownRemaining } = useReadContract({
    address: ADDRESSES.fundFactory,
    abi: ABIS.FundFactory,
    functionName: "cooldownRemaining",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && ADDRESSES.fundFactory), refetchInterval: 15_000 },
  });
  const cooldownSeconds = cooldownRemaining ? Number(cooldownRemaining) : 0;
  const cooldownActive = cooldownSeconds > 0;

  const [form, setForm] = useState({
    name: "Relivio Campus Emergency Fund",
    description: "",
    fundType: "CAMPUS_EMERGENCY",
    minContribution: "10",
    maxEmergencyRequest: "500",
    votingDurationHours: "24",
    votingThresholdPercent: "60",
    emergencyReservePercent: "20",
    defaultRepaymentDays: "90",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    if (!ADDRESSES.fundFactory) return;
    const reserveBps = BigInt(Number(form.emergencyReservePercent) * 100);
    writeContract({
      address: ADDRESSES.fundFactory,
      abi: ABIS.FundFactory,
      functionName: "createFund",
      args: [
        {
          name: form.name,
          description: form.description,
          fundType: form.fundType,
          minContribution: parseRUSD(form.minContribution),
          maxEmergencyRequest: parseRUSD(form.maxEmergencyRequest),
          votingDuration: BigInt(Number(form.votingDurationHours) * 3600),
          votingThresholdBps: BigInt(Number(form.votingThresholdPercent) * 100),
          emergencyReserveBps: reserveBps,
          defiAllocationBps: 10_000n - reserveBps,
          defaultRepaymentPeriod: BigInt(Number(form.defaultRepaymentDays) * 86400),
        },
      ],
    });
  }

  useEffect(() => {
    if (isSuccess) {
      const t = setTimeout(() => router.push("/funds"), 1200);
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
        <h1 className="text-2xl font-bold text-neutral-900">Create Community Emergency Fund</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Deploys a new smart-contract-controlled treasury (Core Use Case 1).
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Field label="Fund name">
            <input
              className="input-light"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
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
          <Field label="Fund type">
            <input
              className="input-light"
              required
              value={form.fundType}
              onChange={(e) => update("fundType", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Minimum contribution (RUSD)">
              <input
                className="input-light"
                type="number"
                min="0.000001"
                step="any"
                required
                value={form.minContribution}
                onChange={(e) => update("minContribution", e.target.value)}
              />
            </Field>
            <Field label="Maximum emergency request (RUSD)">
              <input
                className="input-light"
                type="number"
                min="0.000001"
                step="any"
                required
                value={form.maxEmergencyRequest}
                onChange={(e) => update("maxEmergencyRequest", e.target.value)}
              />
            </Field>
            <Field label="Voting duration (hours)">
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
            <Field label="Approval threshold (%)">
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
            <Field label="Default repayment period (days)">
              <input
                className="input-light"
                type="number"
                min="0"
                required
                value={form.defaultRepaymentDays}
                onChange={(e) => update("defaultRepaymentDays", e.target.value)}
              />
            </Field>
          </div>
          <p className="text-xs text-neutral-500">
            Remaining {100 - Number(form.emergencyReservePercent || 0)}% is allocated to the DeFi
            yield engine (SIMULATED TESTNET YIELD).
          </p>

          {cooldownActive && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              To prevent spam, each wallet can only create one fund per hour. You can create
              another fund in {formatCooldown(cooldownSeconds)}.
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
              ? "Deploying fund..."
              : "Create Fund"}
          </button>
          {error && <p className="text-sm text-red-600">{getFriendlyErrorMessage(error)}</p>}
          {isSuccess && <p className="text-sm font-medium text-neutral-900">Fund created! Redirecting...</p>}
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