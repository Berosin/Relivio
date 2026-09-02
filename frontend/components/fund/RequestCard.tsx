"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { formatRUSD, parseRUSD, statusLabel } from "@/lib/format";
import { useTokenApproval } from "@/hooks/useTokenApproval";
import { CommentSection } from "@/components/CommentSection";

type RequestStruct = {
  requester: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  reason: string;
  repaymentPeriod: bigint;
  status: number;
  yesShares: bigint;
  noShares: bigint;
  votingDeadline: bigint;
  createdAt: bigint;
  releasedAt: bigint;
  amountRepaid: bigint;
  repaymentDeadline: bigint;
};

export function RequestCard({
  fundAddress,
  requestId,
}: {
  fundAddress: `0x${string}`;
  requestId: number;
}) {
  const { address, isConnected } = useAccount();
  const { data, refetch } = useReadContract({
    address: fundAddress,
    abi: ABIS.CommunityFund,
    functionName: "getRequest",
    args: [BigInt(requestId)],
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [repayAmount, setRepayAmount] = useState("");
  const [showComments, setShowComments] = useState(false);
  const repayApproval = useTokenApproval(fundAddress, parseRUSD(repayAmount || "0"));

  const { data: myShares } = useReadContract({
    address: fundAddress,
    abi: ABIS.CommunityFund,
    functionName: "fundSharesOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const { data: alreadyVoted } = useReadContract({
    address: fundAddress,
    abi: ABIS.CommunityFund,
    functionName: "hasVoted",
    args: address ? [BigInt(requestId), address] : undefined,
    query: { enabled: Boolean(address) },
  });

  useEffect(() => {
    if (isSuccess) refetch();
  }, [isSuccess, refetch]);

  if (!data) return null;
  const r = data as unknown as RequestStruct;
  const { requester, amount, reason, repaymentPeriod, status, yesShares, noShares, votingDeadline } = r;

  const totalVotes = yesShares + noShares;
  const yesPct = totalVotes > 0n ? Number((yesShares * 10000n) / totalVotes) / 100 : 0;
  const votingOpen = Date.now() / 1000 < Number(votingDeadline) && status === 0;
  const canFinalize = status === 0 && Date.now() / 1000 >= Number(votingDeadline);

  const isOwnRequest = Boolean(address && requester.toLowerCase() === address.toLowerCase());
  const isMember = Boolean(myShares && (myShares as bigint) > 0n);
  const hasAlreadyVoted = Boolean(alreadyVoted);

  let voteBlockedReason: string | null = null;
  if (!isConnected) voteBlockedReason = "Connect your wallet to vote.";
  else if (isOwnRequest) voteBlockedReason = "You can't vote on your own request.";
  else if (hasAlreadyVoted) voteBlockedReason = "You've already voted on this request.";
  else if (!isMember) voteBlockedReason = "Contribute to this fund to get voting power.";

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">#{requestId} — {formatRUSD(amount)} RUSD</p>
          <p className="text-sm text-neutral-400">{reason}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {repaymentPeriod > 0n ? "Emergency Assistance (repayable)" : "Emergency Assistance (donation-style)"}
          </p>
        </div>
        <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-xs text-white">
          {statusLabel(status, "request")}
        </span>
      </div>

      {totalVotes > 0n && (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-white" style={{ width: `${yesPct}%` }} />
          </div>
          <p className="mt-1 text-xs text-neutral-500">YES {yesPct.toFixed(0)}% / NO {(100 - yesPct).toFixed(0)}%</p>
        </div>
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
                    address: fundAddress,
                    abi: ABIS.CommunityFund,
                    functionName: "vote",
                    args: [BigInt(requestId), true],
                  })
                }
                className="btn-shine flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
              >
                Vote YES
              </button>
              <button
                disabled={isPending}
                onClick={() =>
                  writeContract({
                    address: fundAddress,
                    abi: ABIS.CommunityFund,
                    functionName: "vote",
                    args: [BigInt(requestId), false],
                  })
                }
                className="btn-shine flex-1 rounded-lg border-2 border-white bg-white px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white disabled:opacity-40"
              >
                Vote NO
              </button>
            </div>
          )}
        </div>
      )}

      {canFinalize && (
        <button
          disabled={isPending}
          onClick={() =>
            writeContract({
              address: fundAddress,
              abi: ABIS.CommunityFund,
              functionName: "finalizeRequest",
              args: [BigInt(requestId)],
            })
          }
          className="btn-shine btn-primary mt-3 w-full"
        >
          Finalize Request
        </button>
      )}

      {status === 4 && (
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            placeholder="Repay amount"
            className="input"
            value={repayAmount}
            onChange={(e) => setRepayAmount(e.target.value)}
          />
          {repayApproval.needsApproval && Number(repayAmount) > 0 ? (
            <button
              disabled={!isConnected || repayApproval.isPending || repayApproval.isConfirming}
              onClick={repayApproval.approve}
              className="btn-shine btn-primary whitespace-nowrap"
            >
              Approve
            </button>
          ) : (
            <button
              disabled={!isConnected || isPending || isConfirming || Number(repayAmount) <= 0}
              onClick={() =>
                writeContract({
                  address: fundAddress,
                  abi: ABIS.CommunityFund,
                  functionName: "repay",
                  args: [BigInt(requestId), parseRUSD(repayAmount)],
                })
              }
              className="btn-shine btn-primary"
            >
              Repay
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowComments((s) => !s)}
        className="mt-3 text-xs font-medium text-neutral-500 underline decoration-dotted underline-offset-4 transition-colors hover:text-white"
      >
        {showComments ? "Hide comments" : "Show comments"}
      </button>
      {showComments && (
        <CommentSection targetType="fund_request" targetAddress={fundAddress} targetId={requestId} />
      )}
    </div>
  );
}