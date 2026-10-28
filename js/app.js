/*
 * Skogitaire — the app: start screen, game screen, board, input, sounds, persistence, sheets.
 * A port of the Android app's GameViewModel + Compose UI (ui/*.kt). The rules live in engine.js,
 * the geometry in layout.js, the tables in loc-*.js.
 */
(function () {
  'use strict';
  var E = window.Engine, B = E.Board, H = E.Hints, R = E.Records;
  function $(id) { return document.getElementById(id); }

  /** Shown small on the start screen, so we can tell which version a browser is running. */
  var BUILD = 9;
  var gameSerial = 0; // Changes with each deal or resume: Sydney's photo shows again.
  var UNDO_CAP = 300, AUTO_HINT_MOVES = 3, AUTO_COMPLETE_LIMIT = 800;
  var GOLF_HOLES = 9, GOLF_PAR = 4, DOUBLE_TAP_MS = 350, DRAG_PX = 6;
  var TABLES = [['japan', 'Japan'], ['sydney', 'Sydney'], ['bermuda', 'Bermuda'], ['savannah', 'Savannah']];

  // ---------------------------------------------------------------------------------------------
  // Icons (Material paths) and small DOM helpers

  var ICON = {
    undo: 'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z',
    bulb: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
    volOn: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
    volOff: 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z',
    home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    refresh: 'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
    play: 'M8 5v14l11-7z',
    next: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
    chart: 'M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z',
    check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    grid: 'M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z',
    golf: 'M19.5 18a1.5 1.5 0 1 0 0 3 1.5 1.5 0 1 0 0-3zM17 5.92L9 2v18H7v-1.73c-1.79.35-3 .99-3 1.73 0 1.1 3.13 2 7 2s7-.9 7-2c0-.99-2.52-1.8-6-1.97V9.65l5-3.73z',
    columns: 'M10 18h5V5h-5v13zm-6 0h5V5H4v13zM16 5v13h5V5h-5z',
    wand: 'M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-7.63 5.29a.996.996 0 0 0-1.41 0L1.29 18.96a.996.996 0 0 0 0 1.41l2.34 2.34c.39.39 1.02.39 1.41 0L16.7 11.05a.996.996 0 0 0 0-1.41l-2.33-2.35zm-1.03 5.49l-2.12-2.12 2.44-2.44 2.12 2.12-2.44 2.44z',
    book: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z',
    flag: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z',
    table: 'M4 6h16v3H4zm2 3h2v10H6zm10 0h2v10h-2z',
    playc: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z',
    hand: 'M13 1.07V9h7c0-4.08-3.05-7.44-7-7.93zM4 15c0 4.42 3.58 8 8 8s8-3.58 8-8v-4H4v4zm7-13.93C7.05 1.56 4 4.92 4 9h7V1.07z',
    trophy: 'M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z',
    crown: 'M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z',
    chev: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z'
  };
  function svg(name, cls) { return '<svg class="' + (cls || 'i') + '" viewBox="0 0 24 24"><path d="' + ICON[name] + '"/></svg>'; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var VARIANT_ICON = {
    klondike: '<span style="font-size:20px;line-height:1">♠︎</span>', freecell: svg('grid'), golf: svg('golf'), spider: svg('columns')
  };

  // ---------------------------------------------------------------------------------------------
  // Storage (the app's keys, in localStorage)

  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  function parse(s) { try { return JSON.parse(s); } catch (e) { return null; } }

  // ---------------------------------------------------------------------------------------------
  // State

  var S = {
    screen: 'start', board: null, drawMode: 3,
    spiderSuits: [1, 2, 4].indexOf(+load('spiderSuits')) >= 0 ? +load('spiderSuits') : 1,
    dealtSuits: 1, dealOrder: {}, dealtCount: Infinity, dealing: false,
    undo: [], hint: null, autoCand: null, autoCount: 0,
    canAuto: false, autoing: false, almostOffered: false, won: false, winRecorded: false,
    golfHole: 1, golfScores: [],
    location: TABLES.some(function (t) { return t[0] === load('location'); }) ? load('location') : 'japan',
    stats: parse(load('gameStatistics')) || {},
    saved: null, sound: load('soundEnabled') !== 'false',
    hidden: {}, celebration: null, boardFx: [], overlayFx: [], sheet: null
  };
  S.saved = R.loadJson(load('savedGame'));
  var job = 0; // Bumped to cancel a running deal or auto-complete.
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function golfHoleDone() { return !!S.board && B.isGolf(S.board) && S.golfScores.length >= S.golfHole; }
  function golfRoundDone() { return golfHoleDone() && S.golfHole >= GOLF_HOLES; }
  function golfToPar() { return S.golfScores.reduce(function (a, b) { return a + b; }, 0) - GOLF_PAR * S.golfScores.length; }
  function busy() { return S.dealing || S.autoing || S.won || golfHoleDone(); }
  function loc() { return (window.LOCATIONS || {})[S.location] || {}; }

  // ---------------------------------------------------------------------------------------------
  // Sounds — Web Audio, mixed with whatever else is playing. A new instance of a sound cuts off
  // the same sound still ringing.

  var NAMES = ['shuffle', 'deal', 'place', 'win', 'scooter', 'boarding', 'horn_ship', 'horn_tug', 'horn_whistle', 'city_hall', 'cabin_chime', 'flute_open', 'flute_win', 'kookaburra_1', 'kookaburra_2', 'kookaburra_3'];
  var actx = null, buffers = {}, playing = {};
  (function initAudio() {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    actx = new C();
    NAMES.forEach(function (n) {
      fetch('sounds/' + n + '.m4a').then(function (r) { return r.arrayBuffer(); })
        .then(function (b) { return new Promise(function (ok, no) { actx.decodeAudioData(b, ok, no); }); })
        .then(function (buf) { buffers[n] = buf; }).catch(function () { /* offline from file:// — silent */ });
    });
  })();
  function unlockAudio() { if (actx && actx.state === 'suspended') actx.resume(); }
  function play(n) {
    if (!S.sound || !actx || !buffers[n]) return;
    stop(n);
    var src = actx.createBufferSource(), gain = actx.createGain();
    src.buffer = buffers[n];
    gain.gain.value = n.indexOf('flute') === 0 ? 0.8 : 1;
    src.connect(gain); gain.connect(actx.destination);
    src.start();
    playing[n] = src;
    src.onended = function () { if (playing[n] === src) delete playing[n]; };
  }
  function stop(n) { var s = playing[n]; if (s) { try { s.stop(); } catch (e) { /* already done */ } delete playing[n]; } }
  function stopFlute() { stop('flute_open'); stop('flute_win'); }

  // ---------------------------------------------------------------------------------------------
  // Statistics and saving

  function statsKey(v) { return v === 'spider' ? 'spider' + S.dealtSuits : v; }
  function updateStats(key, change) {
    if (S.preview) return;
    S.stats = R.statsUpdating(S.stats, key, change);
    store('gameStatistics', R.statsEmpty(S.stats) ? null : JSON.stringify(S.stats));
  }

  /** Saves the game in progress — never while dealing, never after a win (Golf: until the ninth). */
  function saveGame() {
    var b = S.board;
    if (!b || S.screen !== 'game' || S.dealing || S.preview) return;
    if (B.isGolf(b)) { if (golfRoundDone()) return; } else if (S.won || B.isWon(b)) return;
    var game = { board: b, drawMode: S.drawMode, golfHole: S.golfHole, golfScores: S.golfScores, spiderSuits: S.dealtSuits };
    S.saved = game;
    store('savedGame', R.saveJson(game));
  }
  function clearSave() { if (S.preview) return; S.saved = null; store('savedGame', null); }

  // ---------------------------------------------------------------------------------------------
  // Starting and leaving games

  function resetGameState() {
    S.undo = []; S.hint = null; S.autoCand = null; S.autoCount = 0;
    S.canAuto = false; S.autoing = false; S.almostOffered = false; S.won = false; S.winRecorded = false;
    S.dealtCount = Infinity; S.dealing = false; S.hidden = {}; S.celebration = null;
    S.boardFx = []; S.overlayFx = [];
    stopFlute(); hideAlert();
  }

  /** Deals a fresh game of [v] and counts it as played (in Golf, a fresh round). */
  function newGame(v) {
    S.preview = false;
    S.golfHole = 1; S.golfScores = [];
    if (v === 'spider') S.dealtSuits = S.spiderSuits;
    updateStats(statsKey(v), function (s) { s.played++; return s; });
    deal(v, true);
  }

  /** Golf: on to the next hole of the round. */
  function nextHole() {
    if (!golfHoleDone() || golfRoundDone()) return;
    S.golfHole++;
    deal('golf', false);
  }

  function deal(v, opening) {
    var my = ++job;
    var r = B.deal(v, S.dealtSuits);
    resetGameState();
    gameSerial++;
    S.board = r[0];
    S.dealOrder = {};
    r[1].forEach(function (id, i) { S.dealOrder[id] = i; });
    S.dealtCount = 0; S.dealing = true;
    showScreen('game');
    render();
    (async function () {
      if (opening) {
        var L = loc();
        if (S.location === 'japan') play('flute_open');
        if (L.opening) S.overlayFx.push(L.opening(innerWidth, innerHeight, play));
        if (L.openingSound) play(L.openingSound);
        if (L.openingHoldMs) { await sleep(L.openingHoldMs); if (my !== job) return; }
      }
      play('shuffle');
      await sleep(650); if (my !== job) return;
      var interval = v === 'freecell' ? 34 : 55;
      for (var i = 1; i <= r[1].length; i++) {
        S.dealtCount = i; play('deal'); renderCards();
        await sleep(interval); if (my !== job) return;
      }
      await sleep(v === 'freecell' ? 200 : 220); if (my !== job) return;
      S.dealing = false;
      afterChange(false);
    })();
  }

  function resume() {
    var g = S.saved;
    if (!g) return;
    job++;
    S.preview = false;
    resetGameState();
    S.board = g.board; S.drawMode = g.drawMode;
    S.golfHole = g.golfHole; S.golfScores = g.golfScores.slice();
    S.dealtSuits = g.spiderSuits;
    if (B.isSpider(g.board)) S.spiderSuits = g.spiderSuits;
    S.dealOrder = {};
    gameSerial++;
    showScreen('game');
    afterChange(false);
  }

  function mainMenu() {
    job++;
    stopFlute();
    S.autoing = false;
    saveGame();
    S.celebration = null; S.overlayFx = [];
    hideAlert(); closeSheet();
    showScreen('start');
  }
  function playAgain() { if (S.board) newGame(S.board.variant); }
  function chooseVariant(v) { if (!S.board || v !== S.board.variant) newGame(v); }

  // ---------------------------------------------------------------------------------------------
  // Playing

  function commit(prev, next) {
    S.undo.push(prev);
    if (S.undo.length > UNDO_CAP) S.undo.shift();
    S.board = next;
  }

  function tapStock() {
    var cur = S.board;
    if (!cur || busy()) return;
    var next = B.draw(cur, S.drawMode);
    if (!next) return;
    commit(cur, next);
    play('deal');
    spiderRunHome(cur, next);
    afterChange(true);
  }

  /** A drag- or tap-driven move; false if it isn't legal (the card glides home). */
  function move(from, index, to) {
    var cur = S.board;
    if (!cur || busy()) return false;
    var next = B.move(cur, from, index, to);
    if (!next) return false;
    commit(cur, next);
    play('place');
    // The winning move gets the full celebration instead.
    if (to.k === 'found' && !B.isWon(next)) homeTouch(to.i);
    spiderRunHome(cur, next);
    afterChange(true);
    return true;
  }

  /** Spider: a finished run went up by itself — the home touch plays from its foundation. */
  function spiderRunHome(before, after) {
    if (!B.isSpider(after) || B.isWon(after)) return;
    for (var f = 0; f < after.foundations.length; f++) {
      if (after.foundations[f].length > before.foundations[f].length) { homeTouch(f); return; }
    }
  }

  function homeTouch(f) {
    var L = loc();
    var sound = typeof L.homeSound === 'function' ? L.homeSound() : L.homeSound;
    if (sound) play(sound);
    if (L.homeTouch && layout) S.boardFx.push(L.homeTouch(layout, f, sealCircle()));
  }

  /** Double-tap: send the card to its best home, or — from a free cell — show a hint. */
  function doubleTap(pile, index) {
    var cur = S.board;
    if (!cur || busy()) return;
    var target = B.autoPlaceTarget(cur, pile, index);
    if (target) move(pile, index, target);
    else if (pile.k === 'free') showHint();
  }

  function showHint() {
    if (!S.board || busy()) return;
    var h = H.hint(S.board);
    if (h) { S.hint = h; renderCards(); }
  }

  function undo() {
    if ((busy() && !S.won) || golfHoleDone()) return;
    var prev = S.undo.pop();
    if (!prev) return;
    S.board = prev;
    S.won = false; S.celebration = null; S.hidden = {};
    stopFlute();
    S.hint = null; S.autoCand = null; S.autoCount = 0;
    play('deal');
    refreshAuto();
    render();
    saveGame();
  }

  function afterChange(playerMove) {
    var cur = S.board;
    if (!cur) return;
    S.hint = null;
    if (B.isGolf(cur) && B.golfHoleOver(cur) && !S.dealing) { finishHole(cur); render(); saveGame(); return; }
    if (B.isWon(cur)) { win(); render(); return; }
    refreshAuto();
    if (playerMove) trackAutoHint(cur);
    render();
    saveGame();
  }

  /** The automatic hint: the same obvious move surviving three player moves gets highlighted. */
  function trackAutoHint(cur) {
    var obvious = H.obviousMove(cur);
    if (!obvious || !H.equal(obvious, S.autoCand)) { S.autoCand = obvious; S.autoCount = 0; return; }
    S.autoCount++;
    if (S.autoCount >= AUTO_HINT_MOVES) { S.hint = obvious; S.autoCount = 0; }
  }

  function refreshAuto() {
    var cur = S.board;
    S.canAuto = !!cur && !S.dealing && !S.won && B.canAutoComplete(cur);
    if (S.canAuto && !S.almostOffered && !S.autoing) {
      S.almostOffered = true;
      showAlert('Almost solved!', 'This game is already won. Want me to play the remaining moves and run the winning animation?', [
        { label: 'Keep Playing', fn: hideAlert },
        { label: 'Finish It', fn: function () { hideAlert(); autoComplete(); } }
      ]);
    }
  }

  /** Plays the rest home: 90 ms apart, not individually undoable. */
  function autoComplete() {
    if (!S.canAuto || busy()) return;
    S.autoing = true; S.canAuto = false; S.hint = null;
    var my = ++job;
    render();
    (async function () {
      for (var steps = 0; steps < AUTO_COMPLETE_LIMIT; steps++) {
        var next = S.board && B.autoCompleteStep(S.board);
        if (!next) break;
        S.board = next; play('place'); renderCards();
        if (B.isWon(next)) break;
        await sleep(90); if (my !== job) return;
      }
      S.autoing = false;
      afterChange(false);
    })();
  }

  function win() {
    var cur = S.board;
    S.won = true; S.canAuto = false;
    play('win');
    setTimeout(function () { if (S.won && S.location === 'japan') play('flute_win'); }, 900);
    if (!S.winRecorded) {
      S.winRecorded = true;
      updateStats(statsKey(cur.variant), function (s) { return R.recordingWin(s, cur.moves); });
    }
    clearSave();
    startCelebration(true);
  }

  /** Golf: the hole's strokes go on the card once; a cleared table gets the celebration. */
  function finishHole(cur) {
    S.canAuto = false;
    if (S.golfScores.length < S.golfHole) {
      S.golfScores = S.golfScores.concat([B.golfStrokes(cur)]);
      if (B.isWon(cur)) updateStats('golf', function (s) { s.won++; return s; });
      if (golfRoundDone()) {
        var total = S.golfScores.reduce(function (a, b) { return a + b; }, 0);
        updateStats('golf', function (s) { s.bestWins = s.bestWins.concat([total]).sort(function (a, b) { return a - b; }).slice(0, 10); return s; });
      }
      if (B.isWon(cur)) play('win');
    }
    S.won = B.isWon(cur);
    if (S.won && !S.celebration) startCelebration(false);
    if (golfRoundDone()) clearSave();
  }

  function startCelebration(withPanel) {
    if (!layout) return;
    var r = $('board').getBoundingClientRect();
    S.celebration = new Celebration(S.board, layout, { x: r.left, y: r.top }, innerWidth, innerHeight, S.location, play, function (ids) {
      S.hidden = Object.assign({}, ids); renderCards();
    });
    S.celebrationPanel = withPanel;
  }

  // ---------------------------------------------------------------------------------------------
  // Settings

  function toggleSound() {
    S.sound = !S.sound;
    if (!S.sound) Object.keys(playing).forEach(stop);
    store('soundEnabled', S.sound ? 'true' : 'false');
    renderTopBar();
  }
  function chooseLocation(key) {
    if (key === S.location) return;
    S.location = key;
    if (key !== 'japan') stopFlute();
    store('location', key);
    sceneKey = null;
    renderAll();
  }
  function chooseDrawMode(m) { S.drawMode = m; renderTopBar(); }
  function chooseSpiderSuits(n) { S.spiderSuits = n; store('spiderSuits', String(n)); renderTopBar(); }

  // ---------------------------------------------------------------------------------------------
  // Screens

  function showScreen(name) {
    S.screen = name;
    $('start').classList.toggle('hidden', name !== 'start');
    $('game').classList.toggle('hidden', name !== 'game');
    renderAll();
  }

  function renderAll() {
    drawSurface(0);
    if (S.screen === 'start') renderStart(); else render();
    if (S.sheet) openSheet(S.sheet);
  }

  /** The felt: a radial gradient from the centre — or the table's own surface. */
  function drawSurface(t) {
    var c = $('surface'), w = innerWidth, h = innerHeight, dpr = devicePixelRatio || 1;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.width = w + 'px'; c.style.height = h + 'px';
    }
    var ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    paintSurface(ctx, w, h, t, S.screen === 'game');
  }
  function paintSurface(ctx, w, h, t, game) {
    var L = loc(), done = false;
    if (game && L.surface) done = L.surface(ctx, w, h, t);
    else if (!game && L.menuSurface) done = L.menuSurface(ctx, w, h);
    else if (!game && L.surface && !L.animatedSurface) done = L.surface(ctx, w, h, 0);
    if (done) return;
    var g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 900);
    g.addColorStop(0, 'rgb(41,128,77)'); g.addColorStop(0.5, 'rgb(13,77,43)'); g.addColorStop(1, 'rgb(5,51,28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  // ---- Start screen

  function renderStart() {
    var logo = $('logo');
    logo.innerHTML = '';
    [-12, 0, 12].forEach(function (angle, i) {
      var cv = el('canvas'), dpr = devicePixelRatio || 1;
      cv.width = 54 * dpr; cv.height = 76 * dpr;
      cv.style.transform = 'translate(' + (i - 1) * 26 + 'px,' + (i === 1 ? -4 : 2) + 'px) rotate(' + angle + 'deg)';
      var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
      CardArt.drawBack(ctx, 54, 76, S.location);
      logo.appendChild(cv);
    });
    var cards = $('cards');
    cards.innerHTML = '';
    function gameCard(cls, icon, title, sub, fn) {
      var b = el('button', 'gamecard' + (cls ? ' ' + cls : ''),
        '<div class="ic">' + icon + '</div><div class="tx"><div class="t">' + esc(title) + '</div><div class="s">' + esc(sub) + '</div></div>' + svg('chev', 'i chev'));
      b.onclick = fn;
      cards.appendChild(b);
    }
    var g = S.saved;
    if (g) {
      gameCard('red', svg('play'), 'Continue',
        B.isGolf(g.board) ? 'Golf · Hole ' + g.golfHole + ' of ' + GOLF_HOLES : E.VARIANTS[g.board.variant].title + ' · ' + g.board.moves + ' moves so far', resume);
    }
    gameCard('', VARIANT_ICON.klondike, 'Klondike', 'The classic: draw from the stock and build the foundations.', function () { newGame('klondike'); });
    gameCard('', VARIANT_ICON.freecell, 'FreeCell', 'Every card dealt face up — plan your moves with four free cells.', function () { newGame('freecell'); });
    gameCard('', VARIANT_ICON.golf, 'Golf', 'Nine holes: clear the columns one card up or down. Lowest score wins.', function () { newGame('golf'); });
    gameCard('', VARIANT_ICON.spider, 'Spider', 'Two decks, ten columns: build King to Ace in one suit to clear them away.', function () { newGame('spider'); });
    var row = $('tables');
    row.innerHTML = '';
    TABLES.forEach(function (t) {
      var b = el('button', t[0] === S.location ? 'on' : '', esc(t[1]));
      b.onclick = function () { chooseLocation(t[0]); };
      row.appendChild(b);
    });
    var sb = $('statsbtn');
    sb.innerHTML = svg('chart') + 'Statistics';
    $('build').textContent = 'Build ' + BUILD;
    sb.onclick = function () { openSheet('stats'); };
  }

  // ---- Top bar

  function bb(icon, label, fn, opts) {
    opts = opts || {};
    var b = el('button', 'bb' + (opts.iconly ? ' iconly' : ''), (icon || '') + '<span class="lbl">' + esc(label) + '</span>');
    b.title = label; b.setAttribute('aria-label', label);
    if (opts.color) b.style.background = opts.color;
    if (opts.disabled) b.disabled = true;
    b.onclick = fn;
    return b;
  }
  function seg(options, value, label, describe, fn) {
    var s = el('div', 'seg');
    options.forEach(function (m) {
      var b = el('button', m === value ? 'on' : '', esc(label(m)));
      b.setAttribute('aria-label', describe(m));
      b.onclick = function () { fn(m); };
      s.appendChild(b);
    });
    return s;
  }

  function renderTopBar() {
    var bar = $('topbar'), b = S.board;
    if (!b) return;
    var labels = innerWidth > innerHeight || innerWidth >= 700;
    document.body.classList.toggle('labels', labels);
    bar.innerHTML = '';
    var menuBtn = bb(VARIANT_ICON[b.variant], E.VARIANTS[b.variant].title, function () { openMenu(menuBtn); }, { disabled: S.dealing });
    bar.appendChild(menuBtn);
    bar.appendChild(bb(svg('undo'), 'Undo', undo, { disabled: !S.undo.length || busy() }));
    if (B.isKlondike(b)) {
      bar.appendChild(seg([1, 3], S.drawMode, function (m) { return labels ? 'Draw ' + m : String(m); }, function (m) { return 'Draw ' + m; }, chooseDrawMode));
    }
    if (B.isSpider(b)) {
      bar.appendChild(seg([1, 2, 4], S.spiderSuits, function (m) { return labels ? m + (m === 1 ? ' Suit' : ' Suits') : String(m); },
        function (m) { return m + (m === 1 ? ' suit' : ' suits') + ' next deal'; }, chooseSpiderSuits));
    }
    var status = el('div');
    status.id = 'status';
    status.textContent = B.isGolf(b) ? 'Hole ' + S.golfHole + ' of ' + GOLF_HOLES + ' · ' + toParLabel(golfToPar()) : 'Moves: ' + b.moves;
    bar.appendChild(status);
    if (S.canAuto && !busy()) bar.appendChild(bb(svg('wand'), 'Auto-Finish', autoComplete, { iconly: true }));
    bar.appendChild(bb(svg('bulb'), 'Hint', showHint, { disabled: busy() }));
    bar.appendChild(bb(svg(S.sound ? 'volOn' : 'volOff'), S.sound ? 'Sound On' : 'Sound Off', toggleSound, { iconly: true }));
  }

  // ---- Menu

  function openMenu(anchor) {
    var m = $('menu'), scrim = $('scrim');
    m.innerHTML = '';
    function item(checked, label, fn, icon) {
      var it = el('div', 'it', '<span class="ck">' + (icon ? svg(icon) : checked ? svg('check') : '') + '</span>' + esc(label));
      it.onclick = function () { closeMenu(); fn(); };
      m.appendChild(it);
    }
    E.ORDER.forEach(function (v) { item(S.board && S.board.variant === v, E.VARIANTS[v].title, function () { chooseVariant(v); }); });
    m.appendChild(el('hr'));
    TABLES.forEach(function (t) { item(t[0] === S.location, 'Table: ' + t[1], function () { chooseLocation(t[0]); }); });
    m.appendChild(el('hr'));
    item(false, 'How to Play', function () { openSheet('howto'); }, 'book');
    item(false, 'Main Menu', mainMenu, 'home');
    var r = anchor.getBoundingClientRect();
    m.style.left = Math.max(8, r.left) + 'px';
    m.style.top = (r.bottom + 4) + 'px';
    m.style.display = 'block';
    m.style.maxHeight = (innerHeight - r.bottom - 12) + 'px';
    m.style.overflowY = 'auto';
    scrim.style.display = 'block';
    scrim.onclick = closeMenu;
  }
  function closeMenu() { $('menu').style.display = 'none'; $('scrim').style.display = 'none'; }

  // ---------------------------------------------------------------------------------------------
  // The board

  var layout = null, placements = [], cardEls = {}, sceneKey = null;
  var drag = null, returning = {}, lastTap = null, down = null;

  function render() {
    if (S.screen !== 'game' || !S.board) return;
    renderTopBar();
    renderBoard();
    renderPanels();
  }

  function renderBoard() {
    var wrap = $('wrap'), board = $('board');
    var w = wrap.clientWidth, h = wrap.clientHeight;
    var landscape = innerWidth > innerHeight;
    document.body.classList.toggle('landscape', landscape);
    layout = new Layout(S.board, w, h, landscape);
    var sceneHeight = Math.max(layout.contentHeight, h);
    layout.sceneHeight = sceneHeight;
    board.style.width = w + 'px';
    board.style.height = sceneHeight + 'px';

    // Scenery, redrawn only when the geometry or the table changes.
    var key = [S.location, S.board.variant, w, Math.round(sceneHeight), Math.round(layout.cardWidth * 10)].join('|');
    var scene = boardCanvas('scene', w, sceneHeight, 0, key !== sceneKey);
    if (key !== sceneKey) {
      sceneKey = key;
      scene.ctx.clearRect(0, 0, w, sceneHeight);
      var L = loc();
      if (L.scenery) L.scenery(scene.ctx, layout, sceneHeight);
    }
    boardCanvas('fx', w, sceneHeight, 15000, false);
    renderSlots(board);
    renderSeal(board);
    renderCards();
  }

  /** A canvas child of the board, sized for the device; [z] its stacking order. */
  function boardCanvas(id, w, h, z, force) {
    var c = $('board-' + id), dpr = devicePixelRatio || 1;
    if (!c) {
      c = el('canvas');
      c.id = 'board-' + id;
      c.style.zIndex = z || 'auto';
      var board = $('board');
      if (id === 'scene') board.insertBefore(c, board.firstChild); else board.appendChild(c);
    }
    if (force || c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      c.style.width = w + 'px'; c.style.height = h + 'px';
    }
    var ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { el: c, ctx: ctx };
  }

  /** Empty-pile placeholders: 7%-white fill, dashed 35%-white border, a faint glyph. */
  function renderSlots(board) {
    var holder = $('slots');
    if (!holder) { holder = el('div'); holder.id = 'slots'; board.insertBefore(holder, $('board-scene').nextSibling); }
    holder.innerHTML = '';
    var b = S.board, piles = [];
    if (B.isFreeCell(b)) [0, 1, 2, 3].forEach(function (i) { piles.push(E.free(i)); });
    else { piles.push(E.STOCK); if (!B.isSpider(b)) piles.push(E.WASTE); }
    if (!B.isGolf(b)) b.foundations.forEach(function (_, i) { piles.push(E.found(i)); });
    for (var c = 0; c < layout.columns; c++) piles.push(E.tab(c));
    var glyphs = ['♥', '♠', '♦', '♣'];
    piles.forEach(function (p) {
      var r = layout.slotRect(p), s = el('div', 'slot');
      s.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;font-size:' + (r.width * 0.42) + 'px';
      if (p.k === 'free') s.innerHTML = '<div class="cellmark"></div>';
      if (p.k === 'found') s.textContent = glyphs[p.i % 4] + '︎';
      if (p.k === 'stock' && !b.stock.length && B.isKlondike(b)) {
        s.innerHTML = '<svg viewBox="0 0 24 24" style="width:45%;fill:rgba(255,255,255,.35)"><path d="' + ICON.refresh + '"/></svg>';
      }
      holder.appendChild(s);
    });
  }

  /**
   * The seal: the spare top-row slot (Klondike's and Golf's third, Spider's second), 80% of a card
   * width; FreeCell's top row is full, so there it lies in the middle of the felt, 1.3 card widths.
   */
  function sealCircle() {
    var L = layout;
    if (!L.isFreeCell) {
      var x = L.slotX(L.isSpider ? 1 : 2);
      return { cx: x + L.cardWidth / 2, cy: L.topRowY + L.cardHeight / 2, d: L.cardWidth * 0.8 };
    }
    return { cx: L.boardWidth / 2, cy: L.tableauY + (L.sceneHeight - L.tableauY) * 0.42, d: L.cardWidth * 1.3 };
  }
  function renderSeal(board) {
    var s = $('seal');
    if (!s) { s = el('div', '', '<img src="seal.png" alt="" draggable="false">'); s.id = 'seal'; s.setAttribute('aria-hidden', 'true'); board.insertBefore(s, $('slots').nextSibling); }
    var c = sealCircle(), d = c.d * 0.96; // Clipped 2% in from the source's edge.
    s.style.cssText = 'left:' + (c.cx - d / 2) + 'px;top:' + (c.cy - d / 2) + 'px;width:' + d + 'px;height:' + d + 'px;box-shadow:0 ' + (d * 0.02) + 'px ' + (d * 0.04) + 'px rgba(0,0,0,.35)';
  }

  function renderCards() {
    if (!layout || !S.board) return;
    var board = $('board');
    layout.board = S.board;
    var fresh = new Layout(S.board, layout.boardWidth, $('wrap').clientHeight, innerWidth > innerHeight);
    // Keep the scenery's geometry unless the cards no longer fit (then re-layout fully).
    if (Math.abs(fresh.cardWidth - layout.cardWidth) > 0.5 || fresh.contentHeight > layout.sceneHeight) { renderBoard(); return; }
    fresh.sceneHeight = layout.sceneHeight; layout = fresh;
    placements = layout.placements(S.dealOrder, S.dealtCount, S.hidden);
    var seen = {}, cw = layout.cardWidth, ch = layout.cardHeight;
    placements.forEach(function (p) {
      var id = E.id(p.card), e = cardEls[id], isNew = false;
      seen[id] = true;
      if (!e) { e = el('div', 'card'); e.dataset.id = id; board.appendChild(e); cardEls[id] = e; isNew = true; }
      e.style.width = cw + 'px'; e.style.height = ch + 'px';
      var bg = 'url(' + CardArt.url(p.card, p.up, cw, S.location) + ')';
      if (e._bg !== bg) { e.style.backgroundImage = bg; e._bg = bg; }
      var dragging = drag && drag.ids[id];
      var x = p.x, y = p.y;
      if (dragging) { x += drag.dx; y += drag.dy; }
      var tf = 'translate(' + x + 'px,' + y + 'px)';
      e.classList.toggle('lifted', !!dragging);
      e.classList.toggle('dealing', !!(p.dealing && S.dealing));
      e.classList.toggle('returning', !!returning[id]);
      e.classList.toggle('hint', !!(S.hint && S.hint.cardId === id));
      e._z = p.z;
      if (isNew) { e.style.transition = 'none'; e.style.transform = tf; void e.offsetWidth; e.style.transition = ''; }
      else if (e.style.transform !== tf) {
        e.style.transform = tf;
        if (!dragging) {
          // Moving cards fly above the rest, then settle to their place in the stack. A timer,
          // not transitionend: an interrupted move never fires that, and the card stayed on top.
          e.style.zIndex = p.z + 10000;
          clearTimeout(e._settle);
          e._settle = setTimeout(function (card) { card._settle = null; card.style.zIndex = card._z; card.classList.remove('returning'); }, 420, e);
        }
      }
      if (dragging) { clearTimeout(e._settle); e._settle = null; e.style.zIndex = p.z + 20000; }
      else if (!e._settle) e.style.zIndex = p.z;
    });
    Object.keys(cardEls).forEach(function (id) { if (!seen[id]) { cardEls[id].remove(); delete cardEls[id]; } });
    renderPulse();
  }

  function renderPulse() {
    var old = $('pulse');
    if (old) old.remove();
    var h = S.hint;
    if (!h || !layout) return;
    var r = h.isStock ? layout.stockRect() : h.to ? layout.targetRect(h.to) : null;
    if (!r) return;
    var p = el('div', 'pulse');
    p.id = 'pulse';
    p.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
    $('board').appendChild(p);
  }


  // ---- Input: taps, double-taps and drags (6 px threshold)

  function boardPoint(e) { var r = $('board').getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function hitTest(pt) {
    var best = null;
    placements.forEach(function (p) {
      if (pt.x >= p.x && pt.x <= p.x + layout.cardWidth && pt.y >= p.y && pt.y <= p.y + layout.cardHeight) {
        if (!best || p.z > best.z) best = p;
      }
    });
    return best;
  }
  function inside(pt, r) { return pt.x >= r.left && pt.x <= r.right && pt.y >= r.top && pt.y <= r.bottom; }

  function onTap(pt, time) {
    var b = S.board, hit = hitTest(pt);
    if (B.isGolf(b)) {
      // Golf is tap-first: a column top plays onto the waste; the stock turns a card.
      lastTap = null;
      if (hit && hit.pile.k === 'tab') doubleTap(hit.pile, hit.index);
      else if ((hit && (hit.pile.k === 'stock' || hit.pile.k === 'waste')) || inside(pt, layout.stockRect())) tapStock();
      return;
    }
    if ((B.isKlondike(b) || B.isSpider(b)) && ((hit && hit.pile.k === 'stock') || (!hit && inside(pt, layout.stockRect())))) {
      lastTap = null; tapStock(); return;
    }
    if (!hit || !hit.up) return;
    var id = E.id(hit.card);
    if (lastTap && lastTap.id === id && time - lastTap.time <= DOUBLE_TAP_MS) { lastTap = null; doubleTap(hit.pile, hit.index); }
    else lastTap = { id: id, time: time };
  }

  $('board').addEventListener('pointerdown', function (e) {
    unlockAudio();
    if (e.button > 0 || !S.board || S.screen !== 'game') return;
    var pt = boardPoint(e);
    down = { id: e.pointerId, start: pt, hit: hitTest(pt), dragging: false, scroll: false, scroll0: $('wrap').scrollTop, y0: e.clientY };
    try { $('board').setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
  });
  $('board').addEventListener('pointermove', function (e) {
    if (!down || e.pointerId !== down.id) return;
    var pt = boardPoint(e), dx = pt.x - down.start.x, dy = pt.y - down.start.y;
    if (!down.dragging && !down.scroll && Math.hypot(dx, dy) >= DRAG_PX) {
      var hit = down.hit, run = hit && B.pickUp(S.board, hit.pile, hit.index);
      if (!hit || !run || busy()) { down.scroll = !hit; if (!down.scroll) { down = null; return; } }
      else {
        down.dragging = true; lastTap = null; returning = {};
        var ids = {};
        run.forEach(function (c) { ids[E.id(c)] = true; });
        drag = { pile: hit.pile, index: hit.index, ids: ids, dx: 0, dy: 0 };
        S.hint = null;
      }
    }
    if (down.scroll) { $('wrap').scrollTop = down.scroll0 - (e.clientY - down.y0); return; }
    if (down.dragging) { drag.dx = dx; drag.dy = dy; renderCards(); }
  });
  function endPointer(e, cancelled) {
    if (!down || e.pointerId !== down.id) return;
    var d = down;
    down = null;
    if (d.dragging) {
      var pt = boardPoint(e), target = cancelled ? null : layout.dropTarget(pt.x, pt.y, layout.sceneHeight);
      var g = drag;
      drag = null;
      var moved = !!target && move(g.pile, g.index, target);
      returning = moved ? {} : g.ids;
      if (!moved) renderCards();
    } else if (!d.scroll && !cancelled) onTap(d.start, e.timeStamp);
  }
  $('board').addEventListener('pointerup', function (e) { endPointer(e, false); });
  $('board').addEventListener('pointercancel', function (e) { endPointer(e, true); });

  // ---------------------------------------------------------------------------------------------
  // Panels: the win panel and Golf's scorecard

  function renderPanels() {
    var wp = $('winpanel'), gp = $('golfpanel');
    var showWin = S.won && S.celebration && S.celebrationPanel;
    wp.style.display = showWin ? 'flex' : 'none';
    if (showWin && !wp.childNodes.length) {
      wp.innerHTML = '<h2>You Win! 🎉</h2><div class="row"></div><div class="cap">Tap anywhere to speed things up</div>';
      var row = wp.querySelector('.row');
      row.appendChild(bb(svg('home'), 'Main Menu', mainMenu));
      row.appendChild(bb(svg('refresh'), 'Play Again', playAgain, { color: 'var(--red)' }));
      row.querySelectorAll('.lbl').forEach(function (l) { l.style.display = 'inline'; });
    }
    if (!showWin) wp.innerHTML = '';
    var showGolf = golfHoleDone() && S.screen === 'game';
    gp.style.display = showGolf ? 'flex' : 'none';
    gp.classList.toggle('dimmed', showGolf && !S.won);
    if (showGolf) renderGolfPanel(gp);
    $('tapcatch').style.display = S.celebration ? 'block' : 'none';
  }

  /** Golf's names for a hole against par; strokes can go below zero on a cleared table. */
  function golfTerm(strokes) {
    var d = strokes - GOLF_PAR;
    return ({ 0: 'Par', '-1': 'Birdie', '-2': 'Eagle', '-3': 'Albatross', 1: 'Bogey', 2: 'Double Bogey', 3: 'Triple Bogey' })[d] || (d < 0 ? 'Condor' : '+' + d);
  }
  function toParLabel(n) { return n === 0 ? 'E' : n > 0 ? '+' + n : '−' + (-n); }

  function renderGolfPanel(gp) {
    var strokes = S.golfScores[S.golfHole - 1], done = golfRoundDone();
    var title = done ? 'Round Complete ⛳' : B.isWon(S.board) ? 'Table Cleared! ⛳' : 'Hole ' + S.golfHole;
    var card = '';
    for (var h = 1; h <= GOLF_HOLES; h++) card += '<div class="h">' + h + '</div>';
    for (h = 1; h <= GOLF_HOLES; h++) {
      var s = S.golfScores[h - 1];
      card += '<div class="' + (s == null ? 'n' : s < GOLF_PAR ? 'u' : '') + '">' + (s == null ? '–' : s) + '</div>';
    }
    var total = S.golfScores.reduce(function (a, b) { return a + b; }, 0);
    gp.innerHTML = '<h2>' + title + '</h2>' +
      '<div class="gold">Hole ' + S.golfHole + ': ' + strokes + ' ' + (Math.abs(strokes) === 1 ? 'stroke' : 'strokes') + ' · Par ' + GOLF_PAR + ' — ' + golfTerm(strokes) + '</div>' +
      '<div class="scorecard">' + card + '</div>' +
      '<div style="font-weight:700">' + (done ? 'Total ' + total + ' · Par ' + GOLF_PAR * GOLF_HOLES + ' · ' + toParLabel(golfToPar()) : 'Round so far: ' + toParLabel(golfToPar())) + '</div>' +
      '<div class="row"></div>';
    var row = gp.querySelector('.row');
    row.appendChild(bb(svg('home'), 'Main Menu', mainMenu));
    row.appendChild(done ? bb(svg('refresh'), 'New Round', playAgain, { color: 'var(--red)' }) : bb(svg('next'), 'Next Hole', nextHole, { color: 'var(--red)' }));
    row.querySelectorAll('.lbl').forEach(function (l) { l.style.display = 'inline'; });
  }

  // A full-window catcher under the panels: taps during a celebration speed it up.
  var tapcatch = el('div');
  tapcatch.id = 'tapcatch';
  tapcatch.style.cssText = 'position:fixed;inset:0;z-index:45;display:none';
  tapcatch.addEventListener('pointerdown', function (e) { unlockAudio(); if (S.celebration) S.celebration.hurry(e.clientX, e.clientY); });
  document.body.appendChild(tapcatch);

  // ---------------------------------------------------------------------------------------------
  // Alerts and sheets

  function showAlert(title, text, actions) {
    var a = $('alert');
    a.querySelector('h4').textContent = title;
    a.querySelector('p').textContent = text;
    var acts = a.querySelector('.acts');
    acts.innerHTML = '';
    actions.forEach(function (x) {
      var b = el('button', '', esc(x.label));
      if (x.destructive) b.style.color = '#ff453a';
      b.onclick = x.fn;
      acts.appendChild(b);
    });
    a.style.display = 'flex';
  }
  function hideAlert() { $('alert').style.display = 'none'; }

  var HOWTO = {
    klondike: [
      ['flag', 'The Goal', ['Move all 52 cards to the four foundations, building each suit up from Ace to King.', 'Clear the board to trigger the cascade.']],
      ['table', 'The Table', ['Stock: the face-down draw pile, top left. Waste: the cards you\'ve drawn, face up beside it.', 'Foundations: four piles, top right, built Ace to King by suit.', 'Tableau: seven columns. Only the bottom card of each starts face up.']],
      ['playc', 'How to Play', ['Tap the stock to draw. When it\'s empty, tap again to turn the waste back over.', 'Build the columns down in alternating colors — a red 7 on a black 8.', 'Move single cards or whole face-up runs between columns.', 'Only a King, or a run led by a King, can go into an empty column.', 'Uncovered face-down cards flip over automatically.', 'Send Aces and Twos up to the foundations as soon as they\'re free.']],
      ['hand', 'Controls', ['Drag a card or run to move it.', 'Double-tap a card to send it home — to a foundation if it fits, otherwise to a matching column.', 'Draw 1 / Draw 3 switches how many cards each tap of the stock draws.', 'Hint shows a good move; Undo takes back the last one.', 'Auto-Finish appears once every card is face up.', 'Keys: N new game, U undo, H hint, F Auto-Finish.']],
      ['bulb', 'Tips', ['Uncover face-down cards first — they hold the game.', 'Don\'t rush foundation moves; a low card may still be needed in the columns.', 'Empty columns are gold. Save them for Kings.']]
    ],
    freecell: [
      ['flag', 'The Goal', ['Move all 52 cards to the four foundations, building each suit up from Ace to King.', 'Almost every deal is winnable with the right plan.']],
      ['table', 'The Table', ['Four free cells, top left: each holds one card.', 'Foundations: four piles, top right, built Ace to King by suit.', 'Tableau: eight columns, every card dealt face up.']],
      ['playc', 'How to Play', ['Build the columns down in alternating colors — a red 7 on a black 8.', 'Any single card can go into an empty free cell.', 'Move ordered runs: the number of cards you can move at once is 1 + your empty free cells, doubled for each empty column.', 'Any card or run can go into an empty column.', 'Play cards to the foundations whenever they fit.']],
      ['hand', 'Controls', ['Drag a card or run to move it.', 'Double-tap a card to send it home — to a foundation, then a matching column, then a free cell.', 'Hint shows a good move; Undo takes back the last one.', 'Auto-Finish appears once the rest can all reach the foundations.']],
      ['bulb', 'Tips', ['Keep free cells open — every full one shrinks the runs you can move.', 'Plan ahead before parking a card; it may sit there a long time.', 'Empty columns multiply how long a run you can move.']]
    ],
    golf: [
      ['flag', 'The Goal', ['Clear the seven columns onto the waste pile, using as few strokes as you can.', 'A round is nine holes, a new deal each hole. Par is 4 a hole, 36 for the round. Lowest score wins.']],
      ['table', 'The Table', ['Tableau: seven columns of five cards, all face up.', 'Stock: the face-down pile, top left. Waste: the face-up pile beside it, started with one card from the stock.']],
      ['playc', 'How to Play', ['Play the bottom card of any column onto the waste if it\'s one rank higher or lower — any suit. A 7 goes on a 6 or an 8.', 'Nothing goes on a King, and Kings and Aces don\'t connect.', 'When nothing plays, tap the stock to turn a new card onto the waste. The stock goes through once.', 'The hole ends when the columns are clear, or the stock is out and nothing plays.', 'Your score is the cards left in the columns. Clear them all and you score minus the cards left in the stock.']],
      ['hand', 'Controls', ['Tap a column\'s bottom card to play it. Drag works too.', 'Tap the stock (or the waste) to turn a card.', 'Hint shows a good play; Undo takes back the last one until the hole is over.']],
      ['bulb', 'Tips', ['Look for the longest run before you play — a 5 that leads to 4, 3, 2 beats a lone 6.', 'Kings are dead ends: play them last in a run.', 'Don\'t turn the stock while a play is still on the table.']]
    ],
    spider: [
      ['flag', 'The Goal', ['Build eight runs from King down to Ace, each in a single suit. A finished run goes up to the foundations by itself.', 'Play with 1 suit (relaxing), 2 suits, or all 4 (hard). The 1 | 2 | 4 switch sets the next deal.']],
      ['table', 'The Table', ['Two decks, 104 cards. Tableau: ten columns, 54 cards, only the bottom card of each face up.', 'Stock: the other 50, top left, five deals of ten. Foundations: eight piles across the top.']],
      ['playc', 'How to Play', ['Put any card on a card one rank higher, whatever the suit — a 6 on any 7.', 'Only a run in one suit, descending by one, moves together.', 'Any card or suited run can go into an empty column.', 'Uncovered face-down cards flip over automatically.', 'Tap the stock to deal one card onto every column — not while a column is empty.']],
      ['hand', 'Controls', ['Drag a card or run to move it.', 'Double-tap to send it to the best column — onto the same suit first.', 'Hint shows a good move; Undo takes back the last one.']],
      ['bulb', 'Tips', ['Build in suit whenever you can; mixed runs are stuck together.', 'Uncover face-down cards and empty columns before you deal.', 'An empty column is your best tool — use it to sort runs, then fill it before dealing.']]
    ]
  };

  function openSheet(kind) {
    S.sheet = kind;
    var sh = $('sheet'), body = sh.querySelector('.body');
    var cv = sh.querySelector('canvas'), dpr = devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintSurface(ctx, innerWidth, innerHeight, 0, false);
    sh.querySelector('.head button').onclick = closeSheet;
    body.innerHTML = '';
    if (kind === 'howto') {
      var v = S.board ? S.board.variant : 'klondike';
      sh.querySelector('h3').textContent = 'How to Play · ' + E.VARIANTS[v].title;
      HOWTO[v].forEach(function (sec) {
        var s = el('div', 'sec', '<div class="st">' + svg(sec[0]) + esc(sec[1]) + '</div>');
        sec[2].forEach(function (t) { s.appendChild(el('div', 'bul', esc(t))); });
        body.appendChild(s);
      });
    } else {
      sh.querySelector('h3').textContent = 'Statistics';
      E.ORDER.forEach(function (v) {
        if (v !== 'spider') { body.appendChild(statsSection(v, R.statsGet(S.stats, v), E.VARIANTS[v].title)); return; }
        // Spider by suit count: the ones played, or one empty section.
        var played = [1, 2, 4].filter(function (n) { var s = R.statsGet(S.stats, 'spider' + n); return s.played || s.won; });
        if (!played.length) body.appendChild(statsSection(v, R.statsGet(S.stats, 'spider1'), 'Spider'));
        played.forEach(function (n) { body.appendChild(statsSection(v, R.statsGet(S.stats, 'spider' + n), 'Spider · ' + n + (n === 1 ? ' Suit' : ' Suits'))); });
      });
      if (!R.statsEmpty(S.stats)) {
        var reset = el('button', 'resetbtn', 'Reset Statistics');
        reset.onclick = function () {
          showAlert('Reset all statistics?', 'Games played, wins, and best games for every variant will be erased. This can\'t be undone.', [
            { label: 'Cancel', fn: hideAlert },
            { label: 'Reset', destructive: true, fn: function () { hideAlert(); S.stats = {}; store('gameStatistics', null); openSheet('stats'); } }
          ]);
        };
        body.appendChild(reset);
      }
    }
    sh.style.display = 'flex';
  }
  function closeSheet() { S.sheet = null; $('sheet').style.display = 'none'; }

  function statsSection(v, s, title) {
    var sec = el('div', 'sec');
    sec.appendChild(el('div', 'vtitle', VARIANT_ICON[v] + esc(title)));
    if (!s.played && !s.won) { sec.appendChild(el('div', '', '<span style="color:var(--dim)">No games played yet.</span>')); return sec; }
    function box(l, val) { return '<div class="box"><div class="v">' + esc(val) + '</div><div class="l">' + l + '</div></div>'; }
    var par = GOLF_PAR * GOLF_HOLES;
    if (v === 'golf') {
      sec.appendChild(el('div', 'boxes', box('Rounds', s.played) + box('Cleared', s.won) + box('Best', s.bestWins.length ? toParLabel(s.bestWins[0] - par) : '–')));
    } else {
      sec.appendChild(el('div', 'boxes', box('Played', s.played) + box('Won', s.won) + box('Win Rate', R.winRate(s) + '%')));
    }
    if (s.bestWins.length) {
      sec.appendChild(el('div', 'st', svg('trophy') + (v === 'golf' ? 'Best Rounds' : 'Best Games')));
      s.bestWins.forEach(function (n, i) {
        var label = v === 'golf' ? toParLabel(n - par) + '  (' + n + ')' : n + ' moves';
        sec.appendChild(el('div', 'best', '<span class="n">' + (i + 1) + '.</span>' + esc(label) +
          (i === 0 ? '<svg class="i" viewBox="0 0 24 24" style="fill:var(--yellow);width:18px;height:18px;margin-left:6px"><path d="' + ICON.crown + '"/></svg>' : '')));
      });
    }
    return sec;
  }

  // ---------------------------------------------------------------------------------------------
  // The frame loop: animated surface, home touches, openings, the celebration

  var lastFrame = 0, clock = 0, overlayDirty = false, fxDirty = false;
  function sizeOverlay() {
    var c = $('overlay'), dpr = devicePixelRatio || 1, w = innerWidth, h = innerHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.width = w + 'px'; c.style.height = h + 'px';
    }
    var ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }
  function frame(now) {
    var dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
    lastFrame = now; clock += dt;
    var L = loc();
    if (S.screen === 'game' && L.animatedSurface) drawSurface(clock);
    // Animated scenery (Sydney), behind the cards, in board coordinates.
    var sc = $('board-scene');
    if (S.screen === 'game' && L.sceneryFrame && layout && sc) {
      var sd = devicePixelRatio || 1, sctx = sc.getContext('2d');
      sctx.setTransform(sd, 0, 0, sd, 0, 0);
      sctx.clearRect(0, 0, sc.width / sd, sc.height / sd);
      L.sceneryFrame(sctx, layout, layout.sceneHeight, dt, S.location + ':' + gameSerial);
    }

    // Overlay: openings and the celebration, in window coordinates.
    if (S.celebration || S.overlayFx.length || overlayDirty) {
      var octx = sizeOverlay();
      octx.clearRect(0, 0, innerWidth, innerHeight);
      if (S.celebration) { S.celebration.advance(dt); S.celebration.draw(octx); }
      S.overlayFx.forEach(function (fx) { fx.step(dt); octx.save(); fx.draw(octx); octx.restore(); });
      S.overlayFx = S.overlayFx.filter(function (fx) { return !fx.done; });
      overlayDirty = !!(S.celebration || S.overlayFx.length);
    }
    // Board effects: home touches, in board coordinates, above the cards.
    var fx = $('board-fx');
    if (fx && (S.boardFx.length || fxDirty)) {
      var dpr = devicePixelRatio || 1, ctx = fx.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, fx.width / dpr, fx.height / dpr);
      S.boardFx.forEach(function (e) { e.step(dt); ctx.save(); e.draw(ctx); ctx.restore(); });
      S.boardFx = S.boardFx.filter(function (e) { return !e.done; });
      fxDirty = S.boardFx.length > 0;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------------------------------------------------------------------------------------------
  // Window events

  var resizeTimer = 0;
  addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { sceneKey = null; CardArt.clear(); cardEls = {}; var b = $('board'); b.querySelectorAll('.card').forEach(function (c) { c.remove(); }); renderAll(); }, 120);
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { saveGame(); stopFlute(); } });
  addEventListener('pagehide', saveGame);
  addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || S.screen !== 'game') return;
    var k = e.key.toLowerCase();
    if (k === 'n') playAgain();
    else if (k === 'u') undo();
    else if (k === 'h') showHint();
    else if (k === 'f') autoComplete();
  });
  addEventListener('pointerdown', unlockAudio, { capture: true });

  // Dev hook for automated tests: the state and the current layout.
  window.__skog = { S: S, layout: function () { return layout; }, placements: function () { return placements; } };

  // Dev: ?deal=<variant> deals a game that's never saved or counted (for testing).
  var q = new URLSearchParams(location.search);
  if (q.get('table')) chooseLocation(q.get('table'));
  if (q.get('deal') && E.VARIANTS[q.get('deal')]) { S.preview = true; S.golfHole = 1; S.golfScores = []; S.dealtSuits = S.spiderSuits; deal(q.get('deal'), true); }
  else if (q.get('win')) {
    // Dev: ?win=1 shows the table's celebration over a finished Klondike board, never recorded.
    S.preview = true;
    S.board = E.makeBoard('klondike', { foundations: [0, 1, 2, 3].map(function (s) { var p = []; for (var r = 1; r <= 13; r++) p.push(E.card(s, r, true)); return p; }) });
    showScreen('game');
    S.won = true; play('win'); startCelebration(true); render();
  } else showScreen('start');

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
})();
