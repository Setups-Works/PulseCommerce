import { createInterface } from "node:readline/promises";

/** A real side effect is behind every call site of this — a broadcast, a full resync, a test send. */
export async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${message} [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}
