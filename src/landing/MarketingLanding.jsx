import { useEffect, useCallback, useState } from "react";
import posthog from "posthog-js";
import WorldMapBackground from "../components/WorldMapBackground.jsx";
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
  const [mapParallaxY, setMapParallaxY] = useState(0);

  const scrollToDemo = useCallback(() => {
    document.getElementById("lp-demo")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onScroll = () => {
      try {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setMapParallaxY(0);
          return;
        }
        const y = window.scrollY || 0;
        setMapParallaxY(Math.min(52, Math.round(y * 0.052)));
      } catch {
        setMapParallaxY(0);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("lp-marketing");
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
    return () => root.classList.remove("lp-marketing");
  }, []);

  return (
    <div className="lp-root lp-sans">
      <WorldMapBackground phases={[]} parallaxTranslateY={mapParallaxY} />
      <div className="lp-content-stack">
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
    </div>
  );
}
