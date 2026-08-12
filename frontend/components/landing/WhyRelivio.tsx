"use client";

import { useEffect, useRef, useState } from "react";

type Point = {
  index: string;
  label: string;
  highlight: string; // word inside the black/white box
  rest: string; // remaining plain-text word(s)
  body: string;
  align: "left" | "right";
};

const POINTS: Point[] = [
  {
    index: "01",
    label: "GOVERNANCE",
    highlight: "COMMUNITY",
    rest: "DECIDES",
    body: "Every request and every milestone is approved by a community vote, weighted by contribution. No admin ever overrides it.",
    align: "left",
  },
  {
    index: "02",
    label: "YIELD",
    highlight: "YIELD",
    rest: "IS LABELED",
    body: "Idle treasury funds work in a clearly marked SIMULATED TESTNET YIELD engine — never presented as real returns.",
    align: "right",
  },
  {
    index: "03",
    label: "TRANSPARENCY",
    highlight: "EVERY VOTE",
    rest: "ON-CHAIN",
    body: "Contributions, votes, and releases are all public and permanent. Nothing about the treasury is hidden.",
    align: "left",
  },
  {
    index: "04",
    label: "SAFETY",
    highlight: "ZERO",
    rest: "ADMIN KEYS",
    body: "Funds only move when the smart contract's own rules are satisfied — there is no override wallet, ever.",
    align: "right",
  },
];

export function WhyRelivio() {
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [inView, setInView] = useState<boolean[]>(() => POINTS.map(() => false));
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const idx = Number((entry.target as HTMLElement).dataset.index);
      setInView((prev) => {
        if (prev[idx] === entry.isIntersecting) return prev;
        const next = [...prev];
        next[idx] = entry.isIntersecting;
        return next;
      });
      if (entry.isIntersecting) {
        setActiveIndex(idx);
      }
    });
  },
  { threshold: 0.45 }
);

    rowRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-black py-32 text-white">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-24 font-display text-5xl tracking-tight sm:text-6xl">
          WHY RELIVIO
        </h2>

        <div className="relative flex">
          {/* Scroll-spy dot column — sticks vertically centered while you
              scroll through the tall stack of points on the right. */}
          <div className="hidden w-16 shrink-0 lg:block">
            <div className="sticky top-1/2 flex -translate-y-1/2 flex-col gap-4">
              {POINTS.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    activeIndex === i ? "scale-125 bg-white" : "bg-white/25"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex-1">
            {POINTS.map((point, i) => {
              const revealed = inView[i];
              const fromLeft = point.align === "left";
              return (
                <div
                  key={point.index}
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  data-index={i}
                  className="overflow-hidden border-t border-white/10 py-20 first:border-t-0"
                >
                  <span className="font-mono text-xs tracking-widest text-neutral-500">
                    {point.index} / {point.label}
                  </span>

                  <h3
                    className="why-row mt-4 flex flex-wrap items-baseline gap-x-4 font-display text-4xl leading-none sm:text-6xl"
                    style={{
                      transform: revealed
                        ? "translateX(0)"
                        : `translateX(${fromLeft ? "-220px" : "220px"})`,
                      filter: revealed ? "blur(0px)" : "blur(14px)",
                      opacity: revealed ? 1 : 0,
                      transitionDelay: revealed ? "0.05s" : "0s",
                    }}
                  >
                    <span className="bg-white px-3 py-1 text-black">{point.highlight}</span>
                    <span>{point.rest}</span>
                  </h3>

                  <p
                    className="why-row mt-6 max-w-xl text-sm leading-relaxed text-neutral-400 sm:text-base"
                    style={{
                      transform: revealed ? "translateY(0)" : "translateY(16px)",
                      opacity: revealed ? 1 : 0,
                      transitionDelay: revealed ? "0.35s" : "0s",
                    }}
                  >
                    {point.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        .why-row {
          transition:
            transform 0.9s cubic-bezier(0.16, 1, 0.3, 1),
            filter 0.9s cubic-bezier(0.16, 1, 0.3, 1),
            opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </section>
  );
}