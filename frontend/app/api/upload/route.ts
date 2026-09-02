import { NextRequest, NextResponse } from "next/server";
import { verifyWalletAuth } from "@/lib/walletAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isOnChainOrganizer } from "@/lib/onchain";

const BUCKET = "relivio-media";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const CONTEXTS = ["cover", "gallery", "update"] as const;
const TARGET_TYPES = ["fund", "campaign"] as const;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const walletAddress = form.get("walletAddress");
  const timestampRaw = form.get("timestamp");
  const signature = form.get("signature");
  const context = form.get("context");
  const target_type = form.get("target_type");
  const target_address = form.get("target_address");
  const file = form.get("file");

  if (typeof walletAddress !== "string" || typeof signature !== "string" || typeof timestampRaw !== "string") {
    return NextResponse.json({ error: "Missing wallet auth fields." }, { status: 400 });
  }
  const timestamp = Number(timestampRaw);
  if (!Number.isFinite(timestamp)) {
    return NextResponse.json({ error: "Invalid timestamp." }, { status: 400 });
  }
  if (typeof context !== "string" || !CONTEXTS.includes(context as (typeof CONTEXTS)[number])) {
    return NextResponse.json({ error: "Invalid context." }, { status: 400 });
  }
  if (typeof target_type !== "string" || !TARGET_TYPES.includes(target_type as (typeof TARGET_TYPES)[number])) {
    return NextResponse.json({ error: "Invalid target_type." }, { status: 400 });
  }
  if (typeof target_address !== "string" || !ADDRESS_RE.test(target_address)) {
    return NextResponse.json({ error: "Invalid target_address." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 400 });
  }

  // The signed payload describes the upload's INTENT (who / what context /
  // which fund or campaign), not the file's bytes — binding a signature to
  // raw binary content isn't practical with the JSON-message approach used
  // everywhere else, and isn't necessary here: the file arrives in the same
  // authenticated HTTP request as the signature, so there's no separate
  // step where a different file could be substituted in. The organizer
  // check below is what actually gates who can upload for a given listing.
  const payload = { context, target_type, target_address };
  const auth = await verifyWalletAuth({
    action: "upload_image",
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
    return NextResponse.json({ error: "Only the on-chain organizer can upload images here." }, { status: 403 });
  }

  const path = `${target_type}/${target_address.toLowerCase()}/${context}/${crypto.randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: "Failed to upload image." }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}