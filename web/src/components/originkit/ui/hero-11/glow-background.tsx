/* eslint-disable */
// Delivered by Originkit · stack: nextjs · styling: tailwind
// Delivered by Originkit · stack: nextjs
"use client";

"use client";

import { useEffect, useState, type CSSProperties } from "react";

/** Asset root — flat files in package assets/. */
const A = "/originkit/hero-11";

/** Matches `--breakpoint-ipad` / `--breakpoint-desktop-sm` */
const IPAD_MIN = 768;
const DESKTOP_SM_MIN = 1280;

/**
 * Base atmosphere — behind portrait (z-0).
 * Opaque RGB gradient; section supplies bg-black.
 */
export const GlowBackground = () => {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <img
        src={`${A}/bg-gradient.webp`}
        alt=""
        width={1440}
        height={840}
        className="absolute inset-0 size-full object-cover object-[center_top]"
      />
    </div>
  );
};

type CutoutTier = "mobile" | "ipad" | "desktop";

/**
 * Soft elliptical window over the goggles / face:
 * transparent center → liquid shows; opaque edges → gradient-2 covers.
 * Origin tracks PortraitStage position per breakpoint.
 */
const buildCutout = (tier: CutoutTier): CSSProperties => {
  const radial =
    tier === "desktop"
      ? "radial-gradient(ellipse 42% 48% at 50% 72%, transparent 0%, transparent 32%, #000 68%, #000 100%)"
      : tier === "ipad"
        ? "radial-gradient(ellipse 34% 30% at 50% 34%, transparent 0%, transparent 38%, #000 76%, #000 100%)"
        : "radial-gradient(ellipse 28% 22% at 50% 40%, transparent 0%, transparent 40%, #000 76%, #000 100%)";

  return {
    maskImage: radial,
    WebkitMaskImage: radial,
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskMode: "alpha",
  };
};

/**
 * Figma Mask group (830×590) — soft white wash blob used as alpha.
 * Approximates:
 *   2059×1934 @ (-612, -666), linear 195deg white 72% → 0, blur ~58px
 * so mobile image.png only shows through this soft window.
 */
const MOBILE_IMAGE_MASK: CSSProperties = {
  maskImage:
    "radial-gradient(ellipse 95% 90% at 50% 51%, #000 0%, #000 32%, rgba(0,0,0,0.55) 52%, transparent 74%)",
  WebkitMaskImage:
    "radial-gradient(ellipse 95% 90% at 50% 51%, #000 0%, #000 32%, rgba(0,0,0,0.55) 52%, transparent 74%)",
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskMode: "alpha",
};

/**
 * Figma Mask group (1440×1024) — tablet soft white wash as alpha.
 * Approximates:
 *   3573×3356 @ (-1062, -1156), linear 195deg white 72% → 0, blur 100px
 * so tablet.png only shows through this soft window.
 */
const TABLET_IMAGE_MASK: CSSProperties = {
  maskImage:
    "radial-gradient(ellipse 98% 95% at 50% 80%, #000 0%, #000 28%, rgba(0,0,0,0.5) 48%, transparent 72%)",
  WebkitMaskImage:
    "radial-gradient(ellipse 98% 95% at 50% 80%, #000 0%, #000 28%, rgba(0,0,0,0.5) 48%, transparent 72%)",
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskMode: "alpha",
};

/**
 * Gradient-2 overlay (z-10) — above liquid (z-5).
 * Center cutout reveals the animated bust; amber wash covers the rest.
 */
export const GradientOverlay = () => {
  const [tier, setTier] = useState<CutoutTier>("mobile");

  useEffect(() => {
    const desktop = window.matchMedia(`(min-width: ${DESKTOP_SM_MIN}px)`);
    const ipad = window.matchMedia(`(min-width: ${IPAD_MIN}px)`);

    const sync = () => {
      if (desktop.matches) {
        setTier("desktop");
        return;
      }
      if (ipad.matches) {
        setTier("ipad");
        return;
      }
      setTier("mobile");
    };

    sync();
    desktop.addEventListener("change", sync);
    ipad.addEventListener("change", sync);
    return () => {
      desktop.removeEventListener("change", sync);
      ipad.removeEventListener("change", sync);
    };
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      style={buildCutout(tier)}
      aria-hidden="true"
    >
      <img
        src={`${A}/bg-gradient-2.webp`}
        alt=""
        width={1440}
        height={840}
        className="absolute inset-0 hidden size-full object-cover object-[center_top] brightness-100 contrast-700 saturate-100 desktop-sm:block"
      />
      <img
        src={`${A}/bg-gradient-2.webp`}
        alt=""
        width={1440}
        height={840}
        className="absolute inset-0 hidden size-full object-cover object-[center_top] mix-blend-screen brightness-150 saturate-175 desktop-sm:block"
      />

      {/* Mobile — image.png only visible through Figma soft-wash mask */}
      <div
        className="absolute inset-0 overflow-hidden desktop-sm:hidden"
      // style={MOBILE_IMAGE_MASK}
      >
        <img
          src={`${A}/gradient.webp`}
          alt=""
          width={1440}
          height={840}
          className="absolute inset-0 size-full ipad:size-1/2 object-cover object-[center_top] mix-blend-multiply"
        />
        <img
          src={`${A}/ray.webp`}
          alt=""
          width={1440}
          height={840}
          className="absolute inset-0 size-full ipad:translate-y-[-50%] object-cover object-[center_top] blur-lg"
        />
      </div>

      {/* iPad — tablet.png through soft-wash mask, above liquid (z-10) */}
      {/* <div
        className="absolute inset-0 hidden overflow-hidden ipad:block desktop-sm:hidden"
      // style={TABLET_IMAGE_MASK}
      >
        <img
          src={`${A}/gradient.webp`}
          alt=""
          width={1440}
          height={1024}
          className="absolute inset-0 size-11/12 object-cover object-[center_top] mix-blend-multiply"
        />
        <img
          src={`${A}/ray.webp`}
          alt=""
          width={1440}
          height={1024}
          className="absolute inset-0 size-full object-contain object-[center_top] blur-md brightness-150"
        />
      </div> */}
    </div>
  );
};
