"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConnectWallet } from "@/components/ConnectWallet";
import { NotificationBell } from "@/components/NotificationBell";
import { RelivioLogo } from "@/components/RelivioLogo";

const NAV_LINKS = [
  { href: "/funds", label: "Emergency Funds" },
  { href: "/campaigns", label: "Relief Campaigns" },
  { href: "/analytics", label: "Analytics" },
  { href: "/reputation", label: "Reputation" },
];

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 640) setMobileOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <div
        className="fixed inset-x-0 top-0 z-50 flex justify-center transition-[padding] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ padding: scrolled ? "12px 24px 0" : "0px" }}
      >
        <header
          className="glass-nav relative w-full overflow-hidden transition-[max-width,border-radius] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            maxWidth: scrolled ? "820px" : "100%",
            borderRadius: mobileOpen ? "24px" : scrolled ? "9999px" : "0px",
          }}
        >
          <div className="glass-sheen pointer-events-none absolute inset-0" />

          <nav className="relative flex items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-display tracking-tight text-black">
              <RelivioLogo size={34} />
              RELIVIO
            </Link>

            <div
              className={`absolute left-1/2 -translate-x-1/2 items-center gap-6 text-sm ${
                scrolled ? "hidden" : "hidden sm:flex"
              }`}
            >
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="text-neutral-600 hover:text-black transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 sm:flex">
                <NotificationBell />
                <ConnectWallet />
              </div>
              <button
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
                className={`flex h-9 w-9 items-center justify-center rounded-md border border-black/15 ${
                  scrolled ? "" : "sm:hidden"
                }`}
              >
                <MenuIcon open={mobileOpen} />
              </button>
            </div>
          </nav>

          {mobileOpen && (
            <div className={`relative border-t border-black/10 px-6 py-4 ${scrolled ? "" : "sm:hidden"}`}>
              <div className="flex flex-col gap-4">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-sm text-neutral-700 hover:text-black"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex items-center gap-2 pt-2 sm:hidden">
                  <NotificationBell />
                  <ConnectWallet />
                </div>
              </div>
            </div>
          )}
        </header>
      </div>

      <div className="h-[73px]" />

      <style jsx>{`
        .glass-nav {
          background:
            linear-gradient(rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.82)),
            url("/textures/crumpled-fabric.webp");
          background-size: cover;
          background-position: center;
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