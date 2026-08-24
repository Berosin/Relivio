import { NextRequest, NextResponse } from "next/server";
import { verifyWalletAuth } from "@/lib/walletAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { walletAddress, timestamp, signature, display_name, avatar_url, bio } = body;

  if (typeof walletAddress !== "string" || typeof signature !== "string" || typeof timestamp !== "number") {
    return NextResponse.json({ error: "Missing wallet auth fields." }, { status: 400 });
  }
  if (display_name !== undefined && display_name !== null && (typeof display_name !== "string" || display_name.length > 60)) {
    return NextResponse.json({ error: "display_name must be a string up to 60 characters." }, { status: 400 });
  }
  if (bio !== undefined && bio !== null && (typeof bio !== "string" || bio.length > 500)) {
    return NextResponse.json({ error: "bio must be a string up to 500 characters." }, { status: 400 });
  }
  if (avatar_url !== undefined && avatar_url !== null && typeof avatar_url !== "string") {
    return NextResponse.json({ error: "avatar_url must be a string." }, { status: 400 });
  }

  const payload = {
    display_name: display_name ?? null,
    avatar_url: avatar_url ?? null,
    bio: bio ?? null,
  };
  const auth = await verifyWalletAuth({
    action: "update_profile",
    walletAddress,
    timestamp,
    payload,
    signature: signature as `0x${string}`,
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .upsert({ wallet_address: walletAddress.toLowerCase(), ...payload }, { onConflict: "wallet_address" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save profile." }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}