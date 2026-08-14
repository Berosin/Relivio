"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { parseRUSD } from "@/lib/format";
import { useTokenApproval } from "@/hooks/useTokenApproval";

export function ContributePanel({
  fundAddress,
  onDone,
}: {
  fundAddress: `0x${string}`;
  onDone: () => void;
}) {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState("50");
  const parsedAmount = parseRUSD(amount);

  const approval = useTokenApproval(fundAddress, parsedAmount);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function contribute() {
    writeContract({
      address: fundAddress,
      abi: ABIS.CommunityFund,
      functionName: "contribute",
      args: [parsedAmount],
    });
  }

 useEffect(() => {
    if (isSuccess) onDone();
  }, [isSuccess, onDone]);

  return (
    <div className="card">
      <h3 className="font-semibold">Contribute — Community Treasury</h3>
      <p className="mt-1 text-xs text-neutral-500">
        This is a treasury contribution, distinct from a repayable emergency assistance payout.
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
          className="btn-primary mt-3 w-full"
        >
          {approval.isPending || approval.isConfirming ? "Approving..." : "1. Approve RUSD"}
        </button>
      ) : (
        <button
          onClick={contribute}
          disabled={!isConnected || isPending || isConfirming}
          className="btn-primary mt-3 w-full"
        >
          {isPending ? "Confirm in wallet..." : isConfirming ? "Contributing..." : "2. Contribute"}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{getFriendlyErrorMessage(error)}</p>}
    </div>
  );
}
