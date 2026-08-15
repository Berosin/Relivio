"use client";

import { useState } from "react";
import Link from "next/link";
import { useReadContract, useReadContracts } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { ADDRESSES } from "@/lib/addresses";
import { formatRUSD } from "@/lib/format";

export default function FundsPage() {
  const [search, setSearch] = useState("");

  const { data: count } = useReadContract({
    address: ADDRESSES.fundFactory,
    abi: ABIS.FundFactory,
    functionName: "allFundsCount",
    query: { enabled: Boolean(ADDRESSES.fundFactory) },
  });

  const total = count ? Number(count) : 0;

  const { data: addresses } = useReadContracts({
    contracts: Array.from({ length: total }, (_, i) => ({
      address: ADDRESSES.fundFactory,
      abi: ABIS.FundFactory,
      functionName: "allFunds",
      args: [BigInt(i)],
    })) as never[],
    query: { enabled: total > 0 },
  });

  const fundAddresses = (addresses ?? [])
    .map((r) => r.result as `0x${string}` | undefined)
    .filter(Boolean) as `0x${string}`[];

  const { data: configs } = useReadContracts({
    contracts: fundAddresses.map((addr) => ({
      address: addr,
      abi: ABIS.CommunityFund,
      functionName: "config",
    })) as never[],
    query: { enabled: fundAddresses.length > 0 },
  });

  const searchLower = search.trim().toLowerCase();
  const visibleAddresses = fundAddresses.filter((_, i) => {
    if (!searchLower) return true;
    const cfg = configs?.[i]?.result as string[] | undefined;
    const name = cfg?.[0]?.toLowerCase() ?? "";
    const description = cfg?.[1]?.toLowerCase() ?? "";
    const fundType = cfg?.[2]?.toLowerCase() ?? "";
    return name.includes(searchLower) || description.includes(searchLower) || fundType.includes(searchLower);
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Emergency Assistance Funds</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Community-owned treasuries for individual emergency assistance.
          </p>
        </div>
        <Link
          href="/funds/create"
          className="btn-shine rounded-md border-2 border-white bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black"
        >
          + Create Fund
        </Link>
      </div>

      {!ADDRESSES.fundFactory && (
        <p className="mt-8 text-sm text-neutral-400">
          Set NEXT_PUBLIC_FUND_FACTORY_ADDRESS in frontend/.env.local to load funds.
        </p>
      )}

      {ADDRESSES.fundFactory && total > 0 && (
        <input
          type="text"
          placeholder="Search funds by name, description, or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input mt-6 max-w-md"
        />
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleAddresses.map((addr) => (
          <FundCard key={addr} address={addr} />
        ))}
      </div>

      {ADDRESSES.fundFactory && total === 0 && (
        <p className="mt-8 text-sm text-neutral-500">
          No funds created yet. Be the first to create one.
        </p>
      )}

      {ADDRESSES.fundFactory && total > 0 && visibleAddresses.length === 0 && (
        <p className="mt-8 text-sm text-neutral-500">No funds match &quot;{search}&quot;.</p>
      )}
    </div>
  );
}

function FundCard({ address }: { address: `0x${string}` }) {
  const { data: config } = useReadContract({
    address,
    abi: ABIS.CommunityFund,
    functionName: "config",
  });
  const { data: snapshot } = useReadContract({
    address,
    abi: ABIS.CommunityFund,
    functionName: "treasurySnapshot",
  });

  const name = (config as unknown as string[] | undefined)?.[0] ?? "Loading fund...";
  const totalTreasury = (snapshot as unknown as bigint[] | undefined)?.[0];
  const contributors = (snapshot as unknown as bigint[] | undefined)?.[6];

  return (
    <Link
      href={`/funds/${address}`}
      className="rounded-xl border-2 border-white/15 bg-black p-5 text-white transition-shadow hover:shadow-[0_4px_20px_rgba(255,255,255,0.06)] hover:border-white/40"
    >
      <h3 className="font-semibold">{name}</h3>
      <p className="mt-2 text-xs text-neutral-500">Treasury</p>
      <p className="text-lg font-bold text-white">{formatRUSD(totalTreasury)} RUSD</p>
      <p className="mt-1 text-xs text-neutral-500">
        {contributors !== undefined ? contributors.toString() : "—"} contributors
      </p>
    </Link>
  );
}