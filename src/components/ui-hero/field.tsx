"use client";

import * as React from "react";
import { FieldError, Label, Text, TextField } from "react-aria-components";
import { Input, buttonVariants } from "@heroui/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Thin wrappers over HeroUI v3, for the two patterns it does not ship whole.
 *
 * HeroUI v3 is a compound API built on react-aria-components: `Input` is the
 * styled input element and nothing more, so a labelled field is assembled from
 * react-aria's `TextField`, `Label` and `FieldError`. Assembling it in every
 * form is four chances per form to wire the label to the wrong input; doing it
 * once here means every field in the admin panel and the customer screens is
 * labelled, described and error-announced the same way.
 *
 * These live in `components/ui-hero/` rather than `components/ui/` on purpose.
 * That directory is the shadcn/Magic UI set the landing page uses, and mixing
 * the two vocabularies in one folder is how someone eventually imports a
 * HeroUI Button into a marketing page and breaks the theme scope.
 */

export interface FieldProps extends Omit<React.ComponentProps<typeof TextField>, "children"> {
  label: string;
  /** Helper text under the control. */
  description?: string;
  /** Shown instead of the description when validation fails. */
  errorMessage?: string;
  placeholder?: string;
  inputProps?: React.ComponentProps<typeof Input>;
}

export function Field({
  label,
  description,
  errorMessage,
  placeholder,
  inputProps,
  className,
  ...props
}: FieldProps) {
  return (
    <TextField {...props} className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <Input placeholder={placeholder} {...inputProps} />
      {description ? (
        <Text slot="description" className="text-xs text-muted">
          {description}
        </Text>
      ) : null}
      {/* react-aria only renders this when the field is invalid, and wires it
          to the input with aria-describedby — which is why the error lives
          here rather than as a sibling paragraph. */}
      <FieldError className="text-xs text-danger">{errorMessage}</FieldError>
    </TextField>
  );
}

/**
 * A link that looks like a HeroUI button.
 *
 * HeroUI v3's Button has no `as` or `asChild` escape hatch, so a navigation
 * control cannot be a Button without nesting an anchor inside one — which is
 * invalid HTML and loses keyboard behaviour. Applying the same variant classes
 * to a real `next/link` keeps the markup correct and the styling identical,
 * because both read from `buttonVariants`.
 */
export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: "primary" | "secondary" | "tertiary" | "ghost" | "outline" | "danger" | "danger-soft";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      {children}
    </Link>
  );
}
