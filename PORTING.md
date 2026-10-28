# Skogitaire web — porting notes

This site is a port of the Android app at `~/AndroidStudioProjects/Solitaire` (Kotlin/Compose),
which is the reference: same rules, numbers, drawings, timings. `LOCATION-BIBLE.md` in that repo
specifies the tables. Plain JavaScript, no build step, no libraries, no network at runtime.

Units: CSS pixels = Android dp, 1:1. Every canvas context handed to a module is already scaled
for `devicePixelRatio`, so draw in CSS px. Time is in seconds.

## Files

| File | Owner | What |
|---|---|---|
| `index.html` | app | Markup, CSS, script tags |
| `js/engine.js` | app | Rules, deals, hints, stats, save (port of `game/*.kt`) |
| `js/layout.js` | app | `BoardLayout` port |
| `js/cardart.js` | app | Card faces/backs (port of `ui/CardArt.kt`) |
| `js/celebration.js` | app | The card cascade; hosts each location's win layer |
| `js/app.js` | app | Screens, board, input, sounds, persistence |
| `js/loc-japan.js` | location | Torii, bamboo, seal petals, sakura win petals |
| `js/loc-sydney.js` | location | Lawn, balcony photo → picnic and runners, fig camp, kookaburra, sign, flying foxes, fireworks |
| `js/loc-bermuda.js` | location | Beach/ocean surface, moon gate, scooters, kites, landing announcement |
| `js/loc-savannah.js` | location | Fountain + walks + visitors, riverboats, river parade, crows, gold-dome back |

## The location module contract

Each `js/loc-<key>.js` is a classic script (no modules) that does:

```js
window.LOCATIONS = window.LOCATIONS || {};
LOCATIONS.sydney = { /* the members below; every one is optional */ };
```

Keys: `japan`, `sydney`, `bermuda`, `savannah`.

### Shared inputs

`layout` is a plain object (port of `BoardLayout`), all CSS px, relative to the board's top-left:

```js
layout.boardWidth, layout.cardWidth, layout.cardHeight, layout.gap,
layout.originX, layout.topRowY, layout.tableauY, layout.contentHeight, layout.columns,
layout.isKlondike, layout.isFreeCell, layout.isGolf, layout.isSpider,
layout.slotX(i)            // left of top-row / column slot i
layout.foundationRect(f)   // {left, top, width, height, cx, cy, bottom} for foundation f (0-based)
layout.stockRect()         // same shape, the stock slot
layout.wasteRect()         // same shape
```

`sceneHeight` = max(board content height, visible board height) — the height of the board area;
scenery sits at its bottom (Compose's `height` parameter in `Torii(layout, height)` etc.).

`rand()` — use `Math.random()`; where Kotlin uses a fixed seed (e.g. `Random(1609)` for Bermuda's
houses) use the small seeded PRNG `SEEDED(seed)` that the app provides globally:
`var r = SEEDED(1609); r.next()` → float in [0,1). (Exact Kotlin sequences need not match.)

`play(name)` — plays a sound by name (see Sounds below). Passed in where needed.

### Members

```js
{
  // Table surface on the GAME screen, drawn every frame if animated, under everything.
  // Return true if drawn; false/absent = the app draws the green felt.
  surface(ctx, w, h, t) -> bool,      animatedSurface: bool,
  // Surface for the start screen and sheets (full window). Absent = same as surface (t=0) or felt.
  menuSurface(ctx, w, h) -> bool,

  // Static scenery at the bottom of the board, in board coordinates. Drawn once per layout
  // change on a canvas of size (layout.boardWidth × sceneHeight). Both variants.
  scenery(ctx, layout, sceneHeight),
  // Animated scenery instead (Sydney): drawn every frame on the same canvas, cleared first.
  // `game` changes with each deal, resume or table switch, so a module can restart its timeline.
  sceneryFrame(ctx, layout, sceneHeight, dt, game),

  // Home touch: a card went to foundation f. Return an Effect in board coordinates, drawn on
  // a board-sized overlay canvas ABOVE the cards. `seal` = {cx, cy, d} (Japan's petal origin).
  homeTouch(layout, f, seal) -> Effect,
  homeSound: 'scooter' | 'boarding' | null | function () -> name,   // Sydney picks a kookaburra take

  // Opening: a fresh deal began (not resume). Full-window coordinates, drawn above the board.
  opening(w, h, play) -> Effect,
  openingSound: name | null,          // played by the app when the opening starts
  openingHoldMs: number,              // app delays the deal by this (Savannah 2400), default 0

  // Win layer over the card cascade. Full-window coordinates.
  win(w, h, play) -> WinLayer,
  winDim: number,                     // black dim alpha behind the cascade (default 0.25; Sydney 0.40)

  // Card back (Savannah). Draw inside the white card body; args as Kotlin drawGoldDomeBack.
  drawBack(ctx, w, h) -> bool,
}
```

```js
Effect   = { step(dt), draw(ctx), done: bool }
WinLayer = { step(dt), drawBehind(ctx) /* optional, under the flying cards */,
             draw(ctx) /* above the cards */, tap(x, y) /* optional, a tap-to-hurry */ }
```

The app owns the fixed 60 Hz stepping, the speed-up (taps multiply dt), and canvas clearing.
Effects must not block input and must be cheap enough for 60 fps on a phone.

### Sounds (names the app knows)

`shuffle, deal, place, win, scooter, boarding, horn_ship, horn_tug, horn_whistle, city_hall,
cabin_chime, flute_open, flute_win, kookaburra_1, kookaburra_2, kookaburra_3`.

## Conventions

- Port drawings faithfully from the Kotlin source: same proportions, colours, timings.
- Compose `Color(0xAARRGGBB)` → CSS `rgba(...)`/hex; `.copy(alpha = a)` → set alpha.
- `drawPath` with Brush gradients → `createLinearGradient`/`createRadialGradient`.
- `graphicsLayer(alpha = a, compositingStrategy = Offscreen)` → draw into an offscreen canvas,
  then `drawImage` it with `globalAlpha = a` (so overlaps don't double up).
- Keep each file self-contained; helpers private inside an IIFE.
