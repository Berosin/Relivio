"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { formatRUSD, statusLabel } from "@/lib/format";
import { assessMilestoneRisk, type RiskAssessment } from "@/lib/aiRisk";
import { RiskBadge } from "@/components/RiskBadge";

// getMilestone() returns a single struct — viem decodes single-struct
// returns as a plain object keyed by field name (NOT an array). Do not
// destructure this with array syntax.
type MilestoneStruct = {
  description: string;
  amount: bigint;
  status: number;
  yesShares: bigint;
  noShares: bigint;
  votingDeadline: bigint;
  releasedAt: bigint;
  txRef: `0x${string}`;
};

export function MilestoneCard({
  campaignAddress,
  organizer,
  milestoneId,
}: {
  campaignAddress: `0x${string}`;
  organizer: `0x${string}` | undefined;
  milestoneId: number;
}) {
  const { address, isConnected } = useAccount();
  const { data, refetch } = useReadContract({
    address: campaignAddress,
    abi: ABIS.Campaign,
    functionName: "getMilestone",
    args: [BigInt(milestoneId)],
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: snapshot } = useReadContract({
    address: campaignAddress,
    abi: ABIS.Campaign,
    functionName: "transparencySnapshot",
  });
  const { data: verified } = useReadContract({
    address: campaignAddress,
    abi: ABIS.Campaign,
    functionName: "verified",
  });

  // Pre-flight checks so the UI can explain *why* an action isn't available,
  // instead of letting the wallet pop up a transaction that just reverts.
  const { data: myShares } = useReadContract({
    address: campaignAddress,
    abi: ABIS.Campaign,
    functionName: "fundSharesOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const { data: alreadyVoted } = useReadContract({
    address: campaignAddress,
    abi: ABIS.Campaign,
    functionName: "hasVotedMilestone",
    args: address ? [BigInt(milestoneId), address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const [risk, setRisk] = useState<RiskAssessment | null>(null);

  const m = data as unknown as MilestoneStruct | undefined;
  const status = m?.status;
  const amount = m?.amount;
  const isOrganizer = Boolean(address && organizer && address.toLowerCase() === organizer.toLowerCase());
  const isMember = Boolean(myShares && (myShares as bigint) > 0n);
  const hasAlreadyVoted = Boolean(alreadyVoted);

  // transparencySnapshot() returns: raised, target, progressBps, distributed,
  // remaining, defiPrincipal, pendingYield, contributors. `remaining` is the
  // COMBINED reserve+DeFi+yield figure — the contract's proposeMilestoneRelease()
  // only checks against the LIQUID reserve, so we back that out here:
  // liquidReserve = remaining - defiPrincipal - pendingYield.
  const s = snapshot as unknown as bigint[] | undefined;
  const liquidReserve = s ? s[4] - s[5] - s[6] : undefined;

  useEffect(() => {
    if (isSuccess) refetch();
  }, [isSuccess, refetch]);

  useEffect(() => {
    if (status !== 0 || !isOrganizer || !s || amount === undefined) {
      setRisk(null);
      return;
    }
    const [raised, target] = s;
    assessMilestoneRisk({
      milestone_amount: Number(amount) / 1e6,
      campaign_reserve_balance: Number(liquidReserve ?? 0n) / 1e6,
      campaign_raised: Number(raised) / 1e6,
      campaign_target: Number(target) / 1e6,
      organizer_prior_milestones_released: 0,
      organizer_prior_milestones_rejected: 0,
      campaign_verified: Boolean(verified),
    }).then(setRisk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isOrganizer, snapshot, verified, amount]);

  if (!data) return null;
  const { description, amount: amountVal, status: statusVal, yesShares, noShares, votingDeadline } = m as MilestoneStruct;

  const totalVotes = yesShares + noShares;
  const yesPct = totalVotes > 0n ? Number((yesShares * 10000n) / totalVotes) / 100 : 0;
  const votingOpen = statusVal === 1 && Date.now() / 1000 < Number(votingDeadline);
  const canFinalize = statusVal === 1 && Date.now() / 1000 >= Number(votingDeadline);

  let voteBlockedReason: string | null = null;
  if (!isConnected) voteBlockedReason = "Connect your wallet to vote.";
  else if (hasAlreadyVoted) voteBlockedReason = "You've already voted on this milestone.";
  else if (!isMember) voteBlockedReason = "Donate to this campaign to get voting power.";

  // Why "Propose Release" would fail: the milestone amount exceeds what's
  // actually liquid in the reserve right now (separate from the DeFi-locked
  // and pending-yield portions of the treasury).
  const insufficientReserve = Boolean(liquidReserve !== undefined && amountVal > liquidReserve);

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">#{milestoneId} — {description}</p>
          <p className="text-sm text-neutral-400">{formatRUSD(amountVal)} RUSD</p>
        </div>
        <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-xs text-white">
          {statusLabel(statusVal, "milestone")}
        </span>
      </div>

      {totalVotes > 0n && (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-white" style={{ width: `${yesPct}%` }} />
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            YES {yesPct.toFixed(0)}% / NO {(100 - yesPct).toFixed(0)}%
          </p>
        </div>
      )}

      {statusVal === 0 && isOrganizer && (
        <>
          {risk && <RiskBadge assessment={risk} />}

          {insufficientReserve && (
            <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              This milestone needs {formatRUSD(amountVal)} RUSD, but only{" "}
              {formatRUSD(liquidReserve)} RUSD is currently liquid in the campaign&apos;s reserve
              (the rest is either not yet raised or is working in the DeFi yield engine). Wait for
              more donations, or add a smaller milestone instead.
            </p>
          )}

          <button
            disabled={isPending || insufficientReserve}
            onClick={() =>
              writeContract({
                address: campaignAddress,
                abi: ABIS.Campaign,
                functionName: "proposeMilestoneRelease",
                args: [BigInt(milestoneId)],
              })
            }
            className="btn-shine mt-3 w-full rounded-lg border-2 border-white bg-white px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white disabled:opacity-40"
          >
            Propose Release
          </button>
        </>
      )}

      {votingOpen && (
        <div className="mt-3">
          {voteBlockedReason ? (
            <p className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-neutral-400">
              {voteBlockedReason}
            </p>
          ) : (
            <div className="flex gap-2">
              <button
                disabled={isPending}
                onClick={() =>
                  writeContract({
                    address: campaignAddress,
                    abi: ABIS.Campaign,
                    functionName: "voteMilestone",
                    args: [BigInt(milestoneId), true],
                  })
                }
                className="btn-shine flex-1 rounded-lg border-2 border-white bg-white px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white disabled:opacity-40"
              >
                Vote YES
              </button>
              <button
                disabled={isPending}
                onClick={() =>
                  writeContract({
                    address: campaignAddress,
                    abi: ABIS.Campaign,
                    functionName: "voteMilestone",
                    args: [BigInt(milestoneId), false],
                  })
                }
                className="btn-shine flex-1 rounded-lg border-2 border-white px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black disabled:opacity-40"
              >
                Vote NO
              </button>
            </div>
          )}
        </div>
      )}

      {canFinalize && (
        <button
          disabled={isPending || isConfirming}
          onClick={() =>
            writeContract({
              address: campaignAddress,
              abi: ABIS.Campaign,
              functionName: "finalizeMilestone",
              args: [BigInt(milestoneId)],
            })
          }
          className="btn-shine mt-3 w-full rounded-lg border-2 border-white bg-white px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white disabled:opacity-40"
        >
          Finalize Milestone
        </button>
      )}
    </div>
  );
}