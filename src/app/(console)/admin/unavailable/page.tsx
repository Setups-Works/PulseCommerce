import type { Metadata } from "next";
import Link from "next/link";

/**
 * Shown when /admin is reached on a deployment with no Supabase project.
 *
 * The product runs without Supabase on purpose — `git clone && npm run dev`
 * has always worked, and the CMS is additive rather than required. But the
 * admin panel genuinely cannot function without it, and redirecting to a login
 * form that can never succeed is a worse answer than saying so.
 *
 * Plain markup rather than HeroUI components: if the environment is
 * half-configured, this page should have as few moving parts as possible.
 */

export const metadata: Metadata = {
  title: "Admin unavailable",
  robots: { index: false, follow: false },
};

const STEPS: [string, string][] = [
  ["Create a project", "Any Supabase project will do. Note its URL and publishable (anon) key."],
  [
    "Set the environment variables",
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, plus SUPABASE_SERVICE_ROLE_KEY for server-side work.",
  ],
  ["Apply the schema", "npx supabase link --project-ref <ref> && npx supabase db push"],
  ["Sign up once", "The first account created becomes the admin. Every later one is a customer."],
];

export default function AdminUnavailablePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-7">
          <h1 className="text-lg font-semibold tracking-tight">The admin panel needs Supabase</h1>
          <p className="mt-2 text-sm text-muted">
            This deployment has no Supabase project configured. The marketing site and the product
            both run without one — they fall back to the content compiled into the build — but the
            CMS has nowhere to read from or write to.
          </p>

          <ol className="mt-6 flex flex-col gap-4">
            {STEPS.map(([title, detail], i) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-0.5 text-xs break-words text-muted">{detail}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-7 flex flex-wrap gap-3 border-t border-border pt-5 text-sm">
            <Link href="/" className="font-medium underline underline-offset-4">
              Back to the site
            </Link>
            <Link href="/dashboard" className="text-muted underline underline-offset-4">
              Open the product
            </Link>
          </div>
        </div>
    </main>
  );
}
