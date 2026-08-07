import type { Metadata } from "next";
import "@/app/heroui.css";

/**
 * The /admin shell: styling only, no guard.
 *
 * ⚠ Do not add an auth check here.
 *
 * This layout wraps *every* /admin route, including /admin/login and
 * /admin/unavailable. A `requireStaff()` in this file redirects an unauthorised
 * visitor to /admin/login — which is inside this layout, so it redirects again,
 * and the browser gives up with ERR_TOO_MANY_REDIRECTS. That is exactly the bug
 * this structure was rewritten to fix.
 *
 * The guard lives one level down, in (panel)/layout.tsx. The route group leaves
 * URLs untouched — /admin still resolves to (panel)/page.tsx — while giving the
 * authenticated screens a layout the sign-in page does not share.
 *
 * What does belong here is anything both the signed-in and signed-out screens
 * need: the HeroUI stylesheet and `.heroui-scope`. Importing the stylesheet at
 * this level rather than the root keeps it off the marketing site entirely.
 */

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · PulseCommerce Admin" },
  // An admin panel in a search index is an invitation.
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="heroui-scope min-h-screen bg-background text-foreground">{children}</div>;
}
