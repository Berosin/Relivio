"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBlockNumber } from "wagmi";

/// On Anvil, every transaction mines a new block immediately. By invalidating
/// all wagmi query-cache entries whenever the block number changes, every
/// useReadContract/useReadContracts call on the page (balances, treasury
/// snapshots, vote tallies, allowances, etc.) automatically refetches right
/// after any transaction confirms — no manual page refresh needed anywhere
/// in the app. This runs once, mounted near the root, and applies globally.
export function LiveBlockWatcher() {
  const queryClient = useQueryClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  useEffect(() => {
    if (blockNumber === undefined) return;
    queryClient.invalidateQueries();
  }, [blockNumber, queryClient]);

  return null;
}