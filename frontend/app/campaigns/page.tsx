"use client";

import Link from "next/link";
import { useReadContract, useReadContracts } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { ADDRESSES } from "@/lib/addresses";
import { formatRUSD } from "@/lib/format";

export default function CampaignsPage() {
  const { data: count } = useReadContract({
    address: ADDRESSES.campaignFactory,
    abi: ABIS.CampaignFactory,
    functionName: "allCampaignsCount",
    query: { enabled: Boolean(ADDRESSES.campaignFactory) },
  });

  const total = count ? Number(count) : 0;

  const { data: addresses } = useReadContracts({
    contracts: Array.from({ length: total }, (_, i) => ({
      address: ADDRESSES.campaignFactory,
      abi: ABIS.CampaignFactory,
      functionName: "allCampaigns",
      args: [BigInt(i)],
    })) as never[],
    query: { enabled: total > 0 },
  });

  const campaignAddresses = (addresses ?? [])
    .map((r) => r.result as `0x${string}` | undefined)
    .filter(Boolean) as `0x${string}`[];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Disaster & Community Relief Campaigns</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Public, milestone-governed relief campaigns. Donations never carry a repayment
            obligation.
          </p>
        </div>
        <Link
          href="/campaigns/create"
className="btn-shine rounded-md border-2 border-white bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black"
        >
          + Create Campaign
        </Link>
      </div>

      {!ADDRESSES.campaignFactory && (
        <p className="mt-8 text-sm text-neutral-400">
          Set NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS in frontend/.env.local to load campaigns.
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaignAddresses.map((addr) => (
          <CampaignCard key={addr} address={addr} />
        ))}
      </div>

      {ADDRESSES.campaignFactory && total === 0 && (
        <p className="mt-8 text-sm text-neutral-400">No campaigns yet. Be the first to create one.</p>
      )}
    </div>
  );
}

function CampaignCard({ address }: { address: `0x${string}` }) {
  const { data: name } = useReadContract({
    address,
    abi: ABIS.Campaign,
    functionName: "campaignName",
  });
  const { data: snapshot } = useReadContract({
    address,
    abi: ABIS.Campaign,
    functionName: "transparencySnapshot",
  });
  const { data: verified } = useReadContract({
    address,
    abi: ABIS.Campaign,
    functionName: "verified",
  });

  const s = snapshot as unknown as bigint[] | undefined;
  const raised = s?.[0];
  const target = s?.[1];
  const progressBps = s?.[2];

  return (
    <Link
      href={`/campaigns/${address}`}
className="rounded-xl border-2 border-white/15 bg-black p-5 text-white transition-shadow hover:shadow-[0_4px_20px_rgba(255,255,255,0.06)] hover:border-white/40"    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{(name as string | undefined) ?? "Loading..."}</h3>
        {Boolean(verified) && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white">Verified</span>

        )}
      </div>
      <p className="mt-3 text-lg font-bold text-white">
        {formatRUSD(raised)} / {formatRUSD(target)} RUSD
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full bg-white"
          style={{ width: `${progressBps ? Number(progressBps) / 100 : 0}%` }}
        />
      </div>
    </Link>
  );
}