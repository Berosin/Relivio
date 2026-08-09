"use client";

import { useAccount, useConnect, useDisconnect, useReadContract } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { ADDRESSES } from "@/lib/addresses";
import { formatRUSD, shortAddress } from "@/lib/format";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  const { data: balance } = useReadContract({
    address: ADDRESSES.stablecoin,
    abi: ABIS.MockStablecoin,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && ADDRESSES.stablecoin) },
  });

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        {balance !== undefined && (
          <span className="text-sm text-neutral-400">
            {formatRUSD(balance as bigint)} RUSD
          </span>
        )}
        <button
          onClick={() => disconnect()}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium hover:bg-neutral-800"
        >
          {shortAddress(address)}
        </button>
      </div>
    );
  }

  if (connectors.length === 0) {
    return (
      <span className="text-xs text-amber-400">
        No wallet detected — install MetaMask
      </span>
    );
  }

  // Only one connector is configured (see lib/wagmi.ts), so there's always
  // exactly one button here — use a clean user-facing label instead of the
  // raw connector name (e.g. "Injected").
  const connector = connectors[0];

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => connect({ connector })}
        disabled={isPending}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && <span className="text-xs text-red-400">{error.message}</span>}
    </div>
  );
}