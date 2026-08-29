"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase";
import { updateProfile } from "@/lib/relivioApi";

export function ProfileEditor() {
  const { address, isConnected } = useAccount();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !supabase) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, bio")
        .eq("wallet_address", address.toLowerCase())
        .maybeSingle();
      if (cancelled) return;
      setDisplayName(data?.display_name ?? "");
      setBio(data?.bio ?? "");
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setSaving(true);
    setStatus("idle");
    setError(null);
    try {
      await updateProfile(address, { display_name: displayName || undefined, bio: bio || undefined });
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!isConnected) return null;

  return (
    <div className="card mt-4">
      <h3 className="font-semibold">Public Profile</h3>
      <p className="mt-1 text-xs text-neutral-500">Off-chain, optional. Shown next to your comments.</p>

      {!loaded ? (
        <p className="mt-4 text-xs text-neutral-600">Loading...</p>
      ) : (
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <input
            className="input"
            maxLength={60}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
          />
          <textarea
            className="input"
            rows={2}
            maxLength={500}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Bio"
          />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-shine btn-primary">
              {saving ? "Signing & saving..." : "Save Profile"}
            </button>
            {status === "saved" && <span className="text-xs text-neutral-500">Saved.</span>}
            {status === "error" && (
              <span role="alert" className="text-xs text-red-400">
                {error}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}