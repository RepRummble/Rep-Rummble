/* eslint-disable */
// Delivered by Originkit · stack: nextjs · styling: tailwind
// Delivered by Originkit · stack: nextjs
"use client";

"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Asset root — flat files in package assets/. */
const A = "/originkit/hero-11";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

/**
 * Figma pill CTA — cream → copper background stays put.
 * Hover: black arrow chip expands across the pill (arrow stays trailing right).
 */
export const Button = ({
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) => {
  return (
    <button
      type={type}
      className={`group relative inline-flex h-[55px] shrink-0 cursor-pointer touch-manipulation items-center overflow-hidden rounded-[49px] border-[1.5px] border-solid border-white py-[5px] pr-[5px] pl-5 [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.97] motion-reduce:active:scale-100 cursor-pointer ${className}`}
      style={{
        backgroundImage: [
          "radial-gradient(ellipse 80% 90% at 8% 80%, rgba(255,123,26,0.5) 0%, transparent 70%)",
          "radial-gradient(ellipse 70% 80% at 96% 20%, rgba(255,123,26,1) 0%, transparent 65%)",
          "radial-gradient(ellipse 60% 70% at 88% 85%, rgba(255,123,26,0.85) 0%, transparent 60%)",
          "linear-gradient(90deg, #ffffff 0%, #f5ebe3 55%, #d4a07a 100%)",
        ].join(", "),
      }}
      {...props}
    >
      <span className="relative z-10 pr-14 whitespace-nowrap font-tight text-[20px] font-medium leading-none tracking-[-0.8px] text-black transition-colors duration-200 ease [@media(hover:hover)_and_(pointer:fine)]:group-hover:text-white">
        {children}
      </span>

      {/* Expanding arrow chip — width animates on hover; icon stays optically centered in the 45px end cap */}
      <span
        aria-hidden="true"
        className="absolute top-1/2 right-[5px] z-0 inline-flex h-[45px] w-[45px] -translate-y-1/2 items-center justify-end overflow-hidden rounded-full bg-black transition-[width] duration-300 ease-[cubic-bezier(0.215,0.61,0.355,1)] will-change-[width] motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:w-[calc(100%-10px)]"
      >
        <span className="flex size-[45px] shrink-0 items-center justify-center">
          <img
            src={`${A}/icons-arrow-up-right.svg`}
            alt=""
            width={22}
            height={22}
            className="size-[22px] translate-x-px -translate-y-px"
          />
        </span>
      </span>
    </button>
  );
};
