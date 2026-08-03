import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Neobrutalist primitives.
 *
 * Three rules make the style, and they are enforced here rather than left to
 * each page: a heavy black border, a hard offset shadow with no blur, and flat
 * saturated fills. Anything soft — a gradient, a blurred shadow, a subtle
 * border — reads as a different design language entirely, so the tokens live in
 * one place and nothing downstream is free to soften them.
 *
 * Kept separate from `components/ui` on purpose. Those are the product's own
 * components and must stay untouched; this is marketing dressing that happens
 * to share a codebase.
 */

/** The one shadow in the system. No blur, ever. */
const SHADOW = "shadow-[6px_6px_0_0_#000]";
const SHADOW_SM = "shadow-[4px_4px_0_0_#000]";
const SHADOW_LG = "shadow-[10px_10px_0_0_#000]";

export function NeoCard({
  className, children, tint, ...props
}: React.ComponentProps<"div"> & { tint?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border-[3px] border-black p-6",
        SHADOW,
        tint ?? "bg-white",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function NeoBadge({ className, children, tint, ...props }: React.ComponentProps<"span"> & { tint?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border-[3px] border-black px-4 py-1.5",
        "text-sm font-extrabold tracking-tight",
        SHADOW_SM,
        tint ?? "bg-[#ffd93d]",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * The press is the whole interaction.
 *
 * On hover the button slides into its own shadow rather than lifting — the
 * shadow shrinks by exactly the distance the button moves, so the shape appears
 * to be pushed into the page. A transform without the matching shadow change
 * just looks like drift.
 */
export function NeoButton({
  className, children, tint, asChild, ...props
}: React.ComponentProps<"a"> & { tint?: string; asChild?: boolean }) {
  return (
    <a
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border-[3px] border-black",
        "px-7 py-3.5 text-lg font-extrabold tracking-tight",
        SHADOW,
        "transition-all duration-100",
        "hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_#000]",
        "active:translate-x-[6px] active:translate-y-[6px] active:shadow-none",
        tint ?? "bg-[#2f66e8] text-white",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

export function NeoPanel({ className, children, tint, ...props }: React.ComponentProps<"div"> & { tint?: string }) {
  return (
    <div
      className={cn("rounded-2xl border-[3px] border-black p-8 md:p-12", SHADOW_LG, tint ?? "bg-white", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * A product screenshot, framed.
 *
 * Browser chrome around a real capture, on the same heavy border and hard
 * shadow as everything else — so an image sits in the page as an object rather
 * than floating on it.
 */
export function NeoShot({
  src, alt, caption, className,
}: {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
}) {
  return (
    <figure className={cn("overflow-hidden rounded-xl border-[3px] border-black bg-white", SHADOW, className)}>
      <div className="flex items-center gap-2 border-b-[3px] border-black bg-[#ffd93d] px-4 py-2.5">
        <span className="size-3 rounded-full border-2 border-black bg-[#ff6b5a]" />
        <span className="size-3 rounded-full border-2 border-black bg-white" />
        <span className="size-3 rounded-full border-2 border-black bg-[#7bdc9b]" />
        {caption ? (
          <span className="ml-2 truncate text-sm font-extrabold tracking-tight">{caption}</span>
        ) : null}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- static captures
          under public/, sized by the layout rather than by the optimiser. */}
      <img src={src} alt={alt} className="block w-full" />
    </figure>
  );
}

/** A section heading with the marker underline the style is known for. */
export function NeoHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-4xl font-extrabold tracking-tighter md:text-5xl", className)}>
      {children}
    </h2>
  );
}

export function NeoMark({ children, tint }: { children: React.ReactNode; tint?: string }) {
  return (
    <span className={cn("box-decoration-clone rounded-md border-[3px] border-black px-2", tint ?? "bg-[#ffd93d]")}>
      {children}
    </span>
  );
}
