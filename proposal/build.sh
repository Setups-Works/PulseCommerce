#!/usr/bin/env bash
#
# Rebuilds every proposal artefact from proposal.md.
#
#   ./build.sh
#
# Exists because the PDF step is easy to get wrong by hand. It renders twice —
# once plain, once with page numbers — and splices page one of the plain pass
# onto the rest of the numbered one, so the cover carries no page number.
#
# The page list is built by counting, not by sorting filenames. A previous
# version sorted paths with `sort -t- -k2`, which silently shuffled all 28 pages
# because the temporary directory's path contains hyphens. Sorted output looked
# fine in a short path and was wrong in the real one.

set -euo pipefail

cd "$(dirname "$0")"

BROWSE="${BROWSE:-$HOME/.claude/skills/gstack/browse/dist/browse}"
[ -x "$BROWSE" ] || { echo "browse binary not found at $BROWSE" >&2; exit 1; }

# Must live under /private/tmp: the browse sandbox refuses to write anywhere
# else, and macOS mktemp defaults to /var/folders.
WORK="$(mktemp -d /private/tmp/proposal-build.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT

echo "→ text and HTML builds"
node totext.mjs
node tohtml.mjs
node todocument.mjs

echo "→ rendering the proposal PDF"
"$BROWSE" goto "file://$PWD/proposal-document.html" > /dev/null
sleep 4
"$BROWSE" pdf "$WORK/numbered.pdf" --format a4 --print-background --page-numbers > /dev/null
"$BROWSE" pdf "$WORK/plain.pdf"    --format a4 --print-background              > /dev/null

pages="$(pdfinfo "$WORK/numbered.pdf" | awk '/^Pages/{print $2}')"
[ "$pages" -gt 1 ] || { echo "expected more than one page, got $pages" >&2; exit 1; }

# Work inside the temp directory so filenames stay short and hyphen-free.
(
  cd "$WORK"
  pdfseparate -f 1 -l 1        plain.pdf    "cover-%d.pdf"
  pdfseparate -f 2 -l "$pages" numbered.pdf "page-%d.pdf"

  files=(cover-1.pdf)
  for i in $(seq 2 "$pages"); do files+=("page-$i.pdf"); done
  pdfunite "${files[@]}" merged.pdf
)

cp "$WORK/merged.pdf" PulseCommerce-Proposal-NaturesJoy.pdf

echo "→ verifying page order"
first_body="$(pdftotext -f 2 -l 2 PulseCommerce-Proposal-NaturesJoy.pdf - | grep -v '^[[:space:]]*$' | head -1)"
case "$first_body" in
  "Executive summary"*) ;;
  *) echo "page 2 is '$first_body', expected the executive summary — pages are out of order" >&2; exit 1 ;;
esac

echo "✓ PulseCommerce-Proposal-NaturesJoy.pdf ($pages pages)"
