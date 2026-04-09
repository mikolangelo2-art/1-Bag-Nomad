import { useEffect, useCallback } from "react";
import posthog from "posthog-js";
import "./landing.css";
import { HeroSection } from "./HeroSection.jsx";
import { FeelingSection } from "./FeelingSection.jsx";
import { HowItWorksSection } from "./HowItWorksSection.jsx";
import { PromiseSection } from "./PromiseSection.jsx";
import { DemoSection } from "./DemoSection.jsx";
import { FounderSection } from "./FounderSection.jsx";
import { FeaturesSection } from "./FeaturesSection.jsx";
import { FinalCTASection } from "./FinalCTASection.jsx";

export default function MarketingLanding() {
  const scrollToDemo = useCallback(() => {
    document.getElementById("lp-demo")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    document.title = "1 Bag Nomad \u2014 Dream Big. Travel Light.";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "1 Bag Nomad builds your expedition around what you want to feel \u2014 not just where you want to go. AI-powered trip planning, packing, and budgeting in one place."
      );
    }
    try {
      posthog.capture("landing_page_viewed");
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="lp-root lp-sans">
      <div id="lp-hero">
        <HeroSection onWatchDemo={scrollToDemo} />
      </div>
      <FeelingSection />
      <HowItWorksSection />
      <PromiseSection />
      <div id="lp-demo">
        <DemoSection onPlay={scrollToDemo} />
      </div>
      <FounderSection />
      <FeaturesSection />
      <FinalCTASection />
    </div>
  );
}
