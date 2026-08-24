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
};

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
      .select("id, author_address, body, created_at")
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
    <div className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
        Comments {comments.length > 0 && `(${comments.length})`}
      </p>

      <div className="mt-3 space-y-3">
        {loaded && comments.length === 0 && (
          <p className="text-sm text-neutral-500">No comments yet.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg border border-white/10 p-3">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span className="font-mono">{shortAddress(c.author_address)}</span>
              <span>{new Date(c.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-sm text-neutral-200">{c.body}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        <textarea
          className="input-light w-full"
          rows={2}
          maxLength={2000}
          placeholder={isConnected ? "Add a comment..." : "Connect your wallet to comment"}
          disabled={!isConnected || posting}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="mt-2 flex items-center justify-between">
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={!isConnected || posting || !draft.trim()}
            className="ml-auto rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:border-white/40 disabled:opacity-40"
          >
            {posting ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </form>
    </div>
  );
}