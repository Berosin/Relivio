"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { parseRUSD } from "@/lib/format";
import { useTokenApproval } from "@/hooks/useTokenApproval";

export function DonatePanel({
  campaignAddress,
  onDone,
}: {
  campaignAddress: `0x${string}`;
  onDone: () => void;
}) {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState("100");
  const parsedAmount = parseRUSD(amount);

  const approval = useTokenApproval(campaignAddress, parsedAmount);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function donate() {
    writeContract({
      address: campaignAddress,
      abi: ABIS.Campaign,
      functionName: "donate",
      args: [parsedAmount],
    });
  }

useEffect(() => {
    if (isSuccess) onDone();
  }, [isSuccess, onDone]);
  
  return (
    <div className="card">
      <h3 className="font-semibold">Donate</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Donations are never repayable and fund milestone-gated relief distributions.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="number"
          className="input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <span className="flex items-center px-2 text-sm text-neutral-500">RUSD</span>
      </div>

      {approval.needsApproval ? (
        <button
          onClick={approval.approve}
          disabled={!isConnected || approval.isPending || approval.isConfirming}
          className="btn-shine mt-3 w-full rounded-lg border-2 border-white bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white disabled:opacity-40"
        >
          {approval.isPending || approval.isConfirming ? "Approving..." : "1. Approve RUSD"}
        </button>
      ) : (
        <button
          onClick={donate}
          disabled={!isConnected || isPending || isConfirming}
          className="btn-shine mt-3 w-full rounded-lg border-2 border-white bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white disabled:opacity-40"
        >
          {isPending ? "Confirm in wallet..." : isConfirming ? "Donating..." : "2. Donate"}
        </button>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-red-400">{getFriendlyErrorMessage(error)}</p>}
    </div>
  );
}