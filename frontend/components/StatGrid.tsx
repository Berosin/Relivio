import { formatRUSD } from "@/lib/format";

export function StatGrid({
  stats,
}: {
  stats: { label: string; value: string; accent?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="card">
          <p className="text-xs text-neutral-500">{s.label}</p>
          <p className={`mt-1 text-xl font-bold ${s.accent ?? "text-neutral-100"}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

export function treasuryStats(snapshot: readonly bigint[] | undefined) {
  if (!snapshot) return [];
  const [totalTreasury, deposited, distributed, reserve, defiPrincipal, pendingYield, contributors] =
    snapshot;
  return [
    { label: "Total Treasury", value: `${formatRUSD(totalTreasury)} RUSD` },
    { label: "Deposited", value: `${formatRUSD(deposited)} RUSD` },
    { label: "Distributed", value: `${formatRUSD(distributed)} RUSD` },
    { label: "Emergency Reserve", value: `${formatRUSD(reserve)} RUSD` },
    { label: "DeFi Allocation", value: `${formatRUSD(defiPrincipal)} RUSD` },
    {
      label: "Simulated Yield",
      value: `+${formatRUSD(pendingYield)} RUSD`,
      accent: "text-white",
    },
    { label: "Contributors", value: contributors.toString() },
  ];
}
