"use client";

import { use, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { StatGrid } from "@/components/StatGrid";
import { formatRUSD, bpsToPercent } from "@/lib/format";
import { DonatePanel } from "@/components/campaign/DonatePanel";
import { MilestoneCard } from "@/components/campaign/MilestoneCard";
import { AddMilestonePanel } from "@/components/campaign/AddMilestonePanel";

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ address: `0x${string}` }>;
}) {
  const { address } = use(params);
  const { address: connected } = useAccount();
  const [tab, setTab] = useState<"milestones" | "donate">("milestones");

  const { data: name } = useReadContract({ address, abi: ABIS.Campaign, functionName: "campaignName" });
  const nameStr = (name as string | undefined) ?? "Loading...";
  const { data: description } = useReadContract({ address, abi: ABIS.Campaign, functionName: "description" });
  const descriptionStr = (description as string | undefined) ?? "";
  const { data: organizer } = useReadContract({ address, abi: ABIS.Campaign, functionName: "organizer" });
  const { data: verified } = useReadContract({ address, abi: ABIS.Campaign, functionName: "verified" });
  const { data: snapshot, refetch: refetchSnapshot } = useReadContract({
    address,
    abi: ABIS.Campaign,
    functionName: "transparencySnapshot",
  });
  const { data: milestonesCount } = useReadContract({
    address,
    abi: ABIS.Campaign,
    functionName: "milestonesCount",
  });

  const s = snapshot as unknown as bigint[] | undefined;
  const [raised, target, progressBps, distributed, remaining, defiPrincipal, pendingYield, contributors] =
    s ?? [];

  const stats = s
    ? [
        { label: "Raised", value: `${formatRUSD(raised)} RUSD` },
        { label: "Target", value: `${formatRUSD(target)} RUSD` },
        { label: "Progress", value: bpsToPercent(progressBps ?? 0n) },
        { label: "Distributed", value: `${formatRUSD(distributed)} RUSD` },
        { label: "Remaining", value: `${formatRUSD(remaining)} RUSD` },
        { label: "DeFi Allocation", value: `${formatRUSD(defiPrincipal)} RUSD` },
        { label: "Simulated Yield", value: `+${formatRUSD(pendingYield)} RUSD`, accent: "text-emerald-400" },
        { label: "Contributors", value: (contributors ?? 0n).toString() },
      ]
    : [];

  const count = milestonesCount ? Number(milestonesCount) : 0;
  const organizerAddr = organizer as `0x${string}` | undefined;
  const isOrganizer = Boolean(connected && organizerAddr && connected.toLowerCase() === organizerAddr.toLowerCase());

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{nameStr}</h1>
        {Boolean(verified) && (
          <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs text-sky-400">Verified</span>
        )}
      </div>
      <p className="mt-1 text-sm text-neutral-400">{descriptionStr}</p>
      <p className="mt-1 text-xs text-neutral-600">{address}</p>

      <div className="mt-6">
        <StatGrid stats={stats} />
      </div>

      <div className="mt-8 flex gap-2 border-b border-neutral-800">
        {(["milestones", "donate"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t ? "border-b-2 border-sky-500 text-white" : "text-neutral-500"
            }`}
          >
            {t === "milestones" ? "Milestones" : "Donate"}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {tab === "donate" && <DonatePanel campaignAddress={address} onDone={() => refetchSnapshot()} />}
        {tab === "milestones" && (
          <>
            {isOrganizer && (
              <AddMilestonePanel campaignAddress={address} onDone={() => {}} />
            )}
            {count === 0 && <p className="text-sm text-neutral-500">No milestones yet.</p>}
            {Array.from({ length: count }, (_, i) => i).map((id) => (
              <MilestoneCard
                key={id}
                campaignAddress={address}
                organizer={organizerAddr}
                milestoneId={id}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
