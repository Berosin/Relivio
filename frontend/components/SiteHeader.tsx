"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConnectWallet } from "@/components/ConnectWallet";

/// Simple monochrome "shield + heart" mark — protection (disaster relief)
/// wrapped around care (emergency assistance), matching the two core use
/// cases. Pure line art so it reads cleanly at nav-bar size in black & white.
function RelivioMark() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <path
        d="M12 2L4 5v6c0 5 3.4 8.6 8 9 4.6-.4 8-4 8-9V5l-8-3z"
        stroke="black"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M12 15.5s-3.5-2.2-3.5-4.7a2 2 0 0 1 3.5-1.3 2 2 0 0 1 3.5 1.3c0 2.5-3.5 4.7-3.5 4.7z"
        fill="black"
      />
    </svg>
  );
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 40);
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Fixed wrapper centers the bar and controls the side-margin shrink */}
      <div
        className="fixed inset-x-0 top-0 z-50 flex justify-center transition-[padding] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ padding: scrolled ? "12px 24px 0" : "0px" }}
      >
        <header
          className="glass-nav relative w-full overflow-hidden transition-[max-width,border-radius] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            maxWidth: scrolled ? "820px" : "100%",
            borderRadius: scrolled ? "9999px" : "0px",
          }}
        >
          {/* Specular sheen — a soft diagonal highlight simulating light
              hitting curved glass, only really visible once curved */}
          <div className="glass-sheen pointer-events-none absolute inset-0" />

          <nav className="relative flex items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-display tracking-tight text-black">
              <RelivioMark />
              RELIVIO
            </Link>

            <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 text-sm sm:flex">
              <Link href="/funds" className="text-neutral-600 hover:text-black transition-colors">
                Emergency Funds
              </Link>
              <Link href="/campaigns" className="text-neutral-600 hover:text-black transition-colors">
                Relief Campaigns
              </Link>
              <Link href="/analytics" className="text-neutral-600 hover:text-black transition-colors">
                Analytics
              </Link>
            </div>

            <ConnectWallet />
          </nav>
        </header>
      </div>

      {/* Spacer so page content doesn't sit under the fixed header */}
      <div className="h-[73px]" />

      <style jsx>{`
        .glass-nav {
          background: rgba(255, 255, 255, 0.55);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow:
            inset 0 1px 1px rgba(255, 255, 255, 0.8),
            inset 0 -1px 1px rgba(0, 0, 0, 0.04),
            0 8px 32px rgba(0, 0, 0, 0.08);
        }
        .glass-sheen {
          background: linear-gradient(
            120deg,
            rgba(255, 255, 255, 0.5) 0%,
            rgba(255, 255, 255, 0.1) 30%,
            rgba(255, 255, 255, 0) 55%
          );
          mix-blend-mode: overlay;
        }
      `}</style>
    </>
  );
}