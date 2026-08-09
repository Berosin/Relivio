import Link from "next/link";
import { HeroSection } from "@/components/landing/hero-section";

export default function Home() {
  return (
    <>
      <HeroSection />

      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Core Use Case 1
            </span>
            <h2 className="mt-2 text-2xl font-bold">Individual Emergency Assistance</h2>
            <p className="mt-3 text-sm text-neutral-400">
              Community members request help for medical, student, family, or temporary financial
              emergencies. The community votes; approved requests are paid out automatically by a
              smart contract — never by an admin.
            </p>
            <Link
              href="/funds"
              className="mt-6 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
            >
              Explore Emergency Funds →
            </Link>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              Core Use Case 2
            </span>
            <h2 className="mt-2 text-2xl font-bold">Disaster & Community Relief</h2>
            <p className="mt-3 text-sm text-neutral-400">
              Verified organizers run public relief campaigns — flood, cyclone, earthquake,
              rebuilding — with milestone-based fund releases so no organizer can withdraw a full
              treasury at once.
            </p>
            <Link
              href="/campaigns"
              className="mt-6 inline-block rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sky-400"
            >
              Explore Relief Campaigns →
            </Link>
          </div>
        </div>

        <div className="mt-16 rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
          <h3 className="text-lg font-semibold">How it works</h3>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
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
                <span className="rounded-full border border-neutral-700 px-3 py-1">{step}</span>
                {i < arr.length - 1 && <span className="text-neutral-600">→</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}