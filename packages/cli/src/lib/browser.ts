import { exec } from "node:child_process";

/** Best-effort only — the URL is always printed regardless, so a failure here is silent. */
export function openBrowser(url: string): void {
  const command =
    process.platform === "darwin"
      ? `open ${JSON.stringify(url)}`
      : process.platform === "win32"
        ? `start "" ${JSON.stringify(url)}`
        : `xdg-open ${JSON.stringify(url)}`;
  exec(command, () => {
    // Nothing to do either way — see the note above.
  });
}
