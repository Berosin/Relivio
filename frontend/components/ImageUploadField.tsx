"use client";

import { useRef, useState } from "react";
import { useAccount } from "wagmi";
import { uploadImage, type UploadContext } from "@/lib/relivioApi";

export function ImageUploadField({
  context,
  targetType,
  targetAddress,
  multiple,
  value,
  onChange,
  label,
}: {
  context: UploadContext;
  targetType: "fund" | "campaign";
  targetAddress: `0x${string}`;
  multiple: boolean;
  value: string[];
  onChange: (urls: string[]) => void;
  label: string;
}) {
  const { address } = useAccount();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !address) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadImage(address, {
          context,
          target_type: targetType,
          target_address: targetAddress,
          file,
        });
        uploaded.push(url);
      }
      onChange(multiple ? [...value, ...uploaded] : uploaded.slice(-1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-neutral-500">{label}</span>

      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div key={url} className="group relative h-20 w-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full rounded-md border border-white/10 object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Remove image"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-black text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="inline-flex cursor-pointer items-center rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white/40">
        {uploading ? "Uploading..." : value.length > 0 && !multiple ? "Replace image" : multiple ? "Choose images" : "Choose image"}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple={multiple}
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </label>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}