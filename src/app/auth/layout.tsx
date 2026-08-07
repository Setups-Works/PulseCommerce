import "@/app/heroui.css";

/**
 * The auth screens run on HeroUI, like every other signed-in surface.
 *
 * Magic UI and shadcn are scoped to the public marketing pages; everything a
 * customer sees after they start signing up is HeroUI. Importing the
 * stylesheet here rather than at the root keeps it off the landing page, and
 * `.heroui-scope` is what stops HeroUI's token vocabulary colliding with
 * shadcn's — the long version is at the top of app/heroui.css.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="heroui-scope bg-background text-foreground">{children}</div>;
}
