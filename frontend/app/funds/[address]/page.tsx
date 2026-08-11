"use client";

import { use, useState } from "react";
import { useReadContract } from "wagmi";
import { ABIS } from "@/contracts/abis";
import { StatGrid, treasuryStats } from "@/components/StatGrid";
import { ContributePanel } from "@/components/fund/ContributePanel";
import { CreateRequestPanel } from "@/components/fund/CreateRequestPanel";
import { RequestCard } from "@/components/fund/RequestCard";

export default function FundDetailPage({
  params,
}: {
  params: Promise<{ address: `0x${string}` }>;
}) {
  const { address } = use(params);
  const [tab, setTab] = useState<"requests" | "contribute" | "request">("requests");

  const { data: config } = useReadContract({
    address,
    abi: ABIS.CommunityFund,
    functionName: "config",
  });
  const { data: snapshot, refetch: refetchSnapshot } = useReadContract({
    address,
    abi: ABIS.CommunityFund,
    functionName: "treasurySnapshot",
  });
  const { data: requestsCount } = useReadContract({
    address,
    abi: ABIS.CommunityFund,
    functionName: "requestsCount",
  });

  const cfg = config as unknown as string[] | undefined;
  const name = cfg?.[0] ?? "Loading...";
  const description = cfg?.[1] ?? "";

  const count = requestsCount ? Number(requestsCount) : 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold">{name}</h1>
      <p className="mt-1 text-sm text-neutral-600">{description}</p>
      <p className="mt-1 text-xs text-neutral-600">{address}</p>

      <div className="mt-6">
        <StatGrid stats={treasuryStats(snapshot as unknown as readonly bigint[] | undefined)} />
      </div>

      <div className="mt-8 flex gap-2 border-b border-neutral-800">
        {(["requests", "contribute", "request"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${
              // active tab underline:
              tab === t ? "border-b-2 border-black text-black" : "text-neutral-500"   
            }`}
          >
            {t === "requests" ? "Emergency Requests" : t === "contribute" ? "Contribute" : "Request Help"}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "contribute" && (
          <ContributePanel fundAddress={address} onDone={() => refetchSnapshot()} />
        )}
        {tab === "request" && (
          <CreateRequestPanel fundAddress={address} onDone={() => setTab("requests")} />
        )}
        {tab === "requests" && (
          <div className="space-y-4">
            {count === 0 && (
              <p className="text-sm text-neutral-600">No requests yet.</p>
            )}
            {Array.from({ length: count }, (_, i) => count - 1 - i).map((id) => (
              <RequestCard key={id} fundAddress={address} requestId={id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
