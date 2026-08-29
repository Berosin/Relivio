import { NextRequest, NextResponse } from "next/server";
import { verifyWalletAuth } from "@/lib/walletAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isOnChainOrganizer } from "@/lib/onchain";

const TARGET_TYPES = ["fund", "campaign"] as const;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const {
    walletAddress,
    timestamp,
    signature,
    target_type,
    target_address,
    cover_image_url,
    long_description,
    location,
    external_links,
    gallery_urls,
    disaster_date,
  } = body;

  if (typeof walletAddress !== "string" || typeof signature !== "string" || typeof timestamp !== "number") {
    return NextResponse.json({ error: "Missing wallet auth fields." }, { status: 400 });
  }
  if (!TARGET_TYPES.includes(target_type)) {
    return NextResponse.json({ error: "Invalid target_type." }, { status: 400 });
  }
  if (typeof target_address !== "string" || !ADDRESS_RE.test(target_address)) {
    return NextResponse.json({ error: "Invalid target_address." }, { status: 400 });
  }
  for (const [name, value] of [
    ["cover_image_url", cover_image_url],
    ["long_description", long_description],
    ["location", location],
    ["disaster_date", disaster_date],
  ] as const) {
    if (value !== null && value !== undefined && typeof value !== "string") {
      return NextResponse.json({ error: `Invalid ${name}.` }, { status: 400 });
    }
  }
  if (typeof long_description === "string" && long_description.length > 5000) {
    return NextResponse.json({ error: "long_description must be 5000 characters or fewer." }, { status: 400 });
  }

  // Payload shape is intentionally identical regardless of target_type —
  // this is exactly what got signed, so the reconstruction here must match
  // the client's byte-for-byte, including fields the target type ignores
  // (e.g. gallery_urls/disaster_date for a fund). See relivioApi.ts.
  const normalized = {
    cover_image_url: cover_image_url ?? null,
    long_description: long_description ?? null,
    location: location ?? null,
    external_links: normalizeStringArray(external_links),
    gallery_urls: normalizeStringArray(gallery_urls),
    disaster_date: disaster_date ?? null,
  };

  const auth = await verifyWalletAuth({
    action: "update_metadata",
    walletAddress,
    timestamp,
    payload: { target_type, target_address, ...normalized },
    signature: signature as `0x${string}`,
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  // A valid signature only proves who's asking — it doesn't prove they're
  // allowed to edit THIS listing. That's a separate, on-chain check: only
  // the fund/campaign's actual organizer can write here.
  const isOrganizer = await isOnChainOrganizer(target_address as `0x${string}`, walletAddress);
  if (!isOrganizer) {
    return NextResponse.json({ error: "Only the on-chain organizer can edit this listing." }, { status: 403 });
  }

  const wallet = walletAddress.toLowerCase();
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({ wallet_address: wallet }, { onConflict: "wallet_address", ignoreDuplicates: true });
  if (profileError) {
    return NextResponse.json({ error: "Failed to prepare profile." }, { status: 500 });
  }

  const table = target_type === "fund" ? "fund_metadata" : "campaign_metadata";
  const addressColumn = target_type === "fund" ? "fund_address" : "campaign_address";

  const row: Record<string, unknown> = {
    [addressColumn]: target_address.toLowerCase(),
    cover_image_url: normalized.cover_image_url,
    long_description: normalized.long_description,
    location: normalized.location,
    external_links: normalized.external_links,
    created_by: wallet,
    updated_at: new Date().toISOString(),
  };
  // campaign_metadata has two columns fund_metadata doesn't (gallery_urls,
  // disaster_date) — only include them for the table that actually has them.
  if (target_type === "campaign") {
    row.gallery_urls = normalized.gallery_urls;
    row.disaster_date = normalized.disaster_date;
  }

  const { data, error } = await supabaseAdmin.from(table).upsert(row, { onConflict: addressColumn }).select().single();

  if (error) {
    return NextResponse.json({ error: "Failed to save metadata." }, { status: 500 });
  }

  return NextResponse.json({ metadata: data });
}