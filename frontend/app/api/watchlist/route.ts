import { NextRequest, NextResponse } from "next/server";
import { verifyWalletAuth } from "@/lib/walletAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const TARGET_TYPES = ["fund", "campaign"] as const;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

// Postgres unique_violation — thrown if the wallet is already watching this
// target. Treated as success (idempotent add), not an error.
const UNIQUE_VIOLATION = "23505";

function parseBody(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  const { walletAddress, timestamp, signature, target_type, target_address } = b;

  if (typeof walletAddress !== "string" || typeof signature !== "string" || typeof timestamp !== "number") {
    return { error: "Missing wallet auth fields." } as const;
  }
  if (!TARGET_TYPES.includes(target_type as (typeof TARGET_TYPES)[number])) {
    return { error: "Invalid target_type." } as const;
  }
  if (typeof target_address !== "string" || !ADDRESS_RE.test(target_address)) {
    return { error: "Invalid target_address." } as const;
  }

  return {
    walletAddress,
    timestamp,
    signature: signature as `0x${string}`,
    target_type: target_type as (typeof TARGET_TYPES)[number],
    target_address,
  } as const;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = parseBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { walletAddress, timestamp, signature, target_type, target_address } = parsed;

  const payload = { target_type, target_address };
  const auth = await verifyWalletAuth({ action: "watch", walletAddress, timestamp, payload, signature });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const wallet = walletAddress.toLowerCase();

  // watchlist.wallet_address has a FK to profiles(wallet_address).
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({ wallet_address: wallet }, { onConflict: "wallet_address", ignoreDuplicates: true });
  if (profileError) {
    return NextResponse.json({ error: "Failed to prepare profile." }, { status: 500 });
  }

  const { error } = await supabaseAdmin.from("watchlist").insert({
    wallet_address: wallet,
    target_type,
    target_address: target_address.toLowerCase(),
  });
  if (error && error.code !== UNIQUE_VIOLATION) {
    return NextResponse.json({ error: "Failed to add to watchlist." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = parseBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { walletAddress, timestamp, signature, target_type, target_address } = parsed;

  const payload = { target_type, target_address };
  const auth = await verifyWalletAuth({ action: "unwatch", walletAddress, timestamp, payload, signature });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from("watchlist")
    .delete()
    .match({
      wallet_address: walletAddress.toLowerCase(),
      target_type,
      target_address: target_address.toLowerCase(),
    });
  if (error) {
    return NextResponse.json({ error: "Failed to remove from watchlist." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}