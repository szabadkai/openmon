# OPENMON

A tiny GBC-style monster-catching game for the browser. 160×160 pixels,
hand-drawn sprite art, square-wave bleeps, zero runtime dependencies.

**Play:** start the dev server with `npm run dev`, or grab the deployed build
from GitHub Pages (deployed automatically from `main`).

## Controls

| GBC | Keyboard |
|-----|----------|
| D-pad | Arrows / WASD |
| A | Z / Space |
| B | X / Backspace |
| START | Enter |

The on-screen shell buttons work too (touch-friendly).

## Development

```sh
npm install
npm run dev        # vite dev server
npm run build      # LOC check + production build to dist/
npm run check:loc  # enforce the line budget on its own
```

The whole game (index.html + src/**) lives under a **1100-line budget**,
enforced by `scripts/check-loc.mjs` on every build and in CI. If the check
fails, trim code — raising the limit is a last resort.
