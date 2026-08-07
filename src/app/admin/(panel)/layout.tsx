import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaff } from "@/services/auth-service";

/**
 * The authenticated half of the admin panel.
 *
 * A route group, so the URLs are unchanged — /admin still resolves to
 * (panel)/page.tsx — but /admin/login and /admin/unavailable sit outside it and
 * are reachable without a session. Putting this guard in the parent layout
 * instead produced an infinite redirect: the destination it redirects to was
 * inside the layout doing the redirecting.
 *
 * The role check happens here rather than in proxy.ts because reading it needs
 * a database query, and doing that at the network boundary would add a round
 * trip to every request including static assets. A layout runs once per
 * navigation and React's `cache` dedupes the lookup across the render.
 *
 * `.heroui-scope` and the stylesheet come from the parent layout.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();

  return (
    <AdminShell
      role={profile.role}
      email={profile.email}
      fullName={profile.full_name}
      avatarUrl={profile.avatar_url}
    >
      {children}
    </AdminShell>
  );
}
