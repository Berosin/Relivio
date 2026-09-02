import { describe, it, expect } from "vitest";
import { getFriendlyErrorMessage } from "./errors";

describe("getFriendlyErrorMessage", () => {
  it("returns a generic message for a falsy error", () => {
    expect(getFriendlyErrorMessage(null)).toBe("Something went wrong. Please try again.");
    expect(getFriendlyErrorMessage(undefined)).toBe("Something went wrong. Please try again.");
  });

  it("detects a user-rejected wallet popup", () => {
    const error = { shortMessage: "User rejected the request." };
    expect(getFriendlyErrorMessage(error)).toBe("Transaction cancelled.");
  });

  it("detects user rejection case-insensitively from .message when .shortMessage is absent", () => {
    const error = { message: "User Rejected the Request. Details: ..." };
    expect(getFriendlyErrorMessage(error)).toBe("Transaction cancelled.");
  });

  it("detects insufficient funds for gas", () => {
    const error = { shortMessage: "insufficient funds for gas * price + value" };
    expect(getFriendlyErrorMessage(error)).toBe(
      "You don't have enough ETH in your wallet to pay the network fee for this transaction."
    );
  });

  it("detects an RPC-provider in-flight transaction limit rather than treating it as a real contract revert", () => {
    // Real-world case: Infura's free-tier RPC rejects the send when too
    // many transactions are already pending on the wallet — the contract
    // never actually runs, but viem's own wrapping makes it read exactly
    // like a genuine on-chain revert if left unhandled.
    const error = {
      shortMessage:
        'The contract function "addMilestone" reverted with the following reason: RPC 0xaa36a7 Infura eth_sendRawTransaction: in-flight transaction limit reached for delegator.',
    };
    expect(getFriendlyErrorMessage(error)).toBe(
      "Your wallet has too many pending transactions. Check MetaMask's Activity tab, speed up or cancel any stuck ones, then try again."
    );
  });

  it("extracts our own contract's require() reason from a 'reverted with reason string' message", () => {
    const error = {
      shortMessage:
        "The contract function \"vote\" reverted with reason string 'CommunityFund: cannot vote on your own request'.",
    };
    expect(getFriendlyErrorMessage(error)).toBe("CommunityFund: cannot vote on your own request");
  });

  it("extracts a generic 'execution reverted: ...' reason", () => {
    const error = { shortMessage: 'execution reverted: "Campaign: exceeds available reserve"' };
    expect(getFriendlyErrorMessage(error)).toBe("Campaign: exceeds available reserve");
  });

  it("detects a chain-mismatch / wrong-network error", () => {
    const error = { shortMessage: "Chain mismatch: the connector's chain does not match the target chain." };
    expect(getFriendlyErrorMessage(error)).toBe("Your wallet is on the wrong network for this action.");
  });

  it("falls back to shortMessage when nothing else matches", () => {
    const error = { shortMessage: "Something unusual happened during simulation." };
    expect(getFriendlyErrorMessage(error)).toBe("Something unusual happened during simulation.");
  });

  it("falls back to the generic message when there's no shortMessage or message at all", () => {
    const error = {};
    expect(getFriendlyErrorMessage(error)).toBe("Something went wrong. Please try again.");
  });

  it("truncates an unexpectedly long fallback message to 160 chars with an ellipsis", () => {
    const longMessage = "X".repeat(300);
    const error = { shortMessage: longMessage };
    const result = getFriendlyErrorMessage(error);
    expect(result.length).toBe(161);
    expect(result.endsWith("…")).toBe(true);
  });

  it("does not truncate a fallback message under the 160 char limit", () => {
    const shortMessage = "A perfectly normal length message.";
    const error = { shortMessage };
    expect(getFriendlyErrorMessage(error)).toBe(shortMessage);
  });

  it("prioritizes user-rejected detection even if a revert-style substring is also present", () => {
    const error = {
      shortMessage: "User rejected the request. (execution reverted: something else)",
    };
    expect(getFriendlyErrorMessage(error)).toBe("Transaction cancelled.");
  });
});