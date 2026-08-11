"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ABIS } from "@/contracts/abis";
import { ADDRESSES } from "@/lib/addresses";
import { formatRUSD } from "@/lib/format";
import { StatGrid } from "@/components/StatGrid";

export default function AnalyticsPage() {
  const { data: fundCount } = useReadContract({
    address: ADDRESSES.fundFactory,
    abi: ABIS.FundFactory,
    functionName: "allFundsCount",
    query: { enabled: Boolean(ADDRESSES.fundFactory) },
  });
  const { data: campaignCount } = useReadContract({
    address: ADDRESSES.campaignFactory,
    abi: ABIS.CampaignFactory,
    functionName: "allCampaignsCount",
    query: { enabled: Boolean(ADDRESSES.campaignFactory) },
  });

  const totalFunds = fundCount ? Number(fundCount) : 0;
  const totalCampaigns = campaignCount ? Number(campaignCount) : 0;

  const { data: fundAddrResults } = useReadContracts({
    contracts: Array.from({ length: totalFunds }, (_, i) => ({
      address: ADDRESSES.fundFactory,
      abi: ABIS.FundFactory,
      functionName: "allFunds",
      args: [BigInt(i)],
    })) as never[],
    query: { enabled: totalFunds > 0 },
  });
  const { data: campaignAddrResults } = useReadContracts({
    contracts: Array.from({ length: totalCampaigns }, (_, i) => ({
      address: ADDRESSES.campaignFactory,
      abi: ABIS.CampaignFactory,
      functionName: "allCampaigns",
      args: [BigInt(i)],
    })) as never[],
    query: { enabled: totalCampaigns > 0 },
  });

  const fundAddresses = (fundAddrResults ?? [])
    .map((r) => r.result as `0x${string}` | undefined)
    .filter(Boolean) as `0x${string}`[];
  const campaignAddresses = (campaignAddrResults ?? [])
    .map((r) => r.result as `0x${string}` | undefined)
    .filter(Boolean) as `0x${string}`[];

  const { data: fundSnapshots } = useReadContracts({
    contracts: fundAddresses.flatMap((addr) => [
      { address: addr, abi: ABIS.CommunityFund, functionName: "treasurySnapshot" },
      { address: addr, abi: ABIS.CommunityFund, functionName: "config" },
    ]) as never[],
    query: { enabled: fundAddresses.length > 0 },
  });

  const { data: campaignSnapshots } = useReadContracts({
    contracts: campaignAddresses.flatMap((addr) => [
      { address: addr, abi: ABIS.Campaign, functionName: "transparencySnapshot" },
      { address: addr, abi: ABIS.Campaign, functionName: "campaignName" },
    ]) as never[],
    query: { enabled: campaignAddresses.length > 0 },
  });

  const fundRows = fundAddresses.map((addr, i) => {
    const snap = fundSnapshots?.[i * 2]?.result as bigint[] | undefined;
    const cfg = fundSnapshots?.[i * 2 + 1]?.result as unknown[] | undefined;
    return {
      address: addr,
      name: (cfg?.[0] as string) ?? addr.slice(0, 8),
      totalTreasury: snap?.[0] ?? 0n,
      distributed: snap?.[2] ?? 0n,
      pendingYield: snap?.[5] ?? 0n,
    };
  });

  const campaignRows = campaignAddresses.map((addr, i) => {
    const snap = campaignSnapshots?.[i * 2]?.result as bigint[] | undefined;
    const name = campaignSnapshots?.[i * 2 + 1]?.result as string | undefined;
    return {
      address: addr,
      name: name ?? addr.slice(0, 8),
      raised: snap?.[0] ?? 0n,
      distributed: snap?.[3] ?? 0n,
      pendingYield: snap?.[6] ?? 0n,
    };
  });

  const totalFundTreasury = fundRows.reduce((sum, f) => sum + f.totalTreasury, 0n);
  const totalFundDistributed = fundRows.reduce((sum, f) => sum + f.distributed, 0n);
  const totalCampaignRaised = campaignRows.reduce((sum, c) => sum + c.raised, 0n);
  const totalCampaignDistributed = campaignRows.reduce((sum, c) => sum + c.distributed, 0n);
  const totalSimulatedYield =
    fundRows.reduce((sum, f) => sum + f.pendingYield, 0n) +
    campaignRows.reduce((sum, c) => sum + c.pendingYield, 0n);

  const chartData = [
    ...fundRows.map((f) => ({ name: f.name, treasury: Number(f.totalTreasury) / 1e6, kind: "Fund" })),
    ...campaignRows.map((c) => ({ name: c.name, treasury: Number(c.raised) / 1e6, kind: "Campaign" })),
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-bold">Platform Analytics</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Aggregated, on-chain figures across every Relivio fund and campaign. No off-chain data
        involved — every number here is read directly from the contracts.
      </p>

      <div className="mt-6">
        <StatGrid
          stats={[
            { label: "Emergency Funds", value: totalFunds.toString() },
            { label: "Relief Campaigns", value: totalCampaigns.toString() },
            { label: "Total Fund Treasury", value: `${formatRUSD(totalFundTreasury)} RUSD` },
            { label: "Total Campaign Raised", value: `${formatRUSD(totalCampaignRaised)} RUSD` },
            {
              label: "Total Distributed (Funds)",
              value: `${formatRUSD(totalFundDistributed)} RUSD`,
            },
            {
              label: "Total Distributed (Campaigns)",
              value: `${formatRUSD(totalCampaignDistributed)} RUSD`,
            },
            {
              label: "Total Simulated Yield Pending",
              value: `+${formatRUSD(totalSimulatedYield)} RUSD`,
              accent: "text-white",
            },
          ]}
        />
      </div>

      {chartData.length > 0 && (
        <div className="card mt-8">
          <h3 className="mb-4 font-semibold">Treasury / Raised by Fund & Campaign (RUSD)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" tick={{ fill: "#a3a3a3", fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#171717", border: "1px solid #404040", fontSize: 12 }}
                formatter={(value) => [`${Number(value).toLocaleString()} RUSD`, "Amount"]}
              />
              <Bar dataKey="treasury" fill="#ffffff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length === 0 && (
        <p className="mt-8 text-sm text-neutral-600">
          No funds or campaigns deployed yet — analytics will populate once activity starts.
        </p>
      )}
    </div>
  );
}