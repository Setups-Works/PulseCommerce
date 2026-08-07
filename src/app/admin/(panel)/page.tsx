import Link from "next/link";
import { Card, Chip } from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleExclamation,
  faFileLines,
  faImages,
  faLayerGroup,
  faQuoteLeft,
  faTriangleExclamation,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { StatCard, StatGrid } from "@/components/admin/stat-card";
import { getContentHealth } from "@/services/admin-service";
import { requireStaff } from "@/services/auth-service";
import { ROLE_LABELS } from "@/lib/auth/rbac";

export const metadata = { title: "Dashboard" };

/**
 * The admin dashboard.
 *
 * Deliberately not a wall of vanity charts. What an operator needs on opening
 * this is: what is unpublished, what is a placeholder, and what did somebody
 * change. Traffic figures live on /admin/analytics, where they can be looked
 * at when they are the question rather than being the first thing in the way.
 *
 * A server component with one service call — the counts come back in a single
 * round trip rather than one query per tile.
 */
export default async function AdminDashboardPage() {
  const profile = await requireStaff();
  const health = await getContentHealth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          {profile.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}` : "Welcome back"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Signed in as {profile.email} · {ROLE_LABELS[profile.role]}
        </p>
      </div>

      <StatGrid>
        <StatCard
          label="Published sections"
          value={String(health.publishedSections)}
          icon={faLayerGroup}
          hint={`${health.draftSections} in draft`}
        />
        <StatCard label="Media assets" value={String(health.mediaCount)} icon={faImages} />
        <StatCard
          label="Pages & posts"
          value={String(health.pageCount + health.postCount)}
          icon={faFileLines}
          hint={`${health.postCount} blog posts`}
        />
        <StatCard
          label="Accounts"
          value={String(health.staffCount + health.customerCount)}
          icon={faUsers}
          hint={`${health.staffCount} staff, ${health.customerCount} customers`}
        />
      </StatGrid>

      {/* ---- Things that need a decision ---------------------------------- */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 text-warning" />
            <h3 className="text-sm font-semibold">Needs attention</h3>
          </div>

          <ul className="mt-4 flex flex-col gap-3">
            {health.warnings.length === 0 ? (
              <li className="text-sm text-muted">
                Nothing outstanding. Every published section has real content.
              </li>
            ) : (
              health.warnings.map((warning) => (
                <li key={warning.href} className="flex items-start gap-3">
                  <FontAwesomeIcon
                    icon={faCircleExclamation}
                    className="mt-0.5 w-3.5 shrink-0 text-warning"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={warning.href}
                      className="text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {warning.title}
                    </Link>
                    <p className="text-xs text-muted">{warning.detail}</p>
                  </div>
                  <Chip size="sm" color="warning" className="shrink-0 text-[10px]">
                    {warning.badge}
                  </Chip>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faQuoteLeft} className="w-4 text-muted" />
            <h3 className="text-sm font-semibold">Recent activity</h3>
          </div>

          <ul className="mt-4 flex flex-col gap-3">
            {health.recentActivity.length === 0 ? (
              <li className="text-sm text-muted">
                No changes recorded yet. Edits made here will appear in this list.
              </li>
            ) : (
              health.recentActivity.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">{entry.actor}</span> {entry.action}{" "}
                      <span className="text-muted">{entry.entity}</span>
                    </p>
                    <p className="text-xs text-muted">{entry.when}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>
      </section>
    </div>
  );
}
