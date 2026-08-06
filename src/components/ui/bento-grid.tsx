import { type ComponentPropsWithoutRef, type ReactNode } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

/*
 * Magic UI's bento grid, retyped onto this codebase's tokens.
 *
 * Two things changed from the registry version, both because it ships with a
 * palette of its own:
 *
 *   - Hardcoded `text-neutral-700` / `text-neutral-400` and the white inset
 *     shadow are replaced with `bg-card`, `ring-1 ring-foreground/10` and
 *     `text-muted-foreground`, so the cards match every other card in the
 *     product and track light and dark through the same variables.
 *   - The `<a>` is a next/link, so a card CTA is a client navigation like every
 *     other internal link on the site rather than a full page load.
 *
 * The hover behaviour is unchanged: the copy lifts and the CTA slides in on
 * pointer devices, and on touch — where there is no hover — the CTA is simply
 * always present.
 */

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode
  className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string
  className: string
  background: ReactNode
  Icon: React.ElementType
  description: string
  href: string
  cta: string
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-88 grid-cols-1 gap-4 md:grid-cols-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-xl md:col-span-3",
      "bg-card ring-1 ring-foreground/10",
      "transform-gpu transition-shadow duration-300 hover:shadow-[0_8px_36px_-12px_rgb(0_0_0/0.22)]",
      className
    )}
    {...props}
  >
    <div>{background}</div>
    <div className="p-5">
      <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 transition-all duration-300 lg:group-hover:-translate-y-10">
        <Icon
          className="size-9 origin-left transform-gpu text-primary transition-all duration-300 ease-in-out group-hover:scale-75"
          strokeWidth={1.5}
        />
        <h3 className="mt-1.5 font-heading text-lg font-medium">{name}</h3>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      {/* Touch: always visible, always tappable. */}
      <div className="mt-3 flex w-full transform-gpu flex-row items-center lg:hidden">
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {cta}
          <ArrowRight className="size-3.5 rtl:rotate-180" />
        </Link>
      </div>
    </div>

    {/* Pointer: slides up out of the bottom edge on hover, and on keyboard
        focus — a CTA reachable only by hover is a CTA a keyboard cannot use. */}
    <div className="pointer-events-none absolute bottom-0 hidden w-full translate-y-10 transform-gpu flex-row items-center p-5 opacity-0 transition-all duration-300 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 lg:flex">
      <Link
        href={href}
        className="pointer-events-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {cta}
        <ArrowRight className="size-3.5 rtl:rotate-180" />
      </Link>
    </div>

    <div className="pointer-events-none absolute inset-0 transform-gpu transition-colors duration-300 group-hover:bg-foreground/3" />
  </div>
)

export { BentoCard, BentoGrid }
