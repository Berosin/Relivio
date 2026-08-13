"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === "/") return null; // nothing to go "back" to from the homepage

  return (
    <div className="mx-auto max-w-6xl px-6 pt-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-md border-2 border-white/20 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:border-white hover:bg-white hover:text-black"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
    </div>
  );
}