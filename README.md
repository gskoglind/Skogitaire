# Klondike Solitaire

A single-page solitaire game. No build step, no dependencies, no server code —
just static files.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole game: markup, styles, logic, sounds. |
| `manifest.webmanifest` | Makes Chrome offer to install it as an app. |
| `sw.js` | Service worker — caches everything so it works offline. |
| `icon-192.png`, `icon-512.png` | App icons. |
| `icon-maskable-512.png` | Android's round/squircle icon crop. |
| `apple-touch-icon.png` | iOS home-screen icon. |

Keep all seven in the same folder. Nothing else is required.

## Publishing to GitHub Pages

1. Create a repository — `solitaire` is fine.
2. Upload all seven files to the root of the repo.
3. Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. A minute later it's live at `https://<username>.github.io/solitaire/`.

The service worker needs HTTPS, which GitHub Pages gives you automatically.
Opening `index.html` straight off disk still plays fine — you just don't get
offline caching or the install prompt.

## Publishing an update

Replace `index.html`, then **bump the cache name** at the top of `sw.js`:

```js
const CACHE = 'solitaire-v3';   // was v2
```

Without that, browsers that already installed it may keep serving the old
copy from cache. The page itself is fetched network-first, so it usually
updates on its own — but bumping the version is what guarantees it.

## Installing it (Chrome on a Mac)

1. Open the link in Chrome.
2. Look at the right-hand end of the address bar for the install icon — a
   small monitor with a downward arrow. Click it, then **Install**.
   (If it isn't there: ⋮ menu → Cast, save and share → Install page as app.)
3. It lands in the Applications folder and can be kept in the Dock.

It then opens in its own window with no address bar or tabs, and keeps
working with no internet connection.

## Playing

- **Drag** a card, or **double-click** it to place it automatically.
- Click the deck to deal three. When it empties, click again to recycle.
- Pause a few seconds and a card **pulses** to show a move you missed.
  The Hint button does it on demand.
- Games start on **Draw 3**. **Draw 1** is always available — switch any time,
  handy for finishing a deal that has stalled. Your choice sticks for the
  sitting; reloading the page starts on Draw 3 again.
- Once the deck is empty and every card is face up, **Auto-Finish** appears
  and plays out the rest. It is deliberately withheld while cards remain in
  the deck, so it never sits there dealing in circles.
- A recycle that cannot produce a single playable card is refused, so the
  deck can't be flipped endlessly for nothing.
- Keys: `N` new game, `U` undo, `H` hint, `F` auto-finish.
