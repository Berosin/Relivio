import { formatUnits, parseUnits } from "viem";
import { STABLECOIN_DECIMALS } from "./addresses";

export function formatRUSD(value: bigint | undefined | null): string {
  if (value === undefined || value === null) return "0.00";
  return Number(formatUnits(value, STABLECOIN_DECIMALS)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseRUSD(value: string): bigint {
  if (!value) return 0n;
  return parseUnits(value, STABLECOIN_DECIMALS);
}

export function bpsToPercent(bps: bigint | number): string {
  return `${(Number(bps) / 100).toFixed(1)}%`;
}

export function secondsToDuration(seconds: bigint | number): string {
  const s = Number(seconds);
  if (s >= 86400) return `${Math.round(s / 86400)} day${Math.round(s / 86400) !== 1 ? "s" : ""}`;
  if (s >= 3600) return `${Math.round(s / 3600)} hour${Math.round(s / 3600) !== 1 ? "s" : ""}`;
  return `${s} sec`;
}

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function statusLabel(status: number, kind: "request" | "milestone"): string {
  const requestLabels = ["PENDING", "APPROVED", "REJECTED", "RELEASED", "REPAYING", "REPAID", "DEFAULTED"];
  const milestoneLabels = ["LOCKED", "PROPOSED", "APPROVED", "RELEASED", "REJECTED"];
  return kind === "request" ? requestLabels[status] ?? "UNKNOWN" : milestoneLabels[status] ?? "UNKNOWN";
}
