"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { parseRUSD, formatRUSD } from "@/lib/format";
import { assessRequestRisk, type RiskAssessment } from "@/lib/aiRisk";
import { RiskBadge } from "@/components/RiskBadge";

export function CreateRequestPanel({
  fundAddress,
  onDone,
}: {
  fundAddress: `0x${string}`;
  onDone: () => void;
}) {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("350");
  const [reason, setReason] = useState("");
  const [repaymentDays, setRepaymentDays] = useState("90");
  const [recipient, setRecipient] = useState("");
  const [donationStyle, setDonationStyle] = useState(false);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [checkingRisk, setCheckingRisk] = useState(false);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: config } = useReadContract({
    address: fundAddress,
    abi: ABIS.CommunityFund,
    functionName: "config",
  });
  const { data: snapshot } = useReadContract({
    address: fundAddress,
    abi: ABIS.CommunityFund,
    functionName: "treasurySnapshot",
  });

  const cfg = config as unknown as bigint[] | undefined;
  const maxRequest = cfg?.[4]; // FundConfig.maxEmergencyRequest
  const snap = snapshot as unknown as bigint[] | undefined;
  const reserveBalance = snap?.[3];

  // Debounced advisory risk check whenever amount/reason change meaningfully.
  useEffect(() => {
    if (!amount || Number(amount) <= 0 || !reason || maxRequest === undefined || reserveBalance === undefined) {
      setRisk(null);
      return;
    }
    const t = setTimeout(async () => {
      setCheckingRisk(true);
      const result = await assessRequestRisk({
        amount: Number(amount),
        fund_max_request: Number(maxRequest) / 1e6,
        requester_reputation_score: 50, // reputation score lookup omitted for brevity; defaults to neutral
        requester_prior_requests: 0,
        requester_prior_defaults: 0,
        reason_text: reason,
        repayment_period_days: donationStyle ? 0 : Number(repaymentDays),
        fund_reserve_balance: Number(reserveBalance) / 1e6,
      });
      setRisk(result);
      setCheckingRisk(false);
    }, 600);
    return () => clearTimeout(t);
  }, [amount, reason, repaymentDays, donationStyle, maxRequest, reserveBalance]);

  function submit() {
    writeContract({
      address: fundAddress,
      abi: ABIS.CommunityFund,
      functionName: "createRequest",
      args: [
        parseRUSD(amount),
        reason,
        donationStyle ? 0n : BigInt(Number(repaymentDays) * 86400),
        (recipient || address) as `0x${string}`,
      ],
    });
  }

  useEffect(() => {
    if (isSuccess) onDone();
  }, [isSuccess, onDone]);

  return (
    <div className="card">
      <h3 className="font-semibold">Request Emergency Assistance</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Medical, student, family, or temporary financial emergencies. Subject to community vote.
      </p>
      {reserveBalance !== undefined && (
        <p className="mt-1 text-xs text-neutral-600">
          Fund reserve available: {formatRUSD(reserveBalance)} RUSD
        </p>
      )}

      <div className="mt-3 space-y-3">
        <input
          type="number"
          placeholder="Amount (RUSD)"
          className="input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <textarea
          placeholder="Reason (e.g. Medical emergency)"
          className="input"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <input
          placeholder="Recipient wallet (defaults to you)"
          className="input"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-neutral-400">
          <input
            type="checkbox"
            checked={donationStyle}
            onChange={(e) => setDonationStyle(e.target.checked)}
          />
          No repayment obligation (donation-style assistance)
        </label>
        {!donationStyle && (
          <input
            type="number"
            placeholder="Repayment period (days)"
            className="input"
            value={repaymentDays}
            onChange={(e) => setRepaymentDays(e.target.value)}
          />
        )}

        {checkingRisk && <p className="text-xs text-neutral-500">Checking advisory risk signal...</p>}
        {risk && <RiskBadge assessment={risk} />}

        <button
          onClick={submit}
          disabled={!isConnected || isPending || isConfirming}
          className="btn-primary w-full"
        >
          {isPending ? "Confirm in wallet..." : isConfirming ? "Submitting..." : "Submit Request"}
        </button>
        {error && <p className="text-xs text-red-400">{error.message}</p>}
      </div>
    </div>
  );
}