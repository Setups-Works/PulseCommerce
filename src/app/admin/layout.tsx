import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaff } from "@/services/auth-service";
import "@/app/heroui.css";

/**
 * The admin shell's layout.
 *
 * Three things happen here and nowhere else:
 *
 *   1. `heroui.css` is imported. Scoping it to this layout rather than the
 *      root means HeroUI's stylesheet is only sent to people who reach /admin
 *      — the marketing site never downloads it.
 *
 *   2. `.heroui-scope` wraps everything. HeroUI and shadcn collide on several
 *      CSS variable names while meaning different things by them; the scope is
 *      what keeps the two apart. The long version is at the top of heroui.css.
 *
 *   3. The role is checked. The proxy has already established that *somebody*
 *      is signed in; this is where we find out whether they are staff. It runs
 *      once per navigation rather than once per request, which is why the
 *      database lookup lives here and not at the network boundary.
 *
 * `noindex` because an admin panel in a search index is an invitation.
 */

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · PulseCommerce Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();

  return (
    <div className="heroui-scope">
      <AdminShell
        role={profile.role}
        email={profile.email}
        fullName={profile.full_name}
        avatarUrl={profile.avatar_url}
      >
        {children}
      </AdminShell>
    </div>
  );
}
