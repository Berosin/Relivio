"use client";

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 5.02 3.26 9.28 7.78 10.78.57.1.78-.25.78-.55 0-.27-.01-1-.02-1.96-3.17.69-3.84-1.53-3.84-1.53-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.25 3.33.95.1-.74.4-1.25.72-1.54-2.53-.29-5.19-1.27-5.19-5.63 0-1.24.44-2.26 1.17-3.06-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.14 1.17a10.9 10.9 0 0 1 5.72 0c2.18-1.48 3.14-1.17 3.14-1.17.62 1.57.23 2.73.11 3.02.73.8 1.17 1.82 1.17 3.06 0 4.37-2.67 5.34-5.21 5.62.41.36.77 1.06.77 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.2.66.79.55 4.51-1.51 7.77-5.76 7.77-10.78C23.25 5.48 18.27.5 12 .5Z" />
    </svg>
  );
}

const TECH_STACK = ["Foundry", "Solidity", "Next.js", "wagmi / viem", "Anvil / Sepolia"];

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/10 bg-black px-6 py-8 text-white sm:px-12">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6">
        <h2 className="glitch-text select-none font-display text-xl tracking-tight" data-text="RELIVIO">
          RELIVIO
        </h2>

        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm text-neutral-300 transition-colors hover:text-white"
        >
          <GithubIcon />
          GitHub
        </a>

        <div className="flex flex-wrap gap-2">
          {TECH_STACK.map((tech) => (
            <span
              key={tech}
              className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-neutral-300"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      <p className="mx-auto mt-4 max-w-6xl text-xs text-neutral-600">
        Relivio is a hackathon/testnet prototype. No real funds are used. All yield shown is
        SIMULATED TESTNET YIELD.
      </p>

      <style jsx>{`
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
          transform: translate(1.5px, 0);
          opacity: 0.6;
          mix-blend-mode: screen;
        }
        .glitch-text::after {
          color: #3ba7ff;
          transform: translate(-1.5px, 0);
          opacity: 0.6;
          mix-blend-mode: screen;
        }
      `}</style>
    </footer>
  );
}
