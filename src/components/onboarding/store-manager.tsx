"use client";

import * as React from "react";
import { Alert, Button, Card, Chip, Link as HeroLink, Spinner } from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faLinkSlash, faPlus } from "@fortawesome/free-solid-svg-icons";
import { activateStore, disconnectStore } from "@/services/store-admin-service";
import { BrandMark, BRANDS } from "@/components/marketing/brand-mark";

/**
 * A customer's connected stores.
 *
 * Disconnecting is destructive and irreversible — it deletes the credentials
 * and every cached order — so it asks first. Not a modal: an inline confirm on
 * the row keeps the thing being destroyed visible while the decision is made,
 * which a dialog covering the list does not.
 *
 * The plan's store limit is shown next to the Connect button rather than only
 * appearing as an error after the attempt. A limit a customer discovers by
 * hitting it feels like a bug; one stated up front is a reason to upgrade.
 */

export interface StoreSummary {
  url: string;
  name?: string;
  isActive: boolean;
  updatedAt?: string;
}

export function StoreManager({
  stores,
  limit,
  canConnect,
  limitReason,
}: {
  stores: StoreSummary[];
  limit: number | null;
  canConnect: boolean;
  limitReason?: string;
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "That did not work.");
      else setConfirming(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert status="danger">
          <Alert.Description className="text-sm">{error}</Alert.Description>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {stores.length} connected{limit !== null ? ` of ${limit} on your plan` : ""}
        </p>
        {canConnect ? (
          <HeroLink href="/onboarding" className="flex items-center gap-1.5 text-sm">
            <FontAwesomeIcon icon={faPlus} className="w-3" />
            Connect another store
          </HeroLink>
        ) : (
          <Chip size="sm" color="warning">
            Plan limit reached
          </Chip>
        )}
      </div>

      {!canConnect && limitReason ? (
        <Alert status="warning">
          <Alert.Description className="text-sm">{limitReason}</Alert.Description>
        </Alert>
      ) : null}

      {stores.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted">
            No store connected yet. Every figure in the product comes from your own orders, so
            there is nothing to show until one is.
          </p>
          <div className="mt-4 flex justify-center">
            <HeroLink href="/onboarding" className="text-sm">
              Connect a store
            </HeroLink>
          </div>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {stores.map((store) => (
            <li key={store.url}>
              <Card className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-secondary">
                    <BrandMark icon={BRANDS.woocommerce} className="size-5" brandColor />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{store.name ?? store.url}</p>
                    <p className="truncate text-xs text-muted">{store.url}</p>
                  </div>

                  {store.isActive ? (
                    <Chip size="sm" color="success">
                      <FontAwesomeIcon icon={faCircleCheck} className="w-3" />
                      Active
                    </Chip>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      isDisabled={pending}
                      onPress={() => run(() => activateStore(store.url))}
                    >
                      Make active
                    </Button>
                  )}

                  {confirming === store.url ? null : (
                    <Button
                      size="sm"
                      variant="danger-soft"
                      isDisabled={pending}
                      onPress={() => setConfirming(store.url)}
                    >
                      <FontAwesomeIcon icon={faLinkSlash} className="w-3" />
                      Disconnect
                    </Button>
                  )}
                </div>

                {confirming === store.url ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-danger/40 bg-danger/10 p-3">
                    <p className="min-w-0 flex-1 text-xs">
                      Disconnecting deletes the stored credentials and every cached order for this
                      store. Nothing is changed in WooCommerce itself, and you can reconnect at any
                      time — but the history will be pulled again from scratch.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onPress={() => setConfirming(null)}>
                        Keep it
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        isDisabled={pending}
                        onPress={() => run(() => disconnectStore(store.url))}
                      >
                        {pending ? <Spinner size="sm" /> : null}
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
