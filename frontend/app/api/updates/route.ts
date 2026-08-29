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

  const { walletAddress, timestamp, signature, target_type, target_address, title, body: updateBody, image_urls } = body;

  if (typeof walletAddress !== "string" || typeof signature !== "string" || typeof timestamp !== "number") {
    return NextResponse.json({ error: "Missing wallet auth fields." }, { status: 400 });
  }
  if (!TARGET_TYPES.includes(target_type)) {
    return NextResponse.json({ error: "Invalid target_type." }, { status: 400 });
  }
  if (typeof target_address !== "string" || !ADDRESS_RE.test(target_address)) {
    return NextResponse.json({ error: "Invalid target_address." }, { status: 400 });
  }
  if (typeof title !== "string" || title.trim().length === 0 || title.length > 200) {
    return NextResponse.json({ error: "Title must be between 1 and 200 characters." }, { status: 400 });
  }
  if (updateBody !== null && updateBody !== undefined && typeof updateBody !== "string") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  if (typeof updateBody === "string" && updateBody.length > 5000) {
    return NextResponse.json({ error: "body must be 5000 characters or fewer." }, { status: 400 });
  }

  const payload = {
    target_type,
    target_address,
    title,
    body: updateBody ?? null,
    image_urls: normalizeStringArray(image_urls),
  };

  const auth = await verifyWalletAuth({
    action: "post_update",
    walletAddress,
    timestamp,
    payload,
    signature: signature as `0x${string}`,
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const isOrganizer = await isOnChainOrganizer(target_address as `0x${string}`, walletAddress);
  if (!isOrganizer) {
    return NextResponse.json({ error: "Only the on-chain organizer can post updates." }, { status: 403 });
  }

  const wallet = walletAddress.toLowerCase();
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({ wallet_address: wallet }, { onConflict: "wallet_address", ignoreDuplicates: true });
  if (profileError) {
    return NextResponse.json({ error: "Failed to prepare profile." }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("updates")
    .insert({
      target_type,
      target_address: target_address.toLowerCase(),
      author_address: wallet,
      title: payload.title,
      body: payload.body,
      image_urls: payload.image_urls,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to post update." }, { status: 500 });
  }

  return NextResponse.json({ update: data }, { status: 201 });
}