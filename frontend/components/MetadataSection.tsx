"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase";
import { upsertMetadata } from "@/lib/relivioApi";

type Metadata = {
  cover_image_url: string | null;
  long_description: string | null;
  location: string | null;
  external_links: string[] | null;
  gallery_urls?: string[] | null;
  disaster_date?: string | null;
};

const EMPTY_FORM = {
  cover_image_url: "",
  long_description: "",
  location: "",
  external_links: "",
  gallery_urls: "",
  disaster_date: "",
};

export function MetadataSection({
  kind,
  targetAddress,
  isOrganizer,
}: {
  kind: "fund" | "campaign";
  targetAddress: `0x${string}`;
  isOrganizer: boolean;
}) {
  const { address } = useAccount();
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const table = kind === "fund" ? "fund_metadata" : "campaign_metadata";
  const addressColumn = kind === "fund" ? "fund_address" : "campaign_address";

  async function load() {
    if (!supabase) {
      setLoaded(true);
      return;
    }
    const { data } = await supabase.from(table).select("*").eq(addressColumn, targetAddress.toLowerCase()).maybeSingle();
    const row = data as Metadata | null;
    setMetadata(row);
    setForm({
      cover_image_url: row?.cover_image_url ?? "",
      long_description: row?.long_description ?? "",
      location: row?.location ?? "",
      external_links: (row?.external_links ?? []).join("\n"),
      gallery_urls: (row?.gallery_urls ?? []).join("\n"),
      disaster_date: row?.disaster_date ?? "",
    });
    setLoaded(true);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, targetAddress]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setSaving(true);
    setError(null);
    try {
      await upsertMetadata(address, {
        target_type: kind,
        target_address: targetAddress,
        cover_image_url: form.cover_image_url || null,
        long_description: form.long_description || null,
        location: form.location || null,
        external_links: form.external_links.split("\n"),
        gallery_urls: form.gallery_urls.split("\n"),
        disaster_date: kind === "campaign" ? form.disaster_date || null : null,
      });
      await load();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save listing.");
    } finally {
      setSaving(false);
    }
  }

  const hasContent = Boolean(
    metadata &&
      (metadata.cover_image_url ||
        metadata.long_description ||
        metadata.location ||
        (metadata.external_links && metadata.external_links.length > 0) ||
        (metadata.gallery_urls && metadata.gallery_urls.length > 0))
  );

  if (!loaded) return null;
  if (!hasContent && !isOrganizer) return null;

  return (
    <div className="card mt-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Listing</h3>
        {isOrganizer && (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="text-xs font-medium text-neutral-500 underline decoration-dotted underline-offset-4 transition-colors hover:text-white"
          >
            {editing ? "Cancel" : hasContent ? "Edit listing" : "Add listing details"}
          </button>
        )}
      </div>

      {!editing && hasContent && metadata && (
        <div className="mt-4 space-y-4">
          {metadata.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={metadata.cover_image_url}
              alt=""
              className="max-h-64 w-full rounded-lg border border-white/10 object-cover"
            />
          )}
          {metadata.long_description && (
            <p className="whitespace-pre-wrap text-sm text-neutral-300">{metadata.long_description}</p>
          )}
          {(metadata.location || metadata.disaster_date) && (
            <p className="text-xs text-neutral-500">
              {metadata.location}
              {metadata.location && metadata.disaster_date && " · "}
              {metadata.disaster_date}
            </p>
          )}
          {metadata.gallery_urls && metadata.gallery_urls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {metadata.gallery_urls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="" className="aspect-square rounded-md border border-white/10 object-cover" />
              ))}
            </div>
          )}
          {metadata.external_links && metadata.external_links.length > 0 && (
            <ul className="space-y-1 text-xs">
              {metadata.external_links.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-neutral-400 underline hover:text-white">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!editing && !hasContent && isOrganizer && (
        <p className="mt-3 text-xs text-neutral-600">
          No listing details yet — add a cover image, description, and links to help donors understand this{" "}
          {kind === "fund" ? "fund" : "campaign"}.
        </p>
      )}

      {editing && (
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <input
            className="input"
            placeholder="Cover image URL"
            value={form.cover_image_url}
            onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))}
          />
          <textarea
            className="input"
            rows={4}
            maxLength={5000}
            placeholder="Long description"
            value={form.long_description}
            onChange={(e) => setForm((f) => ({ ...f, long_description: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Location"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          />
          {kind === "campaign" && (
            <>
              <input
                className="input"
                type="date"
                value={form.disaster_date}
                onChange={(e) => setForm((f) => ({ ...f, disaster_date: e.target.value }))}
              />
              <textarea
                className="input"
                rows={3}
                placeholder="Gallery image URLs, one per line"
                value={form.gallery_urls}
                onChange={(e) => setForm((f) => ({ ...f, gallery_urls: e.target.value }))}
              />
            </>
          )}
          <textarea
            className="input"
            rows={3}
            placeholder="External links (news coverage, verification sources), one per line"
            value={form.external_links}
            onChange={(e) => setForm((f) => ({ ...f, external_links: e.target.value }))}
          />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-shine btn-primary">
              {saving ? "Signing & saving..." : "Save Listing"}
            </button>
            {error && (
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