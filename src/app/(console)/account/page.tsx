import { redirect } from "next/navigation";
import { Card, Chip, Link as HeroLink } from "@heroui/react";
import { StoreManager } from "@/components/onboarding/store-manager";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { listStores } from "@/lib/store/config";
import { canConnectStore, getEntitlements } from "@/services/billing-service";
import { getProfile } from "@/services/auth-service";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

/**
 * A customer's own settings: their stores, their plan.
 *
 * Separate from /settings, which is the product's own single-tenant settings
 * screen and predates accounts. This one is account-scoped and only exists
 * when Supabase is configured — self-hosted deployments have one merchant and
 * manage their store there.
 */
export default async function AccountPage() {
  if (!isSupabaseConfigured()) redirect("/settings");

  const profile = await getProfile();
  if (!profile) redirect("/auth/sign-in?next=/account");

  const [{ active, stores }, entitlements, limit] = await Promise.all([
    listStores(),
    getEntitlements(),
    canConnectStore(),
  ]);

  return (
    <OnboardingShell
      step="done"
      title="Your account"
      subtitle="The stores connected to this account, and what your plan includes."
    >
      <div className="flex flex-col gap-8">
        <section>
          <h2 className="text-sm font-semibold">Connected stores</h2>
          <div className="mt-3">
            <StoreManager
              stores={stores.map((store) => ({
                url: store.url,
                name: store.name,
                isActive: store.url === active,
                updatedAt: store.updatedAt,
              }))}
              limit={entitlements.maxStores}
              canConnect={limit.allowed}
              limitReason={limit.reason}
            />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold">Your plan</h2>
          <Card className="mt-3 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Chip color="accent">{entitlements.planSlug}</Chip>
              <Chip size="sm" color={entitlements.isActive ? "success" : "danger"}>
                {entitlements.status}
              </Chip>
              <HeroLink href="/pricing" className="ml-auto text-sm">
                Compare plans
              </HeroLink>
            </div>

            <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <Limit label="Connected stores" value={entitlements.maxStores} />
              <Limit label="Orders of history" value={entitlements.maxOrders} />
              <Limit label="Months of history" value={entitlements.maxHistoryMonths} />
              <Limit label="Team members" value={entitlements.maxTeamMembers} />
            </dl>
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-semibold">WhatsApp</h2>
          <Card className="mt-3 p-5">
            <p className="text-sm text-muted">
              Messages send through a gateway you own. The self-hosted route has no per-message fee;
              the official Cloud API is not integrated yet.
            </p>
            <div className="mt-3 flex flex-wrap gap-4">
              <HeroLink href="/onboarding/whatsapp" className="text-sm">
                Compare the two routes
              </HeroLink>
              <HeroLink href="/settings?tab=whatsapp" className="text-sm">
                Configure the gateway
              </HeroLink>
            </div>
          </Card>
        </section>
      </div>
    </OnboardingShell>
  );
}

/** NULL means unlimited throughout the entitlements model. */
function Limit({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium tabular-nums">
        {value === null ? "Unlimited" : value.toLocaleString("en-IN")}
      </dd>
    </div>
  );
}
