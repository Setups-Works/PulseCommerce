"use client";

import { Loader2, Package, Search, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";

export interface PickedProduct {
  id: number;
  name: string;
  url: string;
  image: string;
  category: string;
  price: string;
}

/**
 * Searches the store catalogue and returns one product.
 *
 * Reads the cached snapshot rather than WooCommerce, so typing costs nothing
 * upstream. Results are ordered by sales, which makes the empty query useful on
 * its own — opening the picker shows what actually sells rather than whatever
 * was added last.
 */
export function ProductPicker({
  selected,
  onSelect,
  disabled,
}: {
  selected: PickedProduct | null;
  onSelect: (product: PickedProduct | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/products?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const body = await res.json();
      setResults(res.ok ? (body.products ?? []) : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void search(query), 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [open, query, search]);

  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-2">
        {selected.image ? (
          <Image
            unoptimized
            src={selected.image}
            alt=""
            width={40}
            height={40}
            className="size-10 shrink-0 rounded object-cover"
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
            <Package className="size-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{selected.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {selected.category || "Uncategorised"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onSelect(null)}
          isDisabled={disabled}
          className="shrink-0"
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        isDisabled={disabled}
        className="gap-1.5"
      >
        <Search className="size-4" />
        Pick a product
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border p-2">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, SKU or category…"
          autoFocus
        />
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto">
        {loading ? (
          <p className="flex items-center gap-1.5 p-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Searching…
          </p>
        ) : results.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">
            {query ? `Nothing in the catalogue matches “${query}”.` : "No products found."}
          </p>
        ) : (
          results.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => {
                onSelect(product);
                setOpen(false);
                setQuery("");
              }}
              className="flex w-full items-center gap-2 rounded p-1.5 text-left hover:bg-muted"
            >
              {product.image ? (
                <Image
                  unoptimized
                  src={product.image}
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted">
                  <Package className="size-3.5 text-muted-foreground" />
                </div>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs">{product.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {product.category || "Uncategorised"}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
