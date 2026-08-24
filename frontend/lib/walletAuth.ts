import { verifyMessage } from "viem";

// How long a signed action is valid for before it's rejected as a possible
// replay. 30s of negative tolerance covers ordinary client/server clock
// skew without meaningfully widening the replay window.
const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
const CLOCK_SKEW_TOLERANCE_MS = 30 * 1000; // 30 seconds

function canonicalize(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, Object.keys(payload).sort());
}

/// Builds the exact human-readable message a wallet is asked to sign for a
/// given off-chain action. Called identically on the client (to sign) and
/// the server (to re-derive the same message and verify the signature) —
/// if either side computes this differently, verification will correctly
/// fail closed rather than silently accept a mismatched payload.
export function buildAuthMessage(
  action: string,
  walletAddress: string,
  timestamp: number,
  payload: Record<string, unknown>
): string {
  return [
    "Relivio wants you to sign this message to authorize an off-chain action.",
    "This costs no gas and is not an on-chain transaction.",
    "",
    `Action: ${action}`,
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Timestamp: ${timestamp}`,
    `Payload: ${canonicalize(payload)}`,
  ].join("\n");
}

export type WalletAuthInput = {
  action: string;
  walletAddress: string;
  timestamp: number;
  payload: Record<string, unknown>;
  signature: `0x${string}`;
};

export type WalletAuthResult = { ok: true } | { ok: false; error: string };

/// Server-side verification for every write API route. Confirms (a) the
/// wallet address is well-formed, (b) the signature was made recently
/// (bounded replay window), and (c) the signature actually recovers to the
/// claimed wallet address over the exact action+payload+timestamp being
/// submitted — so a signature can't be replayed against a different
/// payload, a different action, or after it's gone stale.
export async function verifyWalletAuth(input: WalletAuthInput): Promise<WalletAuthResult> {
  const { action, walletAddress, timestamp, payload, signature } = input;

  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return { ok: false, error: "Invalid wallet address." };
  }

  const age = Date.now() - timestamp;
  if (age < -CLOCK_SKEW_TOLERANCE_MS || age > SIGNATURE_MAX_AGE_MS) {
    return { ok: false, error: "Signature has expired. Please sign again and retry." };
  }

  const message = buildAuthMessage(action, walletAddress, timestamp, payload);

  let isValid: boolean;
  try {
    isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature,
    });
  } catch {
    return { ok: false, error: "Malformed signature." };
  }

  if (!isValid) {
    return { ok: false, error: "Signature verification failed." };
  }

  return { ok: true };
}