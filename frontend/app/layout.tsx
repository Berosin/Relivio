import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { ConnectWallet } from "@/components/ConnectWallet";
import { NetworkGuard } from "@/components/NetworkGuard";
import { CursorGlow } from "@/components/CursorGlow";

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
    <NetworkGuard />
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-display tracking-tight text-black">
          RELIVIO
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/funds" className="text-neutral-600 hover:text-black transition-colors">
            Emergency Funds
          </Link>
          <Link href="/campaigns" className="text-neutral-600 hover:text-black transition-colors">
            Relief Campaigns
          </Link>
          <Link href="/analytics" className="text-neutral-600 hover:text-black transition-colors">
            Analytics
          </Link>
          <ConnectWallet />
        </div>
      </nav>
    </header>
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