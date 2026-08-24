import { describe, it, expect } from "vitest";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { buildAuthMessage, verifyWalletAuth } from "./walletAuth";

const account = privateKeyToAccount(generatePrivateKey());
const otherAccount = privateKeyToAccount(generatePrivateKey());

describe("buildAuthMessage", () => {
  it("produces the same message for the same inputs (determinism)", () => {
    const a = buildAuthMessage("post_comment", account.address, 1000, { foo: "bar" });
    const b = buildAuthMessage("post_comment", account.address, 1000, { foo: "bar" });
    expect(a).toBe(b);
  });

  it("is insensitive to payload key order (canonicalized before signing)", () => {
    const a = buildAuthMessage("post_comment", account.address, 1000, { foo: "bar", baz: "qux" });
    const b = buildAuthMessage("post_comment", account.address, 1000, { baz: "qux", foo: "bar" });
    expect(a).toBe(b);
  });

  it("changes when the payload changes", () => {
    const a = buildAuthMessage("post_comment", account.address, 1000, { comment_body: "hello" });
    const b = buildAuthMessage("post_comment", account.address, 1000, { comment_body: "goodbye" });
    expect(a).not.toBe(b);
  });
});

describe("verifyWalletAuth", () => {
  it("accepts a validly signed, fresh message", async () => {
    const timestamp = Date.now();
    const payload = { target_type: "campaign", target_address: `0x${"1".repeat(40)}`, comment_body: "hello" };
    const message = buildAuthMessage("post_comment", account.address, timestamp, payload);
    const signature = await account.signMessage({ message });

    const result = await verifyWalletAuth({
      action: "post_comment",
      walletAddress: account.address,
      timestamp,
      payload,
      signature,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a signature from a different wallet than claimed", async () => {
    const timestamp = Date.now();
    const payload = { foo: "bar" };
    const message = buildAuthMessage("post_comment", account.address, timestamp, payload);
    const signature = await otherAccount.signMessage({ message });

    const result = await verifyWalletAuth({
      action: "post_comment",
      walletAddress: account.address,
      timestamp,
      payload,
      signature,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a tampered payload (signature no longer matches the message)", async () => {
    const timestamp = Date.now();
    const originalPayload = { comment_body: "original" };
    const message = buildAuthMessage("post_comment", account.address, timestamp, originalPayload);
    const signature = await account.signMessage({ message });

    const tamperedPayload = { comment_body: "tampered" };
    const result = await verifyWalletAuth({
      action: "post_comment",
      walletAddress: account.address,
      timestamp,
      payload: tamperedPayload,
      signature,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a signature replayed under a different action name", async () => {
    const timestamp = Date.now();
    const payload = { target_type: "fund", target_address: `0x${"2".repeat(40)}` };
    const message = buildAuthMessage("watch", account.address, timestamp, payload);
    const signature = await account.signMessage({ message });

    // Same signature, same payload, but claiming a different action —
    // e.g. trying to replay a "watch" signature as an "unwatch" call.
    const result = await verifyWalletAuth({
      action: "unwatch",
      walletAddress: account.address,
      timestamp,
      payload,
      signature,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an expired signature", async () => {
    const timestamp = Date.now() - 10 * 60 * 1000; // 10 minutes old
    const payload = { foo: "bar" };
    const message = buildAuthMessage("post_comment", account.address, timestamp, payload);
    const signature = await account.signMessage({ message });

    const result = await verifyWalletAuth({
      action: "post_comment",
      walletAddress: account.address,
      timestamp,
      payload,
      signature,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/expired/i);
  });

  it("rejects a timestamp far in the future beyond clock-skew tolerance", async () => {
    const timestamp = Date.now() + 10 * 60 * 1000; // 10 minutes ahead
    const payload = { foo: "bar" };
    const message = buildAuthMessage("post_comment", account.address, timestamp, payload);
    const signature = await account.signMessage({ message });

    const result = await verifyWalletAuth({
      action: "post_comment",
      walletAddress: account.address,
      timestamp,
      payload,
      signature,
    });
    expect(result.ok).toBe(false);
  });

  it("tolerates a small negative clock skew within the allowed window", async () => {
    const timestamp = Date.now() + 5 * 1000; // 5 seconds ahead — within 30s tolerance
    const payload = { foo: "bar" };
    const message = buildAuthMessage("post_comment", account.address, timestamp, payload);
    const signature = await account.signMessage({ message });

    const result = await verifyWalletAuth({
      action: "post_comment",
      walletAddress: account.address,
      timestamp,
      payload,
      signature,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a malformed wallet address before attempting signature recovery", async () => {
    const result = await verifyWalletAuth({
      action: "post_comment",
      walletAddress: "not-an-address",
      timestamp: Date.now(),
      payload: {},
      signature: "0x00" as `0x${string}`,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a malformed signature without throwing", async () => {
    const result = await verifyWalletAuth({
      action: "post_comment",
      walletAddress: account.address,
      timestamp: Date.now(),
      payload: {},
      signature: "0xnotasignature" as `0x${string}`,
    });
    expect(result.ok).toBe(false);
  });
});