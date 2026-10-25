/* Bump CACHE when you change the game so browsers pick up the new version. */
const CACHE = 'solitaire-v8';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './seal.png',
  './js/seeded.js',
  './js/engine.js',
  './js/layout.js',
  './js/loc-japan.js',
  './js/loc-sydney.js',
  './js/loc-bermuda.js',
  './js/loc-savannah.js',
  './js/cardart.js',
  './js/celebration.js',
  './js/app.js',
  './sounds/shuffle.m4a',
  './sounds/deal.m4a',
  './sounds/place.m4a',
  './sounds/win.m4a',
  './sounds/scooter.m4a',
  './sounds/boarding.m4a',
  './sounds/horn_ship.m4a',
  './sounds/horn_tug.m4a',
  './sounds/horn_whistle.m4a',
  './sounds/city_hall.m4a',
  './sounds/cabin_chime.m4a',
  './sounds/flute_open.m4a',
  './sounds/flute_win.m4a'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; })
                               .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  /* The page itself: try the network first so updates land as soon as you're online,
     fall back to the cached copy when you aren't. */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
          return res;
        })
        .catch(function () {
          return caches.match('./index.html').then(function (r) { return r || caches.match('./'); });
        })
    );
    return;
  }

  /* The game's code and styles: network first too, so a fix reaches you on the next load;
     the cache is only the offline fallback. Sounds and images: cache first, they rarely change. */
  var code = /\.(js|css|webmanifest)$/.test(new URL(req.url).pathname);
  if (code) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
          return res;
        })
        .catch(function () { return caches.match(req, { ignoreSearch: true }); })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      });
    })
  );
});
