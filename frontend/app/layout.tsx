import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { NetworkGuard } from "@/components/NetworkGuard";
import { CursorGlow } from "@/components/CursorGlow";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Relivio — Turning Community Liquidity into Crisis Relief",
  description:
    "Relivio is a decentralized financial infrastructure platform for transparent, community-governed emergency assistance and disaster relief. Hackathon/testnet prototype.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-black font-sans">
        <Providers>
          <CursorGlow />
          <SiteHeader />
          <NetworkGuard />
          <main className="relative z-10 flex-1">{children}</main>
          <footer className="relative z-10 border-t border-black/10 py-6 text-center text-xs text-neutral-500">
            Relivio is a hackathon/testnet prototype. No real funds are used. All yield shown is
            SIMULATED TESTNET YIELD unless otherwise stated.
          </footer>
        </Providers>
      </body>
    </html>
  );
}