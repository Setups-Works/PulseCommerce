#!/usr/bin/env bash
#
# Renders instagram.html to ten 1080x1080 PNGs.
#
#   ./build-instagram.sh
#
# Captured per post at its own size rather than printed to PDF, for the same
# reason the deck is: the renderer ignores @page and falls back to Letter, which
# would reflow square posts into portrait pages.

set -euo pipefail

cd "$(dirname "$0")"

BROWSE="${BROWSE:-$HOME/.claude/skills/gstack/browse/dist/browse}"
[ -x "$BROWSE" ] || { echo "browse binary not found at $BROWSE" >&2; exit 1; }

# Absolute: browse resolves a relative path against its own sandbox, not ours.
OUT="$PWD/instagram"
rm -rf "$OUT"; mkdir -p "$OUT"

"$BROWSE" viewport 1080x1080 > /dev/null
"$BROWSE" goto "file://$PWD/instagram.html" > /dev/null
sleep 5

count="$("$BROWSE" js "document.querySelectorAll('section.post').length" | tail -1 | tr -dc '0-9')"
[ "${count:-0}" -gt 0 ] || { echo "no posts found — did the page load?" >&2; exit 1; }
echo "→ capturing $count posts"

for i in $(seq 0 $((count - 1))); do
  "$BROWSE" js "(()=>{document.querySelectorAll('section.post')[$i].scrollIntoView({block:'start'});return 1})()" > /dev/null
  "$BROWSE" screenshot "$OUT/post-$(printf '%02d' $((i + 1))).png" --viewport > /dev/null
done

made="$(ls "$OUT"/post-*.png | wc -l | tr -d ' ')"
[ "$made" = "$count" ] || { echo "captured $made of $count" >&2; exit 1; }

# Square or it is not an Instagram post — a wrong viewport silently crops.
python3 - "$OUT" <<'PY'
import glob, sys
from PIL import Image
for f in sorted(glob.glob(f"{sys.argv[1]}/post-*.png")):
    w, h = Image.open(f).size
    if (w, h) != (1080, 1080):
        raise SystemExit(f"{f} is {w}x{h}, expected 1080x1080")
PY

echo "✓ $made posts in $OUT/ at 1080x1080"
