import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { ConnectWallet } from "@/components/ConnectWallet";

export const metadata: Metadata = {
  title: "Relivio — Turning Community Liquidity into Crisis Relief",
  description:
    "Relivio is a decentralized financial infrastructure platform for transparent, community-governed emergency assistance and disaster relief. Hackathon/testnet prototype.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100 font-sans">
        <Providers>
          <header className="border-b border-neutral-800">
            <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-lg font-bold tracking-tight">
                RELIVIO
              </Link>
              <div className="flex items-center gap-6 text-sm">
                <Link href="/funds" className="text-neutral-300 hover:text-white">
                  Emergency Funds
                </Link>
                <Link href="/campaigns" className="text-neutral-300 hover:text-white">
                  Relief Campaigns
                </Link>
                <Link href="/analytics" className="text-neutral-300 hover:text-white">
                  Analytics
                </Link>
                <ConnectWallet />
              </div>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-neutral-800 py-6 text-center text-xs text-neutral-500">
            Relivio is a hackathon/testnet prototype. No real funds are used. All yield shown is
            SIMULATED TESTNET YIELD unless otherwise stated.
          </footer>
        </Providers>
      </body>
    </html>
  );
}