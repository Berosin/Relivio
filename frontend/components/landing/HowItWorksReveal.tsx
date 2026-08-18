"use client";

import { useEffect, useRef, useState } from "react";

type Step = {
  eyebrow: string;
  headline: string;
  detail: string;
  dark: boolean;
};

const STEPS: Step[] = [
  {
    eyebrow: "01 — Contribute",
    headline: "Members fund the treasury",
    detail: "RUSD flows into a smart-contract treasury. No custodian, no admin wallet.",
    dark: true,
  },
  {
    eyebrow: "02 — Split",
    headline: "Reserve + simulated yield",
    detail: "A configurable % is held liquid; the rest works in a labeled testnet yield engine.",
    dark: false,
  },
  {
    eyebrow: "03 — Request",
    headline: "Someone needs help",
    detail: "An emergency request or a public relief campaign is submitted on-chain.",
    dark: true,
  },
  {
    eyebrow: "04 — Vote",
    headline: "The community decides",
    detail: "Contributors vote, weighted by their stake. A 60% threshold approves.",
    dark: false,
  },
  {
    eyebrow: "05 — Release",
    headline: "Funds move automatically",
    detail: "The contract — not a person — releases funds the moment votes pass.",
    dark: true,
  },
];

function delayFor(index: number, total: number) {
  const center = (total - 1) / 2;
  const distance = Math.abs(index - center);
  const maxDistance = center;
  const wave = maxDistance - distance;
  return wave * 0.3;
}

export function HowItWorksReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { threshold: 0.32 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const centerDelay = delayFor(2, STEPS.length);
  const headlineDelay = centerDelay + 1.0;

  return (
    <section
      ref={sectionRef}
      className={`relative flex w-full flex-col overflow-hidden border-y border-white/10 bg-black sm:h-screen sm:flex-row ${
        inView ? "in-view" : ""
      }`}
    >
      {STEPS.map((step, i) => {
        return (
          <div
            key={step.headline}
            className="relative h-72 overflow-hidden border-b border-white/10 last:border-b-0 sm:h-auto sm:flex-1 sm:border-b-0 sm:border-r sm:last:border-r-0"
          >
            <div
              className={`reveal-block flex h-full w-full flex-col justify-between p-6 sm:p-8 ${
                step.dark ? "bg-black text-white" : "bg-white text-black"
              }`}
              style={{ transitionDelay: `${delayFor(i, STEPS.length)}s` }}
            >
              <div className="relative flex flex-1 items-start justify-center overflow-hidden pt-4">
                <span
                  className={`select-none font-display text-6xl leading-none sm:text-[10rem] lg:text-[13rem] ${
                    step.dark ? "text-white/10" : "text-black/10"
                  }`}
                >
                  {step.eyebrow.slice(0, 2)}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
                  {step.eyebrow}
                </span>
                <h3 className="mt-3 text-xl font-display leading-snug sm:text-2xl">
                  {step.headline}
                </h3>
                <p
                  className={`mt-3 text-sm leading-relaxed ${
                    step.dark ? "text-neutral-400" : "text-neutral-600"
                  }`}
                >
                  {step.detail}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      <div
        className={`pointer-events-none absolute inset-0 hidden items-center justify-center transition-all duration-700 ease-out sm:flex ${
          inView ? "opacity-100" : "translate-y-4 opacity-0"
        }`}
        style={{ transitionDelay: inView ? `${headlineDelay}s` : "0s" }}
      >
        <span className="rounded-full border border-white/20 bg-black/80 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          Five steps. Zero admin keys.
        </span>
      </div>

      <style jsx>{`
        .reveal-block {
          transform: translateY(100%);
          transition: transform 1s cubic-bezier(0.16, 1, 0.3, 1);
        }
        section.in-view .reveal-block {
          transform: translateY(0%);
        }
      `}</style>
    </section>
  );
}