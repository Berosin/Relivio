/// Wagmi/viem errors expose a `.shortMessage` that's already much cleaner
/// than `.message` (which includes docs links, viem version, full request
/// details, etc — the "big red wall of text" this fixes). We further map
/// the handful of shortMessages we actually see in this app to plainer
/// wording, and fall back to extracting our own contract `require(...)`
/// reason when present, or a generic message otherwise.
export function getFriendlyErrorMessage(error: unknown): string {
  if (!error) return "Something went wrong. Please try again.";

  const err = error as { shortMessage?: string; message?: string; details?: string };
  const raw = err.shortMessage || err.message || String(error);

  if (/user rejected/i.test(raw)) {
    return "Transaction cancelled.";
  }

  if (/insufficient funds/i.test(raw)) {
    return "You don't have enough ETH in your wallet to pay the network fee for this transaction.";
  }

  // These are RPC-provider-level rejections (Infura/Alchemy rate limits,
  // stuck nonces) that happen BEFORE a transaction is ever broadcast — the
  // contract's logic never actually ran. viem still wraps them in
  // "reverted with the following reason: ..." phrasing though, which reads
  // exactly like a real on-chain revert and is genuinely misleading, so
  // this has to be caught before the generic revert-reason extraction below.
  if (/in-flight transaction limit|too many pending transactions|nonce too low|replacement transaction underpriced/i.test(raw)) {
    return "Your wallet has too many pending transactions. Check MetaMask's Activity tab, speed up or cancel any stuck ones, then try again.";
  }

  const revertMatch = raw.match(/reverted with reason string '([^']+)'/i) || raw.match(/execution reverted:?\s*"?([^"\n]+)"?/i);
  if (revertMatch && revertMatch[1]) {
    return revertMatch[1].trim();
  }

  if (/chain mismatch|does not match the target chain/i.test(raw)) {
    return "Your wallet is on the wrong network for this action.";
  }

  const fallback = err.shortMessage || "Something went wrong. Please try again.";
  return fallback.length > 160 ? `${fallback.slice(0, 160)}…` : fallback;
}