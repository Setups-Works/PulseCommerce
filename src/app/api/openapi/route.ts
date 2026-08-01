import { NextResponse } from "next/server";
import { openApiDocument } from "@/lib/openapi";

export const runtime = "nodejs";

/**
 * The OpenAPI description of this API.
 *
 * Public and unauthenticated on purpose: it describes the shape of the API and
 * contains no store data, no credentials and no customer information. Anything
 * it documents still enforces its own access rules.
 */
export function GET() {
  return NextResponse.json(openApiDocument, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
