"use client";

import * as React from "react";
import {
  Alert,
  Card,
  Chip,
  ListBox,
  ListBoxItem,
  Select,
  SelectPopover,
  SelectTrigger,
  SelectValue,
  Spinner,
  Switch,
} from "@heroui/react";
import { setUserRole, setUserActive } from "@/services/user-admin-service";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type AppRole } from "@/lib/auth/rbac";
import type { Tables } from "@/types/database";

/**
 * Staff and customers, with their roles.
 *
 * The role select and the active switch are the only writes. Both are guarded
 * three deep: this component hides them from non-admins, the server action
 * re-checks, and a database trigger refuses to demote or deactivate the last
 * admin regardless of who asks. The trigger is the one that actually matters —
 * the other two exist to produce a readable error instead of a Postgres one.
 *
 * `currentUserId` is passed so the row for the signed-in admin can disable its
 * own controls. Locking yourself out is a support ticket, and the database
 * only stops you when you are the *last* admin, not merely one of them.
 */

type User = Tables<"users">;

const ROLE_ORDER: AppRole[] = ["customer", "viewer", "support", "editor", "admin"];

export function UserTable({
  users,
  canManage,
  currentUserId,
}: {
  users: User[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "That change did not apply.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert status="danger">
          <Alert.Description className="text-sm">{error}</Alert.Description>
        </Alert>
      ) : null}

      <Card className="divide-y divide-border p-0">
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          return (
            <div key={user.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.full_name ?? user.email}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>

              {!user.is_active ? (
                <Chip size="sm" color="danger">
                  Deactivated
                </Chip>
              ) : null}

              {isSelf ? (
                <Chip size="sm" color="accent">
                  You
                </Chip>
              ) : null}

              <div className="w-40">
                <Select
                  aria-label={`Role for ${user.email}`}
                  selectedKey={user.role}
                  isDisabled={!canManage || pending || isSelf}
                  onSelectionChange={(key) =>
                    run(() => setUserRole(user.id, String(key) as AppRole))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopover>
                    <ListBox>
                      {ROLE_ORDER.map((role) => (
                        <ListBoxItem key={role} id={role} textValue={ROLE_LABELS[role]}>
                          {ROLE_LABELS[role]}
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </SelectPopover>
                </Select>
              </div>

              <Switch
                isSelected={user.is_active}
                isDisabled={!canManage || pending || isSelf}
                onChange={(next) => run(() => setUserActive(user.id, next))}
                className="text-sm"
              >
                Active
              </Switch>
            </div>
          );
        })}
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold">What each role can do</h3>
        <dl className="mt-3 flex flex-col gap-2">
          {ROLE_ORDER.map((role) => (
            <div key={role} className="flex flex-wrap gap-x-3 text-sm">
              <dt className="w-20 shrink-0 font-medium">{ROLE_LABELS[role]}</dt>
              <dd className="min-w-0 flex-1 text-muted">{ROLE_DESCRIPTIONS[role]}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {pending ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Spinner size="sm" />
          Applying…
        </p>
      ) : null}
    </div>
  );
}

export function UserTableEmpty() {
  return (
    <Card className="p-8 text-center">
      <p className="text-sm text-muted">No accounts yet.</p>
    </Card>
  );
}
