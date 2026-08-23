import { describe, it, expect } from "vitest";
import {
  formatRUSD,
  parseRUSD,
  bpsToPercent,
  secondsToDuration,
  shortAddress,
  statusLabel,
} from "./format";

describe("formatRUSD", () => {
  it("formats a whole-token bigint with 2 decimal places", () => {
    expect(formatRUSD(1_000_000n)).toBe("1.00");
  });

  it("formats fractional amounts correctly", () => {
    expect(formatRUSD(1_500_000n)).toBe("1.50");
  });

  it("adds thousands separators for large amounts", () => {
    expect(formatRUSD(1_000_000_000_000n)).toBe("1,000,000.00");
  });

  it("returns 0.00 for undefined", () => {
    expect(formatRUSD(undefined)).toBe("0.00");
  });

  it("returns 0.00 for null", () => {
    expect(formatRUSD(null)).toBe("0.00");
  });

  it("returns 0.00 for a literal zero bigint", () => {
    expect(formatRUSD(0n)).toBe("0.00");
  });
});

describe("parseRUSD", () => {
  it("parses a whole-number string into 6-decimal bigint units", () => {
    expect(parseRUSD("1")).toBe(1_000_000n);
  });

  it("parses a decimal string correctly", () => {
    expect(parseRUSD("1.5")).toBe(1_500_000n);
  });

  it("returns 0n for an empty string", () => {
    expect(parseRUSD("")).toBe(0n);
  });

  it("round-trips with formatRUSD", () => {
    const amount = "350.25";
    expect(formatRUSD(parseRUSD(amount))).toBe("350.25");
  });
});

describe("bpsToPercent", () => {
  it("converts basis points to a percentage string", () => {
    expect(bpsToPercent(6000)).toBe("60.0%");
  });

  it("handles bigint input", () => {
    expect(bpsToPercent(2000n)).toBe("20.0%");
  });

  it("handles fractional percentages", () => {
    expect(bpsToPercent(1050)).toBe("10.5%");
  });

  it("handles zero", () => {
    expect(bpsToPercent(0)).toBe("0.0%");
  });
});

describe("secondsToDuration", () => {
  it("formats seconds under an hour as raw seconds", () => {
    expect(secondsToDuration(30)).toBe("30 sec");
  });

  it("formats hours correctly (singular)", () => {
    expect(secondsToDuration(3600)).toBe("1 hour");
  });

  it("formats hours correctly (plural)", () => {
    expect(secondsToDuration(3600 * 5)).toBe("5 hours");
  });

  it("formats days correctly (singular)", () => {
    expect(secondsToDuration(86400)).toBe("1 day");
  });

  it("formats days correctly (plural)", () => {
    expect(secondsToDuration(86400 * 90)).toBe("90 days");
  });

  it("prefers days over hours once >= 24h", () => {
    expect(secondsToDuration(86400)).toBe("1 day");
  });
});

describe("shortAddress", () => {
  it("truncates a standard 42-char address to 6+4 with ellipsis", () => {
    expect(shortAddress("0x90a4A436A1B49036a1b6B1f1CEba754fF13127aF")).toBe("0x90a4...27aF");
  });
});

describe("statusLabel", () => {
  it("maps request status codes correctly", () => {
    expect(statusLabel(0, "request")).toBe("PENDING");
    expect(statusLabel(1, "request")).toBe("APPROVED");
    expect(statusLabel(4, "request")).toBe("REPAYING");
    expect(statusLabel(6, "request")).toBe("DEFAULTED");
  });

  it("maps milestone status codes correctly", () => {
    expect(statusLabel(0, "milestone")).toBe("LOCKED");
    expect(statusLabel(1, "milestone")).toBe("PROPOSED");
    expect(statusLabel(3, "milestone")).toBe("RELEASED");
  });

  it("falls back to UNKNOWN for an out-of-range status code", () => {
    expect(statusLabel(99, "request")).toBe("UNKNOWN");
    expect(statusLabel(99, "milestone")).toBe("UNKNOWN");
  });
});