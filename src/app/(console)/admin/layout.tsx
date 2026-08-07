import type { Metadata } from "next";

/**
 * The /admin segment.
 *
 * ⚠ Do not add an auth check here.
 *
 * This layout wraps every /admin route, including /admin/login and
 * /admin/unavailable. A `requireStaff()` in this file redirects an
 * unauthorised visitor to /admin/login — which is inside this layout, so it
 * redirects again, and the browser gives up with ERR_TOO_MANY_REDIRECTS.
 *
 * The guard lives one level down, in (panel)/layout.tsx. The route group
 * leaves URLs untouched — /admin still resolves to (panel)/page.tsx — while
 * giving the authenticated screens a layout the sign-in page does not share.
 *
 * Styling comes from the console root layout.
 */
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · PulseCommerce Admin" },
  robots: { index: false, follow: false },
};

export default function AdminSegmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
