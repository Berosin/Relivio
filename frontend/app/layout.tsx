import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { NetworkGuard } from "@/components/NetworkGuard";
import { CursorGlow } from "@/components/CursorGlow";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BackButton } from "@/components/BackButton";

export const metadata: Metadata = {
  title: "Relivio",
  description:
    "Relivio is a decentralized financial infrastructure platform for transparent, community-governed emergency assistance and disaster relief. Hackathon/testnet prototype.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-black text-white font-sans">
        <Providers>
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
  >
    Skip to main content
  </a>
  <CursorGlow />
  <SiteHeader />
  <NetworkGuard />
  <main id="main-content" className="relative z-10 flex-1">
    {children}
  </main>
  <SiteFooter />
</Providers>
      </body>
    </html>
  );
}