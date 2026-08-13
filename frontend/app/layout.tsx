import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { NetworkGuard } from "@/components/NetworkGuard";
import { CursorGlow } from "@/components/CursorGlow";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BackButton } from "@/components/BackButton";

export const metadata: Metadata = {
  title: "Relivio — Turning Community Liquidity into Crisis Relief",
  description:
    "Relivio is a decentralized financial infrastructure platform for transparent, community-governed emergency assistance and disaster relief. Hackathon/testnet prototype.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-black text-white font-sans">
        <Providers>
          <CursorGlow />
          <SiteHeader />
          <NetworkGuard />
          <main className="relative z-10 flex-1">
  <BackButton />
  {children}
</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}