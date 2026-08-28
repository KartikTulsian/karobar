import FeatureGrid from "@/components/landing/FeatureGrid";
import HeroSection from "@/components/landing/HeroSection";
import PricingSection from "@/components/landing/PricingSection";
import RoleShowcase from "@/components/landing/Roleshowcase";
import SecuritySection from "@/components/landing/SecuritySection";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <HeroSection />
      <div id="features">
        <FeatureGrid />
      </div>
      <RoleShowcase/>
      <SecuritySection />
      <div id="pricing">
        <PricingSection />
      </div>
    </div>
  );
}
