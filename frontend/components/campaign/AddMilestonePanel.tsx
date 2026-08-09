"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { parseRUSD } from "@/lib/format";

export function AddMilestonePanel({
  campaignAddress,
  onDone,
}: {
  campaignAddress: `0x${string}`;
  onDone: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

useEffect(() => {
    if (isSuccess) onDone();
  }, [isSuccess, onDone]);
  
  return (
    <div className="card">
      <h3 className="font-semibold">Add Milestone (organizer only)</h3>
      <div className="mt-3 space-y-2">
        <input
          placeholder="Description (e.g. Food & Water)"
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="number"
          placeholder="Amount (RUSD)"
          className="input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button
          disabled={isPending || isConfirming || !description || !amount}
          onClick={() =>
            writeContract({
              address: campaignAddress,
              abi: ABIS.Campaign,
              functionName: "addMilestone",
              args: [description, parseRUSD(amount)],
            })
          }
          className="w-full rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-black hover:bg-sky-400 disabled:opacity-50"
        >
          Add Milestone
        </button>
        {error && <p className="text-xs text-red-400">{error.message}</p>}
      </div>
    </div>
  );
}
