/**
 * The auth screens.
 *
 * Styling comes from the console root layout, which loads HeroUI's stylesheet
 * and no other. Magic UI and shadcn stop at the public site — see the note in
 * app/(console)/layout.tsx for why the two are kept on separate roots.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
