"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { foundry } from "wagmi/chains";

export function NetworkGuard() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending, error } = useSwitchChain();

  const targetChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || foundry.id);
  const targetName = targetChainId === foundry.id ? "Anvil Local" : `chain ${targetChainId}`;

  if (!isConnected) return null;
  if (chainId === targetChainId) return null;

  return (
    <div className="border-b border-red-300 bg-red-50 px-4 py-2 text-center text-xs text-red-700">
  Wrong network detected. Relivio needs <strong>{targetName}</strong> (chain ID {targetChainId}) —
  you&apos;re currently connected to chain {chainId}.{" "}
  <button
    onClick={() => switchChain({ chainId: targetChainId as 11155111 | 31337 })}
    disabled={isPending}
    className="ml-2 rounded-md border-2 border-red-600 bg-red-600 px-3 py-1 font-semibold text-white transition-colors hover:bg-white hover:text-red-600 disabled:opacity-50"
  >
    {isPending ? "Switching..." : `Switch to ${targetName}`}
  </button>
  {error && <span className="ml-2 text-red-600">{error.message}</span>}
</div>
  );
}