import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksReveal } from "@/components/landing/HowItWorksReveal";
import { ScrollCoreCases } from "@/components/landing/ScrollCoreCases";
import { WhyRelivio } from "@/components/landing/WhyRelivio";

export default function Home() {
  return (
    <>
      <HeroSection />

      <HowItWorksReveal />

      <ScrollCoreCases />

      <WhyRelivio />
    </>
  );
}