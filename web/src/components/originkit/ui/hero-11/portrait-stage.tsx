/* eslint-disable */
// Delivered by Originkit · stack: nextjs · styling: tailwind
// Delivered by Originkit · stack: nextjs
"use client";

"use client";

import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";
import LiquidHover from "@/components/originkit/ui/hero-11/liquid-distortion";

/** Asset root — flat files in package assets/. */
const A = "/originkit/hero-11";

/** ease-out-cubic */
const EASE_OUT = [0.215, 0.61, 0.355, 1] as const;

const HERO_SRC = `${A}/portraits-hero.webp`;

/**
 * Mobile → < desktop-sm: smaller bust, upper half.
 * desktop-sm+: large centered frame (previous desktop look).
 *
 * | Breakpoint              | Top      | Size                          | Transform                          |
 * | ----------------------- | -------- | ----------------------------- | ---------------------------------- |
 * | Default (mobile) <768   | top 14%  | w min(92vw, 400px), square    | -translate-x-1/2                   |
 * | iPad ≥768               | top 8%   | w min(72vw, 520px), square    | -translate-x-1/2                   |
 * | Desktop-sm+ ≥1280       | top 58%  | w/h 100svh                    | -translate-x-1/2 -translate-y-1/2  |
 */
const PORTRAIT_FRAME =
  "absolute top-[14%] left-1/2 z-[5] aspect-square w-[min(92vw,400px)] -translate-x-1/2 pointer-events-auto ipad:top-[8%] ipad:w-[min(72vw,520px)] desktop-sm:top-[58%] desktop-sm:h-[100svh] desktop-sm:w-[100svh] desktop-sm:max-w-none desktop-sm:-translate-y-1/2";

/** Fade chin/shoulders into the black section background */
const BOTTOM_BLEND: CSSProperties = {
  maskImage:
    "linear-gradient(to bottom, #000 0%, #000 48%, rgba(0,0,0,0.55) 72%, transparent 96%)",
  WebkitMaskImage:
    "linear-gradient(to bottom, #000 0%, #000 48%, rgba(0,0,0,0.55) 72%, transparent 96%)",
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
};

/**
 * Liquid portrait — scaled down below desktop-sm to match Figma mobile/iPad.
 * Bottom mask blends the bust into black.
 */
export const PortraitStage = () => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={PORTRAIT_FRAME}
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: EASE_OUT, delay: 0.1 }}
      aria-hidden="true"
    >
      <div className="relative size-full overflow-hidden" style={BOTTOM_BLEND}>
        {/*
          Kick off the portrait fetch during HTML parse instead of after
          hydration — LiquidHover's WebGL texture reuses this HTTP cache entry.
          crossOrigin must match so the WebGL fetch hits the same cache.
        */}
        <img
          src={HERO_SRC}
          alt=""
          aria-hidden="true"
          crossOrigin="anonymous"
          fetchPriority="high"
          decoding="async"
          className="pointer-events-none absolute size-0 opacity-0"
        />
        <LiquidHover
          imageSrc={HERO_SRC}
          resolution={10}
          cursorSize={15}
          intensity={18}
          style={{ width: "100%", height: "100%", cursor: "crosshair" }}
        />
      </div>
    </motion.div>
  );
};
