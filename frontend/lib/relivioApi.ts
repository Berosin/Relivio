import { signWalletAction } from "./walletAuthClient";

async function callApi(
  path: string,
  method: "POST" | "DELETE",
  walletAddress: `0x${string}`,
  action: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  const { timestamp, signature } = await signWalletAction(action, walletAddress, payload);
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, timestamp, signature, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "Request failed.");
  }
  return data;
}

export function postComment(
  walletAddress: `0x${string}`,
  input: {
    target_type: "fund_request" | "campaign" | "campaign_milestone";
    target_address: string;
    target_id?: number | null;
    comment_body: string;
  }
) {
  return callApi("/api/comments", "POST", walletAddress, "post_comment", input);
}

export function addToWatchlist(
  walletAddress: `0x${string}`,
  input: { target_type: "fund" | "campaign"; target_address: string }
) {
  return callApi("/api/watchlist", "POST", walletAddress, "watch", input);
}

export function removeFromWatchlist(
  walletAddress: `0x${string}`,
  input: { target_type: "fund" | "campaign"; target_address: string }
) {
  return callApi("/api/watchlist", "DELETE", walletAddress, "unwatch", input);
}

export function updateProfile(
  walletAddress: `0x${string}`,
  input: { display_name?: string; avatar_url?: string; bio?: string }
) {
  // Must match app/api/profile/route.ts's reconstruction exactly, key-for-key
  // and value-for-value — that's what the signature is over. JSON.stringify
  // silently drops keys whose value is `undefined`, so if this object only
  // included the fields the caller happened to pass, the signed message
  // would omit them while the server (which always fills all three keys,
  // defaulting to null) would not — a mismatched message, and therefore a
  // signature that always fails verification even though nothing was
  // tampered with. Normalizing to `null` here, matching the server's own
  // `?? null`, keeps both sides byte-for-byte identical.
  const payload = {
    display_name: input.display_name ?? null,
    avatar_url: input.avatar_url ?? null,
    bio: input.bio ?? null,
  };
  return callApi("/api/profile", "POST", walletAddress, "update_profile", payload);
}