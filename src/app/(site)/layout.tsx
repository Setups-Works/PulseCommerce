import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/marketing/schema";
import "@/app/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  /*
   * Required for `alternates.canonical` and relative OG urls to resolve to
   * absolute ones. Without it Next emits relative canonicals, which crawlers
   * ignore — and every preview deployment would claim to be the canonical
   * copy of the marketing site.
   */
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "WooCommerce analytics",
    "commerce intelligence",
    "RFM segmentation",
    "customer lifetime value",
    "churn prediction",
    "cohort analysis",
    "revenue forecasting",
    "WhatsApp marketing",
    "ecommerce business intelligence",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  formatDetection: { telephone: false },
};

/*
 * Colours the browser chrome to match the surface behind it, per theme. Split
 * out from `metadata` because Next requires viewport fields in their own
 * export — leaving `themeColor` in the metadata object is a build-time warning
 * and a silently dropped tag.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

/**
 * Root layout for the public site and the product.
 *
 * One of two root layouts. This one owns globals.css — shadcn tokens, the
 * chart palette, Magic UI's keyframes. The console has its own at
 * app/(console)/layout.tsx and loads HeroUI's stylesheet instead.
 *
 * They are split rather than sharing a root because HeroUI and shadcn theme
 * themselves with the same CSS variable names and mean different things by
 * several of them — `--muted` is a surface in one and text in the other. Two
 * root layouts means neither stylesheet is ever on the same page as the other,
 * so there is nothing to reconcile and no override layer to maintain.
 *
 * It also means the marketing site never downloads HeroUI, and the admin panel
 * never downloads Magic UI.
 */
export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
