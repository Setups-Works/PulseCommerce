import { NextResponse } from "next/server";
import { isNotConnected } from "@/lib/store/errors";
import { loadSnapshot } from "@/lib/store/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Catalogue search, for picking the product a campaign is about.
 *
 * Served from the cached snapshot rather than WooCommerce, so typing in the
 * picker costs nothing upstream. Only the fields a message can use are
 * returned — a search box has no business shipping stock levels or ratings to
 * the browser.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim().toLowerCase();
  const limit = Math.min(Number(params.get("limit")) || 20, 50);

  try {
    const snapshot = await loadSnapshot();

    const matches = snapshot.products
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

    return NextResponse.json({ products: matches, currency: snapshot.currency });
  } catch (error) {
    if (isNotConnected(error)) {
      return NextResponse.json({ error: error.message, code: "not_connected" }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read the catalogue." },
      { status: 500 },
    );
  }
}
