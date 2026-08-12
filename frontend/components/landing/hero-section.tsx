"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { AsciiPhotoEffect } from "./AsciiPhotoEffect";

const words = ["assist", "protect", "fund", "rebuild"];

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative bg-black px-4 pt-8 pb-16 sm:px-6 lg:px-12">
      <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-2xl border-2 border-white/20 bg-black">
        <div className="pointer-events-none absolute right-0 top-1/2 h-[600px] w-[600px] -translate-y-1/2 opacity-80 lg:h-[900px] lg:w-[900px]">
          <AsciiPhotoEffect
            className="h-full w-full"
            config={{
              tint: "#ffffff",
              tintOpacity: 8,
              pfx: {
                vignette: { enabled: true, intensity: 45 },
                scanLines: { enabled: true, intensity: 25 },
                chromatic: { enabled: true, intensity: 25 },
                bloom: { enabled: true, intensity: 50 },
                filmGrain: { enabled: true, intensity: 35 },
                glitch: { enabled: true, intensity: 15 },
                pixelate: { enabled: false, intensity: 0 },
                halftone: { enabled: false, intensity: 0 },
                filmDust: { enabled: false, intensity: 0 },
              },
            }}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
          {[...Array(8)].map((_, i) => (
            <div
              key={`h-${i}`}
              className="absolute h-px bg-white/10"
              style={{ top: `${12.5 * (i + 1)}%`, left: 0, right: 0 }}
            />
          ))}
          {[...Array(12)].map((_, i) => (
            <div
              key={`v-${i}`}
              className="absolute w-px bg-white/10"
              style={{ left: `${8.33 * (i + 1)}%`, top: 0, bottom: 0 }}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto w-full px-6 py-24 lg:px-12 lg:py-32">
          <div
            className={`mb-8 transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <span className="inline-flex items-center gap-3 text-sm font-mono text-neutral-400">
              <span className="h-px w-8 bg-white/40" />
              Community liquidity, turned into crisis relief
            </span>
          </div>

          <div className="mb-12">
            <h1
              className={`text-[clamp(2.5rem,8vw,6rem)] font-display leading-[0.95] tracking-tight text-white transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <span className="block">Relivio helps you</span>
              <span className="block">
                <span className="relative inline-block border-b-2 border-white/40">
                  <span key={wordIndex} className="inline-flex">
                    {words[wordIndex].split("").map((char, i) => (
                      <span
                        key={`${wordIndex}-${i}`}
                        className="inline-block animate-char-in"
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        {char}
                      </span>
                    ))}
                  </span>
                </span>{" "}
                your community
              </span>
            </h1>
          </div>

          <div className="grid items-end gap-12 lg:grid-cols-2 lg:gap-24">
            <p
              className={`max-w-xl text-xl leading-relaxed text-neutral-400 transition-all delay-200 duration-700 lg:text-2xl ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              A community-governed treasury for emergency assistance and disaster
              relief — funds are voted on and released automatically by smart
              contracts, never by an admin.
            </p>

            <div
              className={`flex flex-col items-start gap-4 transition-all delay-300 duration-700 sm:flex-row ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <Button size="lg" className="btn-shine group h-14 rounded-md px-8 text-base" asChild>
                <Link href="/funds">
                  Explore Emergency Funds
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-md border-white/30 px-8 text-base text-white hover:border-white hover:bg-white hover:text-black"
                asChild
              >
                <Link href="/campaigns">Explore Relief Campaigns</Link>
              </Button>
            </div>
          </div>
        </div>

        <div
          className={`relative z-10 border-t border-white/10 py-6 transition-all delay-500 duration-700 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="marquee flex gap-16 whitespace-nowrap">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-16 pl-6">
                {[
                  { value: "60%", label: "approval threshold", note: "DAO VOTED" },
                  { value: "0", label: "admin keys to release funds", note: "SMART CONTRACT ONLY" },
                  { value: "100%", label: "on-chain & transparent", note: "AUDITABLE" },
                  { value: "2", label: "core use cases, one treasury engine", note: "EMERGENCY + RELIEF" },
                ].map((stat) => (
                  <div key={`${stat.note}-${i}`} className="flex items-baseline gap-4">
                    <span className="text-3xl font-display text-white lg:text-4xl">{stat.value}</span>
                    <span className="text-sm text-neutral-500">
                      {stat.label}
                      <span className="mt-1 block font-mono text-xs text-neutral-400">{stat.note}</span>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}