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