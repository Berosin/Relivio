import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const PAGE_SIZE = 30;

// No signature required here, same reasoning as the watchlist GET: reading
// or marking-read isn't money-moving or impersonation-prone (worst case
// someone marks another wallet's notifications read, which is mildly
// annoying, not harmful), and requiring a wallet-signature popup every time
// someone opens the bell icon would be bad UX for a low-stakes action. RLS
// blocks anon access to this table entirely (see schema.sql), so both
// handlers go through supabaseAdmin.

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet || !ADDRESS_RE.test(wallet)) {
    return NextResponse.json({ error: "Missing or invalid wallet query param." }, { status: 400 });
  }

  const walletLower = wallet.toLowerCase();

  const [{ data: notifications, error: listError }, { count: unreadCount, error: countError }] = await Promise.all([
    supabaseAdmin
      .from("notifications")
      .select("id, kind, target_type, target_address, message, tx_hash, read, created_at")
      .eq("wallet_address", walletLower)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE),
    supabaseAdmin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("wallet_address", walletLower)
      .eq("read", false),
  ]);

  if (listError || countError) {
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }

  return NextResponse.json({ notifications: notifications ?? [], unreadCount: unreadCount ?? 0 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const wallet = body?.wallet;
  if (typeof wallet !== "string" || !ADDRESS_RE.test(wallet)) {
    return NextResponse.json({ error: "Missing or invalid wallet." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read: true })
    .eq("wallet_address", wallet.toLowerCase())
    .eq("read", false);

  if (error) {
    return NextResponse.json({ error: "Failed to mark notifications read." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}