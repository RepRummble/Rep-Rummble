/* eslint-disable */
// Delivered by Originkit · stack: nextjs · styling: tailwind
// Delivered by Originkit · stack: nextjs
"use client";

"use client";

import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/originkit/ui/hero-11/button";

/** ease-out-cubic */
const EASE_OUT = [0.215, 0.61, 0.355, 1] as const;

type HeroContentProps = {
  onGetStarted: () => void;
};

export const HeroContent = ({ onGetStarted }: HeroContentProps) => {
  const reduceMotion = useReducedMotion();

  const reveal = (delay: number) =>
    reduceMotion
      ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: {
            type: "tween" as const,
            duration: 0.45,
            ease: EASE_OUT,
            delay,
          },
        };

  return (
    <div className="relative z-20 flex w-full max-w-[366px] flex-col items-center gap-6 text-center desktop-sm:items-start desktop-sm:gap-8 desktop-sm:text-left">
      <div className="flex w-full flex-col items-center gap-4 text-white desktop-sm:items-start desktop-sm:gap-6">
        <motion.p
          {...reveal(0.1)}
          className="w-full font-sans text-[14px] ipad:text-[18px] font-normal leading-[1.2] tracking-[-0.42px] desktop-sm:font-tight desktop-sm:text-[18px] desktop-sm:font-light desktop-sm:leading-5 desktop-sm:tracking-[-0.54px]"
        >
          Let’s build something Great
        </motion.p>

        <div className="flex w-full flex-col items-center gap-2 desktop-sm:items-start desktop-sm:gap-6">
          <motion.h1
            {...reveal(0.18)}
            className="w-full max-w-[306px] ipad:max-w-[389px] font-instrument-serif text-[56px] ipad:text-[66px] leading-[1.1] tracking-[-1.68px] text-pretty desktop-sm:max-w-none desktop-sm:text-[62px] desktop-sm:leading-[1.05] desktop-sm:tracking-[-1.86px]"
          >
            Shaping the Future of Digital.
          </motion.h1>

          <motion.p
            {...reveal(0.26)}
            className="max-w-[252px] font-sans text-[16px] ipad:text-[18px] ipad:max-w-[311px] font-normal leading-[1.4] tracking-[-0.32px] text-white/60 desktop-sm:max-w-[339px] desktop-sm:font-tight desktop-sm:text-[17px] desktop-sm:leading-[25.5px] desktop-sm:tracking-[-0.34px]"
          >
            We create modern websites with seamless user experiences.
          </motion.p>
        </div>
      </div>

      <motion.div {...reveal(0.34)} className="pointer-events-auto">
        <Button aria-label="Get Started" onClick={onGetStarted}>
          Get Started
        </Button>
      </motion.div>
    </div>
  );
};
