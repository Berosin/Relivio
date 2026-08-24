import { NextRequest, NextResponse } from "next/server";
import { verifyWalletAuth } from "@/lib/walletAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const TARGET_TYPES = ["fund_request", "campaign", "campaign_milestone"] as const;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { walletAddress, timestamp, signature, target_type, target_address, target_id, comment_body } = body;

  if (typeof walletAddress !== "string" || typeof signature !== "string" || typeof timestamp !== "number") {
    return NextResponse.json({ error: "Missing wallet auth fields." }, { status: 400 });
  }
  if (!TARGET_TYPES.includes(target_type)) {
    return NextResponse.json({ error: "Invalid target_type." }, { status: 400 });
  }
  if (typeof target_address !== "string" || !ADDRESS_RE.test(target_address)) {
    return NextResponse.json({ error: "Invalid target_address." }, { status: 400 });
  }
  if (typeof comment_body !== "string" || comment_body.trim().length === 0 || comment_body.length > 2000) {
    return NextResponse.json({ error: "Comment must be between 1 and 2000 characters." }, { status: 400 });
  }
  if (target_id !== undefined && target_id !== null && typeof target_id !== "number") {
    return NextResponse.json({ error: "Invalid target_id." }, { status: 400 });
  }

  // Must match exactly what the client signed — this is what makes the
  // signature bind to this specific comment, not just to "some comment".
  const payload = { target_type, target_address, target_id: target_id ?? null, comment_body };
  const auth = await verifyWalletAuth({
    action: "post_comment",
    walletAddress,
    timestamp,
    payload,
    signature: signature as `0x${string}`,
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const wallet = walletAddress.toLowerCase();

  // comments.author_address has a FK to profiles(wallet_address) — make
  // sure a row exists before inserting the comment. No-op if already there.
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({ wallet_address: wallet }, { onConflict: "wallet_address", ignoreDuplicates: true });
  if (profileError) {
    return NextResponse.json({ error: "Failed to prepare profile." }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("comments")
    .insert({
      target_type,
      target_address: target_address.toLowerCase(),
      target_id: target_id ?? null,
      author_address: wallet,
      body: comment_body,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save comment." }, { status: 500 });
  }

  return NextResponse.json({ comment: data }, { status: 201 });
}