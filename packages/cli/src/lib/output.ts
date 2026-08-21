/** Prints as JSON, for scripting — every read command supports `--json`. */
export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

/** A simple two-column key/value table for a single record. */
export function printFields(fields: Record<string, unknown>): void {
  const width = Math.max(...Object.keys(fields).map((k) => k.length));
  for (const [key, value] of Object.entries(fields)) {
    console.log(`${key.padEnd(width)}  ${formatValue(value)}`);
  }
}

/** A row table for a list of same-shaped records. */
export function printTable(rows: Record<string, unknown>[]): void {
  if (rows.length === 0) {
    console.log("(none)");
    return;
  }
  const columns = Object.keys(rows[0]);
  const widths = columns.map((col) =>
    Math.max(col.length, ...rows.map((row) => formatValue(row[col]).length)),
  );

  const line = (cells: string[]) => cells.map((cell, i) => cell.padEnd(widths[i])).join("  ");
  console.log(line(columns));
  console.log(line(widths.map((w) => "-".repeat(w))));
  for (const row of rows) {
    console.log(line(columns.map((col) => formatValue(row[col]))));
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
