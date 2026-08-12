"use client";

import { ArrowUp } from "lucide-react";

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 5.02 3.26 9.28 7.78 10.78.57.1.78-.25.78-.55 0-.27-.01-1-.02-1.96-3.17.69-3.84-1.53-3.84-1.53-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.25 3.33.95.1-.74.4-1.25.72-1.54-2.53-.29-5.19-1.27-5.19-5.63 0-1.24.44-2.26 1.17-3.06-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.14 1.17a10.9 10.9 0 0 1 5.72 0c2.18-1.48 3.14-1.17 3.14-1.17.62 1.57.23 2.73.11 3.02.73.8 1.17 1.82 1.17 3.06 0 4.37-2.67 5.34-5.21 5.62.41.36.77 1.06.77 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.2.66.79.55 4.51-1.51 7.77-5.76 7.77-10.78C23.25 5.48 18.27.5 12 .5Z" />
    </svg>
  );
}

const TECH_STACK = ["Foundry", "Solidity", "Next.js", "wagmi / viem", "Anvil / Sepolia"];

export function SiteFooter() {
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="footer-dots relative border-t border-white/10 bg-black px-6 py-16 text-white sm:px-12">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.4fr_1fr_1.4fr]">
        {/* Wordmark + tagline */}
        <div>
          <h2 className="glitch-text select-none font-display text-5xl tracking-tight sm:text-6xl" data-text="RELIVIO">
            RELIVIO
          </h2>
          <p className="mt-4 max-w-sm font-mono text-sm leading-relaxed text-neutral-400">
            Vote it. Fund it. The community decides — transparently, on-chain, automatically.
          </p>
        </div>

        {/* Connect */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Connect
          </span>
          <div className="mt-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-neutral-300 transition-colors hover:text-white"
            >
              <GithubIcon />
              GitHub
            </a>
          </div>
        </div>

        {/* Tech stack */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Tech Stack
          </span>
          <div className="mt-4 flex flex-wrap gap-2">
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className="rounded-md border border-white/15 bg-white/5 px-3 py-1 font-mono text-xs text-neutral-300"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-16 flex max-w-6xl items-center justify-between border-t border-white/10 pt-6">
        <span className="text-xs text-neutral-600">
          Relivio is a hackathon/testnet prototype. No real funds are used. All yield shown is
          SIMULATED TESTNET YIELD.
        </span>
        <button
          onClick={scrollToTop}
          className="flex shrink-0 items-center gap-2 font-mono text-xs uppercase tracking-widest text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowUp className="h-3.5 w-3.5" />
          Back to top
        </button>
      </div>

      <style jsx>{`
        .footer-dots {
          background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
          background-size: 22px 22px;
          background-position: 0 0;
          background-repeat: repeat-x;
          background-attachment: local;
        }
        .footer-dots::before {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 32px;
          background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px);
          background-size: 22px 22px;
        }

        /* Subtle RGB-split glitch on the wordmark, static (not animated) so
           it reads as a deliberate print-defect style rather than a
           distracting flicker. */
        .glitch-text {
          position: relative;
          color: white;
        }
        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          overflow: hidden;
        }
        .glitch-text::before {
          color: #ff3b3b;
          transform: translate(2px, 0);
          opacity: 0.6;
          mix-blend-mode: screen;
        }
        .glitch-text::after {
          color: #3ba7ff;
          transform: translate(-2px, 0);
          opacity: 0.6;
          mix-blend-mode: screen;
        }
      `}</style>
    </footer>
  );
}