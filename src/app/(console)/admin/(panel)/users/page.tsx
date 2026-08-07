import { UserTable, UserTableEmpty } from "@/components/admin/user-table";
import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/services/auth-service";
import { can } from "@/lib/auth/rbac";

export const metadata = { title: "Users & roles" };

/**
 * Accounts and their roles.
 *
 * Staff first, then customers, each group oldest first — the list an operator
 * wants is "who works here", with the customer base below it rather than
 * interleaved alphabetically.
 */
export default async function UsersPage() {
  const profile = await requireCapability("users.read");

  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .order("role", { ascending: false })
    .order("created_at", { ascending: true });

  const users = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Users and roles</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Customers use the product and cannot open this panel. Staff roles run from viewer to
          admin. The last active admin cannot be demoted or deactivated — the database refuses it,
          so nobody can lock the deployment out of its own user management.
        </p>
      </div>

      {users.length === 0 ? (
        <UserTableEmpty />
      ) : (
        <UserTable
          users={users}
          canManage={can(profile.role, "users.write")}
          currentUserId={profile.id}
        />
      )}
    </div>
  );
}
