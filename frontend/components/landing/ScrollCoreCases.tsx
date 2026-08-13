"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

type CoreCase = {
  tag: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  align: "left" | "right";
};

const CASES: CoreCase[] = [
  {
    tag: "EMERGENCY FUND",
    title: "Individual Emergency Assistance",
    description:
      "Community members request help for medical, student, family, or temporary financial emergencies. The community votes; approved requests are paid out automatically by a smart contract — never by an admin.",
    primaryLabel: "Contribute",
    primaryHref: "/funds",
    align: "left",
  },
  {
    tag: "RELIEF CAMPAIGN",
    title: "Disaster & Community Relief",
    description:
      "Verified organizers run public relief campaigns — flood, cyclone, earthquake, rebuilding — with milestone-based fund releases so no organizer can withdraw a full treasury at once.",
    primaryLabel: "Contribute",
    primaryHref: "/campaigns",
    align: "right",
  },
];

export function ScrollCoreCases() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      // No transform/opacity animation for users who've asked for reduced
      // motion — just show the cards fully settled.
      cardRefs.current.forEach((el) => {
        if (!el) return;
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      return;
    }

    let ticking = false;

    function update() {
      const vh = window.innerHeight;
      const viewportCenter = vh / 2;

      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;

        // 1 when the card's center coincides with the viewport's center,
        // fading toward 0 as it approaches the top or bottom edge.
        const distance = Math.abs(cardCenter - viewportCenter);
        const progress = Math.max(0, Math.min(1, 1 - distance / viewportCenter));

        const translateY = (1 - progress) * 60; // px, settles to 0
        const scale = 0.96 + progress * 0.04; // settles to 1
        const tiltSign = i % 2 === 0 ? -1 : 1; // alternate tilt direction per card
        const rotate = (1 - progress) * 2 * tiltSign; // degrees, settles to 0

        el.style.opacity = String(progress);
        el.style.transform = `translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`;
      });

      ticking = false;
    }

    function onScrollOrResize() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    update(); // run once on mount so cards already in view aren't blank
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  return (
    <section className="relative bg-black py-40">
      <div className="mx-auto max-w-6xl px-6">
        {CASES.map((c, i) => (
          <div
            key={c.title}
            className={`mb-48 flex last:mb-0 ${c.align === "right" ? "justify-end" : "justify-start"}`}
          >
            <div
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              style={{ opacity: 0, transform: "translateY(60px) scale(0.96)", willChange: "transform, opacity" }}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-10 backdrop-blur-xl"
            >
              <span className="inline-block rounded-full border border-white/20 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-neutral-400">
                {c.tag}
              </span>
              <h3 className="mt-6 text-3xl font-display leading-tight text-white sm:text-4xl">
                {c.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-neutral-400">{c.description}</p>
              <div className="mt-8 flex gap-3">
                <Link
                  href={c.primaryHref}
                  className="rounded-md bg-neutral-200 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white"
                >
                  {c.primaryLabel}
                </Link>
                <Link
                  href={c.primaryHref}
                  className="rounded-md border-2 border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white hover:text-black"
                >
                  View details
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}