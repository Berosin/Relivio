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

function normalizeStringArray(value: string[] | undefined): string[] {
  return (value ?? []).filter((v) => v.trim().length > 0).map((v) => v.trim());
}

/// Off-chain listing content (cover image, gallery, long description,
/// location, external links) for a fund or campaign. Gated server-side to
/// the on-chain organizer — see app/api/metadata/route.ts.
export function upsertMetadata(
  walletAddress: `0x${string}`,
  input: {
    target_type: "fund" | "campaign";
    target_address: string;
    cover_image_url?: string | null;
    long_description?: string | null;
    location?: string | null;
    external_links?: string[];
    gallery_urls?: string[];
    disaster_date?: string | null;
  }
) {
  // Must match app/api/metadata/route.ts's reconstruction exactly — same
  // full shape regardless of target_type, so client and server always agree
  // on the same key set even for fields the target type doesn't use.
  const normalized = {
    target_type: input.target_type,
    target_address: input.target_address,
    cover_image_url: input.cover_image_url ?? null,
    long_description: input.long_description ?? null,
    location: input.location ?? null,
    external_links: normalizeStringArray(input.external_links),
    gallery_urls: normalizeStringArray(input.gallery_urls),
    disaster_date: input.disaster_date ?? null,
  };
  return callApi("/api/metadata", "POST", walletAddress, "update_metadata", normalized);
}

/// Organizer progress post (title/body/photos) for a fund or campaign.
/// Gated server-side to the on-chain organizer — see app/api/updates/route.ts.
export function postUpdate(
  walletAddress: `0x${string}`,
  input: {
    target_type: "fund" | "campaign";
    target_address: string;
    title: string;
    body?: string | null;
    image_urls?: string[];
  }
) {
  const normalized = {
    target_type: input.target_type,
    target_address: input.target_address,
    title: input.title,
    body: input.body ?? null,
    image_urls: normalizeStringArray(input.image_urls),
  };
  return callApi("/api/updates", "POST", walletAddress, "post_update", normalized);
}