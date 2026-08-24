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
  return callApi("/api/profile", "POST", walletAddress, "update_profile", input);
}