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
            className="rounded-md border-2 border-black bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-black hover:text-white"
        >
          {shortAddress(address)}
        </button>
      </div>
    );
  }

  if (connectors.length === 0) {
    return (
      <span className="text-xs text-neutral-500">
        No wallet detected — install MetaMask
      </span>
    );
  }

  const connector = connectors[0];

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => connect({ connector })}
        disabled={isPending}
        className="btn-shine rounded-md border-2 border-black bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black disabled:opacity-40"
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && <span className="text-xs text-red-600">{error.message}</span>}
    </div>
  );
}