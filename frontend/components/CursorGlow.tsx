"use client";

import { useEffect } from "react";

/// Updates CSS custom properties --cursor-x/--cursor-y on every mouse move,
/// which the .cursor-glow background (see globals.css) reads to position a
/// soft radial highlight that follows the pointer across the whole site.
export function CursorGlow() {
  useEffect(() => {
    function handleMove(e: MouseEvent) {
      document.documentElement.style.setProperty("--cursor-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${e.clientY}px`);
    }
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return <div className="cursor-glow" aria-hidden="true" />;
}