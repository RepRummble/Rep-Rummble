/* eslint-disable */
// @ts-nocheck: delivered by Originkit as-is; it is not written for strict null checks
// Delivered by Originkit · stack: nextjs · styling: tailwind
// Delivered by Originkit · stack: nextjs
"use client";

"use client";

import type { KeyboardEvent } from "react";
import { Button } from "@/components/originkit/ui/hero-11/button";

/** Asset root — flat files in package assets/. */
const A = "/originkit/hero-11";

const NAV_LINKS = [
  { label: "// Docs", href: undefined, aria: "Docs" },
  { label: "// Blog", href: undefined, aria: "Blog" },
  { label: "// Discord", href: undefined, aria: "Discord" },
  { label: "// Twitter", href: undefined, aria: "Twitter" },
] as const;

type NavbarProps = {
  onBookNow: () => void;
};

const Logo = () => (
  <a
    aria-label="Visionary home"
    className="inline-flex min-h-11 items-center gap-2 touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [-webkit-tap-highlight-color:transparent]"
  >
    <img
      src={`${A}/nav-logo.svg`}
      alt=""
      width={22}
      height={22}
      className="size-[22px] shrink-0"
      aria-hidden="true"
    />
    <span className="font-sans text-[20px] font-semibold leading-[25.5px] tracking-[-0.4px] text-white whitespace-nowrap">
      Visionary
    </span>
  </a>
);

export const Navbar = ({ onBookNow }: NavbarProps) => {
  const handleKeyDown = (
    event: KeyboardEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    /* navigation disabled in preview */ void 0;
  };

  return (
    <nav aria-label="Primary" className="relative z-30 w-full">
      {/* Mobile — Figma Nav: 402×58, p-16, logo + menu */}
      <div className="flex h-[58px] w-full items-center justify-between p-4 desktop-sm:hidden">
        <Logo />
        <button
          type="button"
          aria-label="Open menu"
          className="inline-flex size-6 min-h-11 min-w-11 shrink-0 items-center justify-center touch-manipulation transition-opacity duration-200 ease focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [-webkit-tap-highlight-color:transparent] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-80"
        >
          <img
            src={`${A}/nav-menu.svg`}
            alt=""
            width={24}
            height={24}
            className="size-6"
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Desktop — Figma: left 100 / top 36 / width 1231 within 1440 */}
      <div className="mx-auto hidden w-full max-w-[1440px] items-center justify-between px-[100px] pt-9 desktop-sm:flex">
        <ul className="flex w-[299px] items-center gap-6 font-tight text-[17px] leading-[25.5px] tracking-[-0.34px] text-white">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                tabIndex={0}
                aria-label={link.aria}
                onKeyDown={(event) => handleKeyDown(event, link.href)}
                className="inline-flex min-h-11 items-center touch-manipulation whitespace-nowrap transition-opacity duration-200 ease focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [-webkit-tap-highlight-color:transparent] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-70"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <Logo />

        <div className="flex w-[299px] items-center justify-end">
          <Button aria-label="Book Now" onClick={onBookNow}>
            Book Now
          </Button>
        </div>
      </div>
    </nav>
  );
};
