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
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
        Public Profile <span className="normal-case text-neutral-500">(off-chain, optional)</span>
      </p>
      {!loaded ? (
        <p className="mt-3 text-sm text-neutral-500">Loading...</p>
      ) : (
        <form onSubmit={handleSave} className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-500">Display name</span>
            <input
              className="input-light w-full"
              maxLength={60}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Shown next to your comments"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-500">Bio</span>
            <textarea
              className="input-light w-full"
              rows={2}
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:border-white/40 disabled:opacity-40"
            >
              {saving ? "Signing & saving..." : "Save Profile"}
            </button>
            {status === "saved" && <span className="text-xs text-neutral-400">Saved.</span>}
            {status === "error" && <span className="text-xs text-red-400">{error}</span>}
          </div>
        </form>
      )}
    </div>
  );
}