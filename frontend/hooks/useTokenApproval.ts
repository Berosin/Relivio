"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { ADDRESSES } from "@/lib/addresses";

/// Checks the connected wallet's RUSD allowance for `spender` and exposes an
/// `approve` action. Every Relivio contribution/donation flow needs this before
/// the underlying deposit/donate call (see spec section 12: Approve token → Confirm deposit).
export function useTokenApproval(spender: `0x${string}` | undefined, amount: bigint) {
  const { address } = useAccount();

  const { data: allowance, refetch } = useReadContract({
    address: ADDRESSES.stablecoin,
    abi: ABIS.MockStablecoin,
    functionName: "allowance",
    args: address && spender ? [address, spender] : undefined,
    query: { enabled: Boolean(address && spender) },
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const currentAllowance = (allowance as bigint | undefined) ?? 0n;
  const needsApproval = currentAllowance < amount;

  function approve() {
    if (!spender) return;
    writeContract({
      address: ADDRESSES.stablecoin as `0x${string}`,
      abi: ABIS.MockStablecoin,
      functionName: "approve",
      args: [spender as `0x${string}`, amount],
    });
  }

  return { needsApproval, approve, isPending, isConfirming, isSuccess, refetchAllowance: refetch };
}
