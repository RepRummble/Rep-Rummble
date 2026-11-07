/* eslint-disable */
// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import type { CSSProperties } from "react";
import FluidTrail from "@/components/originkit/ui/hero-11/fluid-trail";
import LiquidHover from "@/components/originkit/ui/hero-11/liquid-hover";

/** Public asset URLs — use a function so preview rewriters stay stable. */
function asset(file: string) {
  return `/originkit/hero-11/${file}`;
}

const PORTRAIT_MASK = asset("portrait-mask.svg");
const BACKGROUND_MASK = asset("background-mask.svg");

/** Only mask-image inline — position/size stay in CSS for responsive breakpoints. */
const portraitMaskStyle: CSSProperties = {
  WebkitMaskImage: `url(${PORTRAIT_MASK})`,
  maskImage: `url(${PORTRAIT_MASK})`,
};

const backgroundMaskStyle: CSSProperties = {
  WebkitMaskImage: `url(${BACKGROUND_MASK})`,
  maskImage: `url(${BACKGROUND_MASK})`,
};

type LiquidDistortionHeroProps = {
  brand?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

const navItems = [
  { label: "Docs", href: "#docs" },
  { label: "Blog", href: "#blog" },
  { label: "Discord", href: "#discord" },
  { label: "Twitter", href: "#twitter" },
] as const;

const socialItems = [
  { label: "X / Twitter", href: "#twitter", icon: "x.svg" },
  { label: "LinkedIn", href: "#linkedin", icon: "linkedin.svg" },
  { label: "Instagram", href: "#instagram", icon: "instagram.svg" },
] as const;

function keepLastWordsTogether(text: string, count = 2) {
  const words = text.trim().split(/\s+/);

  if (words.length <= count) {
    return text;
  }

  return `${words.slice(0, -count).join(" ")} ${words.slice(-count).join("\u00a0")}`;
}

function BackgroundArtwork() {
  return (
    <>
      <div className="ok-h11-background">
        <div className="ok-h11-maskedBackgroundLayer" style={backgroundMaskStyle}>
          <img
            alt=""
            className="ok-h11-layerImage"
            src={asset("background-layer-1.svg")}
          />
        </div>
        <div className="ok-h11-backgroundLayer ok-h11-backgroundLayer2">
          <img
            alt=""
            className="ok-h11-layerImage"
            src={asset("background-layer-2.svg")}
          />
        </div>
        <div className="ok-h11-backgroundLayer ok-h11-backgroundLayer3">
          <img
            alt=""
            className="ok-h11-layerImage"
            src={asset("background-layer-3.svg")}
          />
        </div>
        <div className="ok-h11-backgroundLayer ok-h11-backgroundLayer4">
          <img
            alt=""
            className="ok-h11-layerImage"
            src={asset("background-layer-4.svg")}
          />
        </div>
        <div className="ok-h11-backgroundLayer ok-h11-backgroundLayer5">
          <img
            alt=""
            className="ok-h11-layerImage"
            src={asset("background-layer-5.svg")}
          />
        </div>
        <div className="ok-h11-backgroundLayer ok-h11-backgroundLayer6">
          <img
            alt=""
            className="ok-h11-layerImage"
            src={asset("background-layer-6.svg")}
          />
        </div>
      </div>

      <div className="ok-h11-liquidCharacter">
        <LiquidHover imageSrc={asset("portrait-grid.png")} />
      </div>
      <div className="ok-h11-portrait" style={portraitMaskStyle}>
        <img alt="" src={asset("portrait.png")} />
      </div>
    </>
  );
}

function CapsuleButton({
  href,
  label,
  book = false,
}: {
  href: string;
  label: string;
  book?: boolean;
}) {
  return (
    <a className="ok-h11-button" href={href}>
      <span>{label}</span>
      <span className="ok-h11-buttonIcon">
        <img
          alt=""
          height={23}
          src={asset(book ? "arrow-up-right-book.svg" : "arrow-up-right.svg")}
          width={23}
        />
      </span>
    </a>
  );
}

/**
 * Visionary liquid-distortion hero from
 * https://github.com/moleeforx-del/visionary-liquid-distortion
 */
export function LiquidDistortionHero({
  brand = "Visionary",
  eyebrow = "Let’s build something Great",
  title = "Shaping the Future of Digital.",
  description = "We create modern websites with seamless user experiences.",
  primaryCta = { label: "Get Started", href: "#get-started" },
  secondaryCta = { label: "Book Now", href: "#book-now" },
}: LiquidDistortionHeroProps) {
  return (
    <section
      className="ok-h11-hero"
      data-node-id="50:5"
      aria-label="Visionary liquid distortion hero"
    >
      <BackgroundArtwork />
      <div aria-hidden="true" className="ok-h11-fluidTrail">
        <FluidTrail />
      </div>

      <header className="ok-h11-header">
        <nav className="ok-h11-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <a href={item.href} key={item.label}>
              {"//"} {item.label}
            </a>
          ))}
        </nav>

        <a className="ok-h11-brand" href="#" aria-label={`${brand} home`}>
          <img alt="" height={22} src={asset("brand-mark.svg")} width={22} />
          <span>{brand}</span>
        </a>

        <div className="ok-h11-book">
          <CapsuleButton
            book
            href={secondaryCta.href}
            label={secondaryCta.label}
          />
        </div>
        <button
          className="ok-h11-menu"
          type="button"
          aria-label="Open navigation"
        >
          <img alt="" height={32} src={asset("menu.svg")} width={32} />
        </button>
      </header>

      <div className="ok-h11-copy">
        <div className="ok-h11-headingGroup">
          <p className="ok-h11-eyebrow">{keepLastWordsTogether(eyebrow)}</p>
          <h1 className="ok-h11-title">{keepLastWordsTogether(title, 3)}</h1>
        </div>
        <p className="ok-h11-description">
          {keepLastWordsTogether(description)}
        </p>
        <CapsuleButton href={primaryCta.href} label={primaryCta.label} />
      </div>

      <aside className="ok-h11-details" aria-label="Service details">
        <div>
          <p className="ok-h11-detailTitle">Unlimited Design</p>
          <p className="ok-h11-detailLabel">Revisions</p>
        </div>
        <div>
          <p className="ok-h11-detailTitle">24/7&nbsp; Customer</p>
          <p className="ok-h11-detailLabel">Support</p>
        </div>
        <div className="ok-h11-socials">
          {socialItems.map((item) => (
            <a
              aria-label={item.label}
              className="ok-h11-social"
              href={item.href}
              key={item.label}
            >
              <img alt="" height={17} src={asset(item.icon)} width={17} />
            </a>
          ))}
        </div>
      </aside>
    </section>
  );
}
