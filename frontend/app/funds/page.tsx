"use client";

import Link from "next/link";
import { useReadContract, useReadContracts } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { ADDRESSES } from "@/lib/addresses";
import { formatRUSD } from "@/lib/format";

export default function FundsPage() {
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Emergency Assistance Funds</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Community-owned treasuries for individual emergency assistance.
          </p>
        </div>
        <Link
          href="/funds/create"
          className="btn-shine rounded-md border-2 border-black bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black"

        >
          + Create Fund
        </Link>
      </div>

      {!ADDRESSES.fundFactory && (
        <p className="mt-8 text-sm text-neutral-600">
          Set NEXT_PUBLIC_FUND_FACTORY_ADDRESS in frontend/.env.local to load funds.
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fundAddresses.map((addr) => (
          <FundCard key={addr} address={addr} />
        ))}
      </div>

      {ADDRESSES.fundFactory && total === 0 && (
        <p className="mt-8 text-sm text-neutral-600">
          No funds created yet. Be the first to create one.
        </p>
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
className="rounded-xl border-2 border-black bg-black p-5 text-white transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:border-white/40"    >
      <h3 className="font-semibold">{name}</h3>
      <p className="mt-2 text-xs text-neutral-600">Treasury</p>
      <p className="text-lg font-bold text-white">{formatRUSD(totalTreasury)} RUSD</p>
      <p className="mt-1 text-xs text-neutral-600">
        {contributors !== undefined ? contributors.toString() : "—"} contributors
      </p>
    </Link>
  );
}