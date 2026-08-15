"use client";

import { useAccount, useReadContract } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { ADDRESSES } from "@/lib/addresses";
import { formatRUSD } from "@/lib/format";

export default function ReputationPage() {
  const { address, isConnected } = useAccount();

  const { data: score } = useReadContract({
    address: ADDRESSES.reputation,
    abi: ABIS.Reputation,
    functionName: "scoreOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && ADDRESSES.reputation) },
  });

  const { data: maxRequest } = useReadContract({
    address: ADDRESSES.reputation,
    abi: ABIS.Reputation,
    functionName: "maxRequestAmount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && ADDRESSES.reputation) },
  });

  const { data: profile } = useReadContract({
    address: ADDRESSES.reputation,
    abi: ABIS.Reputation,
    functionName: "profiles",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && ADDRESSES.reputation) },
  });

  const p = profile as unknown as bigint[] | undefined;
  const [totalContributed, requestsMade, requestsRepaid, requestsDefaulted, onTimeRepayments, votesCast] =
    p ?? [];

  const scoreNum = score !== undefined ? Number(score) : undefined;

  // Mirrors Reputation.sol's scoreOf() logic exactly, purely for the
  // transparent breakdown shown below — the actual score always comes from
  // the contract read above, this just explains how it got there.
  const contribComponent =
    totalContributed !== undefined ? Math.min(20, Number((totalContributed * 20n) / 2000_000000n)) : 0;
  const repaymentComponent =
    requestsRepaid !== undefined && requestsRepaid > 0n
      ? Math.round((Number(onTimeRepayments) / Number(requestsRepaid)) * 25)
      : 0;
  const governanceComponent = votesCast !== undefined ? Math.min(10, Number(votesCast)) : 0;
  const defaultPenalty = requestsDefaulted !== undefined ? Number(requestsDefaulted) * 15 : 0;

  function tierLabel(s: number) {
    if (s >= 90) return "Highest tier";
    if (s >= 75) return "High tier";
    if (s >= 50) return "Standard tier";
    return "Entry tier";
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold">Your Reputation</h1>
      <p className="mt-1 text-sm text-neutral-400">
        A transparent, on-chain score (0–100) that determines how much you can request from any
        Relivio emergency fund. No personal data — purely financial-behavior history.
      </p>

      {!isConnected && (
        <p className="card mt-8 text-sm text-neutral-400">
          Connect your wallet to see your reputation score.
        </p>
      )}

      {isConnected && (
        <>
          <div className="card mt-8 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">Score</p>
              <p className="mt-1 text-5xl font-display text-white">
                {scoreNum ?? "—"}
                <span className="text-lg text-neutral-500"> / 100</span>
              </p>
              {scoreNum !== undefined && (
                <p className="mt-1 text-xs text-neutral-400">{tierLabel(scoreNum)}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Max single request
              </p>
              <p className="mt-1 text-2xl font-display text-white">
                {maxRequest !== undefined ? formatRUSD(maxRequest as bigint) : "—"} RUSD
              </p>
            </div>
          </div>

          <div className="card mt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              How this is calculated
            </p>
            <div className="mt-4 space-y-3">
              <ScoreRow label="Base score" value={50} max={50} note="Everyone starts here" />
              <ScoreRow
                label="Contributions"
                value={contribComponent}
                max={20}
                note={`${formatRUSD(totalContributed)} RUSD contributed across all funds`}
              />
              <ScoreRow
                label="Repayment reliability"
                value={repaymentComponent}
                max={25}
                note={
                  requestsRepaid && requestsRepaid > 0n
                    ? `${onTimeRepayments}/${requestsRepaid} repayments on time`
                    : "No repayment history yet"
                }
              />
              <ScoreRow
                label="Governance participation"
                value={governanceComponent}
                max={10}
                note={`${votesCast ?? 0} votes cast (caps at 10 votes)`}
              />
              {defaultPenalty > 0 && (
                <ScoreRow
                  label="Default penalty"
                  value={-defaultPenalty}
                  max={0}
                  note={`${requestsDefaulted} defaulted request(s), −15 each`}
                  negative
                />
              )}
            </div>
          </div>

          <div className="card mt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Request limit tiers
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <TierBox label="Score ≥ 90" amount="1,000 RUSD" active={scoreNum !== undefined && scoreNum >= 90} />
              <TierBox label="Score ≥ 75" amount="700 RUSD" active={scoreNum !== undefined && scoreNum >= 75 && scoreNum < 90} />
              <TierBox label="Score ≥ 50" amount="400 RUSD" active={scoreNum !== undefined && scoreNum >= 50 && scoreNum < 75} />
              <TierBox label="Below 50" amount="100 RUSD" active={scoreNum !== undefined && scoreNum < 50} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ScoreRow({
  label,
  value,
  max,
  note,
  negative,
}: {
  label: string;
  value: number;
  max: number;
  note: string;
  negative?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-300">{label}</span>
        <span className={negative ? "text-red-400" : "text-white"}>
          {negative ? value : `+${value}`}
        </span>
      </div>
      {!negative && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-white" style={{ width: `${pct}%` }} />
        </div>
      )}
      <p className="mt-1 text-xs text-neutral-500">{note}</p>
    </div>
  );
}

function TierBox({ label, amount, active }: { label: string; amount: string; active: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center ${
        active ? "border-white bg-white/10" : "border-white/10"
      }`}
    >
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`mt-1 font-semibold ${active ? "text-white" : "text-neutral-400"}`}>{amount}</p>
    </div>
  );
}