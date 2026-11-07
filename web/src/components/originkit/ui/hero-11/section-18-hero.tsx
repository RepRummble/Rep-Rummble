/* eslint-disable */
// Delivered by Originkit · stack: nextjs · styling: tailwind
// Delivered by Originkit · stack: nextjs
"use client";

"use client";

import { FeatureRail } from "@/components/originkit/ui/hero-11/feature-rail";
import {
  GlowBackground,
  GradientOverlay,
} from "@/components/originkit/ui/hero-11/glow-background";
import { HeroContent } from "@/components/originkit/ui/hero-11/hero-content";
import { Navbar } from "@/components/originkit/ui/hero-11/navbar";
import { PortraitStage } from "@/components/originkit/ui/hero-11/portrait-stage";

export const Section18Hero = () => {
  const handleGetStarted = () => {
    /* navigation disabled in preview */ void 0;
  };

  const handleBookNow = () => {
    /* navigation disabled in preview */ void 0;
  };

  return (
    <section
      aria-label="Visionary liquid distortion hero"
      className="relative isolate min-h-svh w-full overflow-hidden bg-black"
    >
      {/*
        Stack:
          base gradient  z-0
          liquid         z-5
          gradient-2     z-10 (radial cutout over face)
          nav / copy     z-20
      */}
      <GlowBackground />
      <PortraitStage />
      <GradientOverlay />

      <div className="relative mx-auto w-full max-w-none desktop-sm:max-w-[1440px]">
        <div className="relative mx-auto flex min-h-svh w-full max-w-[402px] flex-col ipad:max-w-none desktop-sm:max-w-none">
          <div className="pointer-events-none relative z-20 flex w-full flex-col">
            <div className="pointer-events-auto w-full">
              <Navbar onBookNow={handleBookNow} />
            </div>
          </div>

          <div className="pointer-events-none relative z-20 flex flex-1 flex-col items-center justify-end px-[18px] pb-[72px] desktop-sm:grid desktop-sm:grid-cols-[366px_1fr_129px] desktop-sm:items-end desktop-sm:justify-items-stretch desktop-sm:gap-0 desktop-sm:px-[100px] desktop-sm:pb-[114px]">
            <div className="pointer-events-auto desktop-sm:col-start-1 desktop-sm:justify-self-start">
              <HeroContent onGetStarted={handleGetStarted} />
            </div>

            <div className="pointer-events-auto hidden desktop-sm:col-start-3 desktop-sm:block desktop-sm:justify-self-end">
              <FeatureRail />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
