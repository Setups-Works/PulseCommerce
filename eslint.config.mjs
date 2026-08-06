import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      /*
       * An underscore prefix is the conventional way to say "deliberately
       * unused". It matters here because destructuring is how a field is
       * dropped from an object — `({ history: _history, ...rest })` is the
       * clearest way to omit history from a customer record, and flagging it
       * would push the code toward something worse.
       */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    /*
     * Magic UI components, vendored from the registry with
     * `shadcn add https://magicui.design/r/<name>.json`.
     *
     * All four call setState inside an effect, which the React Compiler rules
     * flag. In these cases it is deliberate rather than accidental: each one
     * is deferring work that must not run during render — Math.random for the
     * meteor and grid-cell layouts, which would otherwise differ between the
     * server and the client and produce a hydration mismatch; the resolved
     * theme in MagicCard, which is not knowable until mount; and the typing
     * cursor position, which is driven by a timer.
     *
     * Scoped to these exact paths rather than to components/ui/**, so the
     * rule keeps its teeth over the project's own components. Re-check the
     * list after re-running the registry command — a file that stops needing
     * the exemption should lose it.
     */
    files: [
      "src/components/ui/animated-grid-pattern.tsx",
      "src/components/ui/magic-card.tsx",
      "src/components/ui/meteors.tsx",
      "src/components/ui/typing-animation.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
