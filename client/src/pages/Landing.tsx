import { Navbar, Hero } from "@/components/landing/Hero";
import { IDEShowcase } from "@/components/landing/IDEShowcase";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Stats } from "@/components/landing/Stats";
import { Testimonials } from "@/components/landing/Testimonials";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { GridBackground } from "@/components/ui/backgrounds";

export default function Landing() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      <GridBackground />
      <Navbar />
      <Hero />
      <IDEShowcase />
      <HowItWorks />
      <Stats />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}
