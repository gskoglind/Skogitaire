# Skogitaire

Solitaire in the browser: **Klondike, FreeCell, Golf and Spider**, on tables from places in
Gary's life — **Japan, Sydney, Bermuda and Savannah**. It's the web port of the Android app
(`~/AndroidStudioProjects/Solitaire`), with the same rules, tables, openings, home touches and
celebrations. No build step, no dependencies, no server code, no network at runtime — just
static files. Live at https://gskoglind.github.io/Skogitaire/.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Markup and styles |
| `js/engine.js` | The rules: deals, moves, hints, statistics, saving |
| `js/layout.js` | Board geometry |
| `js/cardart.js` | Card faces and backs |
| `js/celebration.js` | The bouncing card cascade at a win |
| `js/loc-*.js` | The four tables: surface, scenery, opening, home touch, win |
| `js/app.js` | Screens, board, input, sounds, menus |
| `js/seeded.js` | A seeded random generator for drawings |
| `sounds/*.m4a` | The table sounds, the flute, the horns, the bells |
| `seal.png` | Gary's GS sakura seal |
| `manifest.webmanifest`, `sw.js`, icons | Install as an app, work offline |
| `PORTING.md` | How the location modules plug in |
| `dev/` | Test tools (not needed to run the game) |

## Publishing an update

Push to `main`; GitHub Pages serves the repo root. Then **bump the cache name** at the top of
`sw.js` (`solitaire-v5` → `v6`) whenever any file changes, or installed copies may keep
serving the old files.

## Testing locally

Sounds load over HTTP, so serve the folder rather than opening `index.html` from disk:

    cd Skogitaire-web && python3 -m http.server 8765

Then open http://localhost:8765/. Dev shortcuts (never saved or counted):
`?deal=klondike|freecell|golf|spider`, `?win=1`, and `&table=japan|sydney|bermuda|savannah`.
The rules test runs in macOS's JavaScriptCore shell:

    /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc dev/engine-test.js

## Playing

- **Drag** a card or run, or **double-click/double-tap** it to send it home.
- **Klondike:** click the stock to draw; Draw 1 / Draw 3 in the top bar.
- **FreeCell:** four free cells; runs move as far as your free space allows.
- **Golf:** tap a column's bottom card to play it one rank up or down; nine holes, par 36.
- **Spider:** two decks; 1 / 2 / 4 suits for the next deal; finished runs go home by themselves.
- **Hint** shows a good move; the same move left untaken for three turns lights up by itself.
- **Auto-Finish** appears when the rest plays itself.
- **Table** (start screen or game menu) switches between Japan, Sydney, Bermuda and Savannah.
- Keys: `N` new game, `U` undo, `H` hint, `F` auto-finish.

Your game in progress and your statistics are kept in this browser only.
