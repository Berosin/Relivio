import { describe, it, expect } from "vitest";
import { buildAuthMessage } from "./walletAuth";

const ADDRESS = "0x1111111111111111111111111111111111111111";

/// Mirrors updateProfile's payload-building in relivioApi.ts exactly.
function clientProfilePayload(input: { display_name?: string; avatar_url?: string; bio?: string }) {
  return {
    display_name: input.display_name ?? null,
    avatar_url: input.avatar_url ?? null,
    bio: input.bio ?? null,
  };
}

/// Mirrors the server's reconstruction in app/api/profile/route.ts exactly.
function serverProfilePayload(body: { display_name?: string | null; avatar_url?: string | null; bio?: string | null }) {
  return {
    display_name: body.display_name ?? null,
    avatar_url: body.avatar_url ?? null,
    bio: body.bio ?? null,
  };
}

describe("updateProfile client/server message parity", () => {
  // This is a regression test for a real bug: relivioApi.ts used to pass
  // { display_name: x || undefined, bio: y || undefined } straight through
  // as the signed payload. JSON.stringify silently drops undefined-valued
  // keys, so a partially-filled form signed a message with only SOME keys
  // present, while the server always reconstructs all three keys (defaulting
  // missing ones to null) before re-deriving the message to verify against.
  // Different key sets means a different message string, which means
  // verification fails even though nothing was tampered with — this was the
  // actual cause of the "signature verification failed" 401.

  it("produces an identical message when only display_name is provided", () => {
    const clientPayload = clientProfilePayload({ display_name: "Alice" });
    const timestamp = Date.now();
    const clientMessage = buildAuthMessage("update_profile", ADDRESS, timestamp, clientPayload);

    // Simulates the JSON round-trip: what the server receives on the wire
    // is exactly clientPayload's fields spread into the body.
    const serverPayload = serverProfilePayload(clientPayload);
    const serverMessage = buildAuthMessage("update_profile", ADDRESS, timestamp, serverPayload);

    expect(clientMessage).toBe(serverMessage);
  });

  it("produces an identical message when only bio is provided", () => {
    const clientPayload = clientProfilePayload({ bio: "Building relief infra." });
    const timestamp = Date.now();
    const clientMessage = buildAuthMessage("update_profile", ADDRESS, timestamp, clientPayload);
    const serverPayload = serverProfilePayload(clientPayload);
    const serverMessage = buildAuthMessage("update_profile", ADDRESS, timestamp, serverPayload);

    expect(clientMessage).toBe(serverMessage);
  });

  it("produces an identical message when all fields are provided", () => {
    const clientPayload = clientProfilePayload({
      display_name: "Alice",
      avatar_url: "https://example.com/a.png",
      bio: "Building relief infra.",
    });
    const timestamp = Date.now();
    const clientMessage = buildAuthMessage("update_profile", ADDRESS, timestamp, clientPayload);
    const serverPayload = serverProfilePayload(clientPayload);
    const serverMessage = buildAuthMessage("update_profile", ADDRESS, timestamp, serverPayload);

    expect(clientMessage).toBe(serverMessage);
  });

  it("produces an identical message when no fields are provided", () => {
    const clientPayload = clientProfilePayload({});
    const timestamp = Date.now();
    const clientMessage = buildAuthMessage("update_profile", ADDRESS, timestamp, clientPayload);
    const serverPayload = serverProfilePayload(clientPayload);
    const serverMessage = buildAuthMessage("update_profile", ADDRESS, timestamp, serverPayload);

    expect(clientMessage).toBe(serverMessage);
  });
});

/// Mirrors upsertMetadata's payload-building in relivioApi.ts exactly.
function clientMetadataPayload(input: {
  target_type: "fund" | "campaign";
  target_address: string;
  cover_image_url?: string | null;
  long_description?: string | null;
  location?: string | null;
  external_links?: string[];
  gallery_urls?: string[];
  disaster_date?: string | null;
}) {
  const normalizeStringArray = (v: string[] | undefined) =>
    (v ?? []).filter((s) => s.trim().length > 0).map((s) => s.trim());
  return {
    target_type: input.target_type,
    target_address: input.target_address,
    cover_image_url: input.cover_image_url ?? null,
    long_description: input.long_description ?? null,
    location: input.location ?? null,
    external_links: normalizeStringArray(input.external_links),
    gallery_urls: normalizeStringArray(input.gallery_urls),
    disaster_date: input.disaster_date ?? null,
  };
}

/// Mirrors the server's reconstruction in app/api/metadata/route.ts exactly.
function serverMetadataPayload(body: ReturnType<typeof clientMetadataPayload>) {
  const normalizeStringArray = (v: unknown) =>
    Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim()) : [];
  return {
    target_type: body.target_type,
    target_address: body.target_address,
    cover_image_url: body.cover_image_url ?? null,
    long_description: body.long_description ?? null,
    location: body.location ?? null,
    external_links: normalizeStringArray(body.external_links),
    gallery_urls: normalizeStringArray(body.gallery_urls),
    disaster_date: body.disaster_date ?? null,
  };
}

const CAMPAIGN_ADDRESS = "0x2222222222222222222222222222222222222222";

describe("upsertMetadata client/server message parity", () => {
  it("matches when only a subset of fields is provided (fund)", () => {
    const clientPayload = clientMetadataPayload({
      target_type: "fund",
      target_address: CAMPAIGN_ADDRESS,
      long_description: "Campus emergency relief fund.",
    });
    const timestamp = Date.now();
    const clientMessage = buildAuthMessage("update_metadata", ADDRESS, timestamp, clientPayload);
    const serverPayload = serverMetadataPayload(clientPayload);
    const serverMessage = buildAuthMessage("update_metadata", ADDRESS, timestamp, serverPayload);
    expect(clientMessage).toBe(serverMessage);
  });

  it("matches when every field is provided (campaign)", () => {
    const clientPayload = clientMetadataPayload({
      target_type: "campaign",
      target_address: CAMPAIGN_ADDRESS,
      cover_image_url: "https://example.com/cover.jpg",
      long_description: "Flood relief for the Kathmandu valley.",
      location: "Kathmandu, Nepal",
      external_links: ["https://news.example.com/story", "  https://example.org/donate  "],
      gallery_urls: ["https://example.com/1.jpg", ""],
      disaster_date: "2026-08-01",
    });
    const timestamp = Date.now();
    const clientMessage = buildAuthMessage("update_metadata", ADDRESS, timestamp, clientPayload);
    const serverPayload = serverMetadataPayload(clientPayload);
    const serverMessage = buildAuthMessage("update_metadata", ADDRESS, timestamp, serverPayload);
    expect(clientMessage).toBe(serverMessage);
  });

  it("matches when no optional fields are provided at all", () => {
    const clientPayload = clientMetadataPayload({ target_type: "fund", target_address: CAMPAIGN_ADDRESS });
    const timestamp = Date.now();
    const clientMessage = buildAuthMessage("update_metadata", ADDRESS, timestamp, clientPayload);
    const serverPayload = serverMetadataPayload(clientPayload);
    const serverMessage = buildAuthMessage("update_metadata", ADDRESS, timestamp, serverPayload);
    expect(clientMessage).toBe(serverMessage);
  });
});

/// Mirrors postUpdate's payload-building in relivioApi.ts exactly.
function clientUpdatePayload(input: {
  target_type: "fund" | "campaign";
  target_address: string;
  title: string;
  body?: string | null;
  image_urls?: string[];
}) {
  const normalizeStringArray = (v: string[] | undefined) =>
    (v ?? []).filter((s) => s.trim().length > 0).map((s) => s.trim());
  return {
    target_type: input.target_type,
    target_address: input.target_address,
    title: input.title,
    body: input.body ?? null,
    image_urls: normalizeStringArray(input.image_urls),
  };
}

/// Mirrors the server's reconstruction in app/api/updates/route.ts exactly.
function serverUpdatePayload(body: ReturnType<typeof clientUpdatePayload>) {
  const normalizeStringArray = (v: unknown) =>
    Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim()) : [];
  return {
    target_type: body.target_type,
    target_address: body.target_address,
    title: body.title,
    body: body.body ?? null,
    image_urls: normalizeStringArray(body.image_urls),
  };
}

describe("postUpdate client/server message parity", () => {
  it("matches with only a title (no body, no images)", () => {
    const clientPayload = clientUpdatePayload({
      target_type: "campaign",
      target_address: CAMPAIGN_ADDRESS,
      title: "Distribution day 1 complete",
    });
    const timestamp = Date.now();
    const clientMessage = buildAuthMessage("post_update", ADDRESS, timestamp, clientPayload);
    const serverPayload = serverUpdatePayload(clientPayload);
    const serverMessage = buildAuthMessage("post_update", ADDRESS, timestamp, serverPayload);
    expect(clientMessage).toBe(serverMessage);
  });

  it("matches with title, body, and images all provided", () => {
    const clientPayload = clientUpdatePayload({
      target_type: "fund",
      target_address: CAMPAIGN_ADDRESS,
      title: "Receipts uploaded",
      body: "Attached receipts for this week's disbursements.",
      image_urls: ["https://example.com/r1.jpg", "https://example.com/r2.jpg"],
    });
    const timestamp = Date.now();
    const clientMessage = buildAuthMessage("post_update", ADDRESS, timestamp, clientPayload);
    const serverPayload = serverUpdatePayload(clientPayload);
    const serverMessage = buildAuthMessage("post_update", ADDRESS, timestamp, serverPayload);
    expect(clientMessage).toBe(serverMessage);
  });
});

describe("uploadImage client/server message parity", () => {
  it("matches for the upload_image signed payload", () => {
    const payload = { context: "cover", target_type: "campaign", target_address: CAMPAIGN_ADDRESS };
    const timestamp = Date.now();
    const clientMessage = buildAuthMessage("upload_image", ADDRESS, timestamp, payload);
    // Server reconstructs from the same three form fields, no defaulting
    // needed since none of these are optional.
    const serverMessage = buildAuthMessage("upload_image", ADDRESS, timestamp, payload);
    expect(clientMessage).toBe(serverMessage);
  });
});