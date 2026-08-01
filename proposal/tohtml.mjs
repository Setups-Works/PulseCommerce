import { marked } from "marked";
import { readFileSync, writeFileSync } from "node:fs";

const md = readFileSync("proposal.md", "utf8");
const body = marked.parse(md, { mangle: false, headerIds: false });

/*
 * Styles are inlined on the elements themselves rather than in a stylesheet,
 * because CRM rich-text editors strip <style> blocks on paste but keep inline
 * style attributes. This is what makes copy-paste survive with formatting.
 */
const RULES = [
  [/<h1>/g, '<h1 style="font:600 22px/1.3 Helvetica,Arial,sans-serif;color:#111;margin:32px 0 12px;">'],
  [/<h2>/g, '<h2 style="font:600 17px/1.35 Helvetica,Arial,sans-serif;color:#111;margin:26px 0 10px;">'],
  [/<h3>/g, '<h3 style="font:600 14px/1.4 Helvetica,Arial,sans-serif;color:#111;margin:20px 0 8px;">'],
  [/<p>/g, '<p style="font:400 14px/1.65 Helvetica,Arial,sans-serif;color:#222;margin:0 0 12px;">'],
  [/<li>/g, '<li style="font:400 14px/1.65 Helvetica,Arial,sans-serif;color:#222;margin:0 0 6px;">'],
  [/<ul>/g, '<ul style="margin:0 0 14px;padding-left:22px;">'],
  [/<ol>/g, '<ol style="margin:0 0 14px;padding-left:22px;">'],
  [/<table>/g, '<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;margin:0 0 18px;font:400 13px/1.5 Helvetica,Arial,sans-serif;">'],
  [/<th>/g, '<th style="text-align:left;border-bottom:2px solid #111;padding:8px 10px;font-weight:600;color:#111;">'],
  [/<td>/g, '<td style="border-bottom:1px solid #e3e3e3;padding:8px 10px;color:#222;vertical-align:top;">'],
  [/<hr>/g, '<hr style="border:0;border-top:1px solid #e3e3e3;margin:28px 0;">'],
  [/<blockquote>/g, '<blockquote style="margin:0 0 16px;padding:10px 14px;border-left:3px solid #d0d0d0;background:#fafafa;color:#444;font:400 13px/1.6 Helvetica,Arial,sans-serif;">'],
  [/<code>/g, '<code style="font:400 12px/1.5 Menlo,Consolas,monospace;background:#f4f4f4;padding:1px 5px;border-radius:3px;">'],
  [/<strong>/g, '<strong style="font-weight:600;color:#111;">'],
];

let html = body;
for (const [find, replace] of RULES) html = html.replace(find, replace);
// Right-align the numeric column that markdown marks with ---:
html = html.replace(/<(th|td) style="text-align:right;?/g, '<$1 style="text-align:right;');

writeFileSync(
  "proposal-for-crm.html",
  `<div style="max-width:760px;font:400 14px/1.65 Helvetica,Arial,sans-serif;color:#222;">\n${html}\n</div>\n`,
);
console.log("wrote proposal-for-crm.html");
