# OPENMON

A tiny GBC-style monster-catching quest for the browser. 160×160 pixels,
hand-drawn sprite art, square-wave bleeps, zero runtime dependencies.

**Play:** start the dev server with `npm run dev`, or grab the deployed build
from GitHub Pages (deployed automatically from `main`).

## The quest

The shrine's glow has faded. Across a 90×70-tile world — Oakvale village, the
Shrine Highlands, the West Deepwood, the Crag Caves, and the Isle of Mist —
every region is gated a different way:

| Region | Gate |
|--------|------|
| Shrine Highlands | **Dialogue** — the pass guard wants proof: 3 catches |
| West Deepwood | **Skill** — CUT (granted by the Elder) clears the stumps |
| Crag Caves | **Fight** — beat Ranger ILEX to earn SMASH for the rocks |
| Isle of Mist | **Creature + skill** — show the hermit a WATER mon, then SWIM the fords |
| The Spire | **Fight** — NOX, Keeper of Shadow, guards the ending |

Catches join your six-mon team. Battles grant EXP; mons level, evolve
(EMBIT→EMBLAZE, SPRIGBY→SPRIGOAK, DRIPPA→DRIPTIDE, ROCKO→ROCKLOPS), and step
in automatically when the leader faints. Trainer battles forbid catching and
running. Nap at any hut door to heal the team and set your respawn camp.
Progress auto-saves to localStorage on every step.

## Controls

| GBC | Keyboard |
|-----|----------|
| D-pad | Arrows / WASD |
| A (talk/cut/smash/confirm) | Z / Space |
| B (cancel) | X / Backspace |
| START (team menu) | Enter |

The on-screen shell buttons work too (touch-friendly). **M** or SELECT toggles sound.

## Sound

All audio is synthesized live in WebAudio, mirroring the Game Boy's 4-channel
APU: two pulse waves with real duty cycles (12.5/25/50%, built as Fourier
series), a triangle "wave" channel for bass, and 15-bit LFSR noise for drums —
no samples, no files. A tiny sequencer plays 11 tracks: per-region themes
(title, village, meadows, highlands, deepwood, crag, isle), three battle themes
(wild / trainer / boss), and a victory fanfare, plus a full SFX kit (text
ticks, ball throw, level-up, evolution, cut/smash, hits) on the same channels.

## Development

```sh
npm install
npm run dev        # vite dev server
npm run build      # LOC check + production build to dist/
npm run check:loc  # enforce the line budget on its own
```

The whole game (index.html + src/**) lives under a **1500-line budget**,
enforced by `scripts/check-loc.mjs` on every build and in CI. If the check
fails, trim code — raising the limit is a last resort. The 90×70 map is
emitted and gate-verified by a generator (staged flood-fills prove each
region stays sealed until its gate opens).
