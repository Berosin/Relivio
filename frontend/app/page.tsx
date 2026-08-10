import Link from "next/link";
import { HeroSection } from "@/components/landing/hero-section";

export default function Home() {
  return (
    <>
      <HeroSection />

      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border-2 border-white/15 bg-black p-8 text-white transition-shadow hover:border-white/30 hover:shadow-[0_8px_30px_rgba(255,255,255,0.06)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Core Use Case 1
            </span>
            <h2 className="mt-2 text-2xl font-display">Individual Emergency Assistance</h2>
            <p className="mt-3 text-sm text-neutral-400">
              Community members request help for medical, student, family, or temporary financial
              emergencies. The community votes; approved requests are paid out automatically by a
              smart contract — never by an admin.
            </p>
            <Link
              href="/funds"
              className="btn-shine mt-6 inline-block rounded-md border-2 border-white bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white"
            >
              Explore Emergency Funds →
            </Link>
          </div>

          <div className="rounded-2xl border-2 border-black bg-black p-8 text-white transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              Core Use Case 2
            </span>
            <h2 className="mt-2 text-2xl font-display">Disaster & Community Relief</h2>
            <p className="mt-3 text-sm text-neutral-400">
              Verified organizers run public relief campaigns — flood, cyclone, earthquake,
              rebuilding — with milestone-based fund releases so no organizer can withdraw a full
              treasury at once.
            </p>
            <Link
              href="/campaigns"
              className="btn-shine mt-6 inline-block rounded-md border-2 border-white bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white"
            >
              Explore Relief Campaigns →
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border-2 border-black bg-black p-8 text-white">
          <h3 className="text-lg font-display">How it works</h3>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-neutral-300">
            {[
              "Contribution",
              "Smart-Contract Treasury",
              "Emergency Reserve + DeFi Yield",
              "Request / Campaign",
              "Governance Vote",
              "Smart-Contract Release",
              "On-chain Record",
            ].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1">{step}</span>
                {i < arr.length - 1 && <span className="text-neutral-400">→</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}