"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { getFriendlyErrorMessage } from "@/lib/errors";

export function VerifierPanel({ campaignAddress }: { campaignAddress: `0x${string}` }) {
  const { address, isConnected } = useAccount();

  const { data: verifierAddr } = useReadContract({
    address: campaignAddress,
    abi: ABIS.Campaign,
    functionName: "verifier",
  });
  const { data: verified, refetch } = useReadContract({
    address: campaignAddress,
    abi: ABIS.Campaign,
    functionName: "verified",
  });

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  if (isSuccess) refetch();

  const isVerifier = Boolean(
    isConnected && address && verifierAddr && address.toLowerCase() === (verifierAddr as string).toLowerCase()
  );

  if (!isVerifier) return null;

  return (
    <div className="card mt-4 border-white/20">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
        Platform Verifier Controls
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        You are the designated verifier for this campaign. Verification is a signal to donors that
        this campaign's organizer and purpose have been checked — it does not affect fund flow.
      </p>
      <button
        onClick={() =>
          writeContract({
            address: campaignAddress,
            abi: ABIS.Campaign,
            functionName: "setVerified",
            args: [!verified],
          })
        }
        disabled={isPending || isConfirming}
        className="mt-3 w-full rounded-lg border-2 border-white bg-white px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white disabled:opacity-40"
      >
        {isPending
          ? "Confirm in wallet..."
          : isConfirming
          ? "Updating..."
          : verified
          ? "Remove Verification"
          : "Verify This Campaign"}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-red-400">{getFriendlyErrorMessage(error)}</p>}
    </div>
  );
}