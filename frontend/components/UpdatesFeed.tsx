"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase";
import { postUpdate } from "@/lib/relivioApi";
import { shortAddress } from "@/lib/format";

type Update = {
  id: string;
  title: string;
  body: string | null;
  image_urls: string[] | null;
  author_address: string | null;
  created_at: string;
};

export function UpdatesFeed({
  kind,
  targetAddress,
  isOrganizer,
}: {
  kind: "fund" | "campaign";
  targetAddress: `0x${string}`;
  isOrganizer: boolean;
}) {
  const { address } = useAccount();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!supabase) {
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("updates")
      .select("id, title, body, image_urls, author_address, created_at")
      .eq("target_type", kind)
      .eq("target_address", targetAddress.toLowerCase())
      .order("created_at", { ascending: false });
    setUpdates((data as Update[]) ?? []);
    setLoaded(true);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, targetAddress]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !title.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await postUpdate(address, {
        target_type: kind,
        target_address: targetAddress,
        title: title.trim(),
        body: body.trim() || null,
        image_urls: imageUrls.split("\n"),
      });
      setTitle("");
      setBody("");
      setImageUrls("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post update.");
    } finally {
      setPosting(false);
    }
  }

  if (!loaded) return null;
  if (updates.length === 0 && !isOrganizer) return null;

  return (
    <div className="card mt-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Updates{updates.length > 0 && ` (${updates.length})`}</h3>
        {isOrganizer && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="text-xs font-medium text-neutral-500 underline decoration-dotted underline-offset-4 transition-colors hover:text-white"
          >
            {showForm ? "Cancel" : "Post update"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            className="input"
            placeholder="Title"
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="input"
            rows={3}
            maxLength={5000}
            placeholder="Details (optional)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <textarea
            className="input"
            rows={2}
            placeholder="Photo URLs, one per line (optional)"
            value={imageUrls}
            onChange={(e) => setImageUrls(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={posting || !title.trim()} className="btn-shine btn-primary">
              {posting ? "Signing & posting..." : "Post Update"}
            </button>
            {error && (
              <span role="alert" className="text-xs text-red-400">
                {error}
              </span>
            )}
          </div>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {updates.length === 0 && !showForm && <p className="text-xs text-neutral-600">No updates posted yet.</p>}
        {updates.map((u) => (
          <div key={u.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span className="font-medium text-neutral-200">{u.title}</span>
              <span>{new Date(u.created_at).toLocaleString()}</span>
            </div>
            {u.body && <p className="mt-1.5 text-sm text-neutral-300">{u.body}</p>}
            {u.image_urls && u.image_urls.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {u.image_urls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="aspect-square rounded-md border border-white/10 object-cover" />
                ))}
              </div>
            )}
            {u.author_address && <p className="mt-1.5 font-mono text-[11px] text-neutral-600">{shortAddress(u.author_address)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}