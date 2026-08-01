import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * Every mermaid diagram in the README must parse.
 *
 * A mermaid syntax error fails nothing else: the markdown stays valid, the app
 * builds, lint passes, and GitHub simply prints a parse error where the diagram
 * should be. One shipped broken because a label contained a semicolon, which
 * mermaid treats as the end of a statement — caught only when someone looked at
 * the rendered page.
 *
 * Parsed in a real browser with the same library GitHub uses, rather than
 * through a DOM shim, so a pass here means it renders there.
 */

const blocks = [...readFileSync("README.md", "utf8").matchAll(/```mermaid\n([\s\S]*?)```/g)]
  .map((m) => m[1]);

/*
 * The UMD build, not the ESM one. The ESM bundle loads sibling chunks at
 * runtime, which cannot resolve when the script is injected rather than served;
 * mermaid.min.js has everything inlined and simply defines window.mermaid.
 * Read from node_modules so the check has no network dependency in CI.
 */
const MERMAID_UMD = "node_modules/mermaid/dist/mermaid.min.js";

test("the README contains diagrams to check", () => {
  expect(blocks.length).toBeGreaterThan(0);
});

test("every mermaid diagram parses", async ({ page }) => {
  await page.goto("/api-docs");
  await page.addScriptTag({ content: readFileSync(MERMAID_UMD, "utf8") });

  const failures = await page.evaluate(async (diagrams: string[]) => {
    const mermaid = (window as unknown as { mermaid: {
      initialize: (o: unknown) => void;
      parse: (s: string) => Promise<unknown>;
    } }).mermaid;
    mermaid.initialize({ startOnLoad: false });

    const bad: { index: number; kind: string; message: string }[] = [];
    for (let i = 0; i < diagrams.length; i++) {
      try {
        await mermaid.parse(diagrams[i]);
      } catch (error) {
        bad.push({
          index: i + 1,
          kind: diagrams[i].trim().split("\n")[0],
          message: String((error as Error)?.message ?? error).split("\n")[0].slice(0, 160),
        });
      }
    }
    return bad;
  }, blocks);

  expect(
    failures,
    failures.map((f) => `diagram ${f.index} (${f.kind}): ${f.message}`).join("\n"),
  ).toEqual([]);
});
