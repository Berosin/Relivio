"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { addToWatchlist, removeFromWatchlist } from "@/lib/relivioApi";

export function WatchButton({
  targetType,
  targetAddress,
}: {
  targetType: "fund" | "campaign";
  targetAddress: `0x${string}`;
}) {
  const { address, isConnected } = useAccount();
  const [watching, setWatching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!address) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/watchlist?wallet=${address}`);
        const data = await res.json();
        if (cancelled) return;
        const isWatching = (data.watchlist ?? []).some(
          (w: { target_type: string; target_address: string }) =>
            w.target_type === targetType && w.target_address.toLowerCase() === targetAddress.toLowerCase()
        );
        setWatching(isWatching);
      } catch {
        // Non-critical — button just falls back to showing "Watch".
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, targetType, targetAddress]);

  async function toggle() {
    if (!address) return;
    setLoading(true);
    const wasWatching = watching;
    setWatching(!wasWatching); // optimistic
    try {
      if (wasWatching) {
        await removeFromWatchlist(address, { target_type: targetType, target_address: targetAddress });
      } else {
        await addToWatchlist(address, { target_type: targetType, target_address: targetAddress });
      }
    } catch {
      setWatching(wasWatching); // revert on failure
    } finally {
      setLoading(false);
    }
  }

  if (!checked) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!isConnected || loading}
      title={!isConnected ? "Connect your wallet to watch this" : undefined}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
        watching
          ? "border-white bg-white/10 text-white"
          : "border-white/20 text-neutral-300 hover:border-white/40"
      }`}
    >
      {watching ? "★ Watching" : "☆ Watch"}
    </button>
  );
}