"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase";
import { postComment } from "@/lib/relivioApi";
import { shortAddress } from "@/lib/format";

type Comment = {
  id: number;
  author_address: string;
  body: string;
  created_at: string;
  // The client has no generated Database types, so supabase-js can't tell
  // this FK is many-to-one and infers the embed as an array — but
  // PostgREST's actual runtime behavior for a plain many-to-one FK embed
  // like this one returns a single object, not an array. Accepting both
  // shapes here means this doesn't silently break depending on which one
  // actually comes back over the wire.
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
};

function authorLabel(c: Comment): string {
  const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
  const name = profile?.display_name?.trim();
  return name ? name : shortAddress(c.author_address);
}

export function CommentSection({
  targetType,
  targetAddress,
  targetId = null,
}: {
  targetType: "fund_request" | "campaign" | "campaign_milestone";
  targetAddress: `0x${string}`;
  targetId?: number | null;
}) {
  const { address, isConnected } = useAccount();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadComments() {
    if (!supabase) {
      setLoaded(true);
      return;
    }
    let query = supabase
      .from("comments")
      .select("id, author_address, body, created_at, profiles(display_name)")
      .eq("target_type", targetType)
      .eq("target_address", targetAddress.toLowerCase())
      .order("created_at", { ascending: true });
    query = targetId === null ? query.is("target_id", null) : query.eq("target_id", targetId);

    const { data } = await query;
    setComments((data as Comment[]) ?? []);
    setLoaded(true);
  }

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, targetAddress, targetId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !draft.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await postComment(address, {
        target_type: targetType,
        target_address: targetAddress,
        target_id: targetId,
        comment_body: draft.trim(),
      });
      setDraft("");
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="card mt-6">
      <h3 className="font-semibold">Comments{comments.length > 0 && ` (${comments.length})`}</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Public, wallet-signed. Ask questions or add context before voting.
      </p>

      <div className="mt-4 space-y-3">
        {loaded && comments.length === 0 && (
          <p className="text-xs text-neutral-600">No comments yet — be the first to ask a question.</p>
        )}
        {comments.map((c) => {
          const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
          const hasName = Boolean(profile?.display_name?.trim());
          return (
            <div key={c.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span
                  className={hasName ? "text-neutral-300" : "font-mono text-neutral-400"}
                  title={c.author_address}
                >
                  {authorLabel(c)}
                </span>
                <span>{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-1.5 text-sm text-neutral-200">{c.body}</p>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <textarea
          className="input"
          rows={2}
          maxLength={2000}
          placeholder={isConnected ? "Add a comment..." : "Connect your wallet to comment"}
          disabled={!isConnected || posting}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!isConnected || posting || !draft.trim()}
            className="btn-shine btn-primary"
          >
            {posting ? "Signing & posting..." : "Post Comment"}
          </button>
          {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
        </div>
      </form>
    </div>
  );
}