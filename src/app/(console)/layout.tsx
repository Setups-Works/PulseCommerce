import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "@/app/heroui.css";

/**
 * Root layout for the console: /admin, /auth and /onboarding.
 *
 * The second of two root layouts. This one loads HeroUI's stylesheet and
 * nothing else — no globals.css, so no shadcn tokens, so nothing for HeroUI's
 * theme to collide with.
 *
 * That is the whole reason the split exists. Both libraries theme themselves
 * with bare CSS custom properties and mean different things by several of the
 * same names — `--muted` is a near-white surface in shadcn and mid-grey text
 * in HeroUI, `--accent` is a hover surface in one and the primary action
 * colour in the other. Sharing a root layout meant one of them had to be
 * overridden back, in a scope block that had to be kept in step with HeroUI's
 * defaults by hand. Two root layouts removes the conflict instead of managing
 * it: HeroUI's stock theme applies to `:root` here, unmodified, and there is
 * no custom CSS anywhere in the console.
 *
 * It also splits the bundles the right way round — the marketing site never
 * downloads HeroUI, and the admin panel never downloads Magic UI or Recharts.
 *
 * Geist is loaded here too. next/font dedupes across layouts, so this is the
 * same font files the site serves, not a second copy.
 */

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "PulseCommerce", template: "%s · PulseCommerce" },
  // None of these pages belong in a search index.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
