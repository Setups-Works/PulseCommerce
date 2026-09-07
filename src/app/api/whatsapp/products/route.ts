import { NextResponse } from "next/server";
import { requireStore } from "@/lib/auth/tenant";
import { readMostRecentCurrency, readProducts } from "@/lib/woo/mirror";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Catalogue search, for picking the product a campaign is about.
 *
 * Reads the products mirror directly, not the full store snapshot — the
 * picker only ever needs the catalogue, and pulling in the whole order and
 * customer history alongside it (readSnapshot()'s cost, tens to hundreds of
 * MB on a real store) to answer a question about fifty-odd products would be
 * pure waste. Only the fields a message can use are returned — a search box
 * has no business shipping stock levels or ratings to the browser.
 */
export async function GET(request: Request) {
  const resolved = await requireStore(request);
  if (!resolved.ok) return resolved.response;
  const { store } = resolved.value;

  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim().toLowerCase();
  const limit = Math.min(Number(params.get("limit")) || 20, 50);

  try {
    const [products, currency] = await Promise.all([
      readProducts(store.id),
      readMostRecentCurrency(store.id),
    ]);

    const matches = products
      .filter((product) => {
        if (product.status && product.status !== "publish") return false;
        if (!query) return true;
        return (
          product.name.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query) ||
          product.categories?.some((c) => c.name.toLowerCase().includes(query))
        );
      })
      // Best sellers first, so an empty query still opens on something useful.
      .sort((a, b) => (b.total_sales ?? 0) - (a.total_sales ?? 0))
      .slice(0, limit)
      .map((product) => ({
        id: product.id,
        name: product.name,
        url: product.permalink ?? "",
        image: product.images?.[0]?.src ?? "",
        category: product.categories?.[0]?.name ?? "",
        price: product.price ?? "",
        sales: product.total_sales ?? 0,
      }));

    /*
     * Hit on every 250ms-debounced keystroke in the picker. Products don't
     * change often enough to need fresher than a couple of minutes; same
     * private + Vary: Cookie treatment as the other tenant-scoped cached
     * routes.
     */
    return NextResponse.json(
      { products: matches, currency },
      { headers: { "Cache-Control": "private, max-age=120", Vary: "Cookie" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read the catalogue." },
      { status: 500 },
    );
  }
}
