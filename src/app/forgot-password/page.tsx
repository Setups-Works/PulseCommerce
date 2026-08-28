import { Activity } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Reset your password · PulseCommerce" };

export default function Page() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Activity className="size-5" strokeWidth={2.5} />
        </span>
        <span className="text-base font-semibold tracking-tight">PulseCommerce</span>
      </Link>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">Reset your password</CardTitle>
          <CardDescription className="text-xs">
            We&apos;ll email you a link to set a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
