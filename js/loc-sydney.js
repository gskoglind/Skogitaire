/*
 * Sydney (LOCATION-BIBLE §5). Port of Sydney.kt: the Botanic Garden lawn; Gary's balcony photo of
 * his dad and the kookaburra for the first 15 s of each game, then the lawn scrolls to a family
 * picnic and runners; the fig boughs with their sleeping flying-fox camp; the laughing kookaburra;
 * the "Please walk on the grass" sign; a flying fox off the camp per card home; and the fireworks
 * engine (opening show with its dusk wash, and the win show).
 */
(function () {
  'use strict';
  var PI = Math.PI;

  // ---------------------------------------------------------------- helpers

  function dprOf(ctx) {
    var t = ctx.getTransform ? ctx.getTransform() : null;
    return t && t.a ? Math.abs(t.a) : (window.devicePixelRatio || 1);
  }

  /** graphicsLayer(alpha, Offscreen): draw fn(c, w, h) into an offscreen canvas, then composite. */
  function layer(ctx, x, y, w, h, alpha, fn) {
    if (w <= 0 || h <= 0) return;
    var s = dprOf(ctx);
    var off = document.createElement('canvas');
    off.width = Math.max(1, Math.ceil(w * s));
    off.height = Math.max(1, Math.ceil(h * s));
    var c = off.getContext('2d');
    c.setTransform(s, 0, 0, s, 0, 0);
    fn(c, w, h);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.drawImage(off, x, y, w, h);
    ctx.restore();
  }

  function hex(h) {
    return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function range(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // ---------------------------------------------------------------- the lawn

  /** The Royal Botanic Garden's lawn: radial greens with broad faint mowing stripes. */
  function drawLawn(ctx, w, h) {
    var cx = w / 2, cy = h / 2;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 900);
    g.addColorStop(0, '#4C9A3F');
    g.addColorStop(0.5, '#2E6E2C');
    g.addColorStop(1, '#183F1A');
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    var stripe = 70, reach = w + h;
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(-20 * PI / 180);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    var light = true;
    for (var x = -reach; x < reach; x += stripe) {
      if (light) ctx.fillRect(x, -reach, stripe, 2 * reach);
      light = !light;
    }
    ctx.restore();
    return true;
  }

  // ---------------------------------------------------------------- the scene (animated)
  //
  // Gary's balcony photo for the first 15 s of each game; then, over 5 s, it scrolls down and fades,
  // the sign comes down to the bottom, and a family picnic and runners scroll in from above. The
  // fig boughs with their sleeping flying-fox camp stay all game, and a kookaburra laughs with each
  // call, first on the bough, then on the picnic basket. All behind the cards.

  function now() { return performance.now() / 1000; }
  var HOLD = 15, SCROLL = 5;

  /** Where the balcony photo sits: 80% of the board's width, ≤ 60% of its height, bottom-centred. */
  function balconyRect(layout, height) {
    var aspect = 0.75; // The photo is 1600 × 1200.
    var w = Math.min(layout.boardWidth * 0.80, height * 0.60 / aspect);
    var h = w * aspect;
    return { left: (layout.boardWidth - w) / 2, top: height - h, width: w, height: h };
  }
  function sleeperLength(layout) { return Math.max(16, layout.cardWidth * 0.40); }
  /** Two fig boughs reaching in from the edges above the photo's corners; side −1 left, +1 right. */
  function figs(layout, height) {
    var w = Math.min(layout.boardWidth * 0.34, 240);
    var y = balconyRect(layout, height).top - sleeperLength(layout) * 1.1;
    function fig(x, side) { return { x: x, y: y, w: w, side: side, limbs: [[y, 0.55 * w], [y - 0.10 * w, 0.45 * w]] }; }
    return [fig(0, -1), fig(layout.boardWidth, 1)];
  }
  function lawnScroll(layout, height) { return balconyRect(layout, height).height + 0.75 * figs(layout, height)[0].w; }
  function picnicSpot(layout, height) {
    var u = clamp(layout.boardWidth * 0.13, 52, 110);
    var r = balconyRect(layout, height);
    return { x: layout.boardWidth * 0.5 + 0.75 * u, y: height - r.height * 0.30, u: u };
  }

  /** Compose's FastOutSlowInEasing, cubic-bezier(0.4, 0, 0.2, 1). */
  function fastOutSlowIn(x) {
    var t = x;
    for (var k = 0; k < 8; k++) {
      var bx = 3 * (1 - t) * (1 - t) * t * 0.4 + 3 * (1 - t) * t * t * 0.2 + t * t * t;
      var d = 3 * (1 - t) * (1 - t) * 0.4 + 6 * (1 - t) * t * (0.2 - 0.4) + 3 * t * t * (1 - 0.2);
      if (Math.abs(d) < 1e-6) break;
      t = clamp(t - (bx - x) / d, 0, 1);
    }
    return 3 * (1 - t) * t * t + t * t * t;
  }

  var st = {
    game: null, start: 0, key: '', spots: [], sides: [], away: [],
    laughUntil: 0, lastTake: 0, laugh: 0, t: 0, runners: null, photo: null, photoKey: ''
  };

  var photo = new Image();
  photo.src = 'sydney_balcony.jpg';

  function reveal() { return fastOutSlowIn(clamp((now() - st.start - HOLD) / SCROLL, 0, 1)); }

  /** Rebuild the camp and the runners when the board's geometry changes. */
  function prepare(layout, height) {
    var key = [layout.boardWidth, Math.round(height), Math.round(layout.cardWidth * 10)].join('|');
    if (key === st.key) return;
    st.key = key;
    st.spots = []; st.sides = [];
    figs(layout, height).forEach(function (fig) {
      fig.limbs.forEach(function (l) {
        for (var k = 0; k < 5; k++) {
          var along = l[1] * (0.28 + 0.17 * k);
          st.spots.push({ x: fig.x - fig.side * along, y: l[0] + along * 0.10 }); // Limbs droop a little.
          st.sides.push(fig.side);
        }
      });
    });
    st.away = st.spots.map(function () { return 0; });
    st.runners = [
      { lane: 0, dir: 1, lead: 0, speed: 1, shirt: '#E2574C', shorts: '#26313D', skin: SKIN[0] },
      { lane: 0, dir: 1, lead: 0.5, speed: 1, shirt: '#3C7DC4', shorts: '#26313D', skin: SKIN[2] },
      { lane: 1, dir: -1, lead: 0, speed: 0.85, shirt: '#F2C14E', shorts: '#4A4A4A', skin: SKIN[1] }
    ].map(function (r) { r.x = NaN; r.phase = 0; r.wait = 0; return r; });
  }

  // ---------------------------------------------------------------- the photo

  /** The photo, its top 15% and side 4% faded into the lawn, drawn once per size. */
  function maskedPhoto(ctx, r) {
    var s = dprOf(ctx);
    var key = [Math.round(r.width * s), Math.round(r.height * s)].join('x');
    if (st.photo && st.photoKey === key) return st.photo;
    var off = document.createElement('canvas');
    off.width = Math.max(1, Math.round(r.width * s));
    off.height = Math.max(1, Math.round(r.height * s));
    var c = off.getContext('2d');
    c.imageSmoothingQuality = 'high';
    c.drawImage(photo, 0, 0, off.width, off.height);
    c.globalCompositeOperation = 'destination-in';
    var g = c.createLinearGradient(0, 0, 0, off.height);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.15, '#000'); g.addColorStop(1, '#000');
    c.fillStyle = g; c.fillRect(0, 0, off.width, off.height);
    g = c.createLinearGradient(0, 0, off.width, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.04, '#000'); g.addColorStop(0.96, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, off.width, off.height);
    st.photo = off; st.photoKey = key;
    return off;
  }

  function balconyPhoto(ctx, layout, height, p) {
    if (p >= 1 || !photo.complete || !photo.naturalWidth) return;
    var r = balconyRect(layout, height);
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - p);
    // As it fades it sinks below the bottom of the board, like a slide going down.
    ctx.drawImage(maskedPhoto(ctx, r), r.left, r.top + p * lawnScroll(layout, height), r.width, r.height);
    ctx.restore();
  }

  // ---------------------------------------------------------------- the sign

  /** "Please walk on the grass", above the photo; when the lawn scrolls it comes down and stays. */
  function grassSign(ctx, layout, height, p) {
    var width = clamp(layout.boardWidth * 0.15, 74, 112);
    var post = width * 0.42;
    var boardH = width * 0.64;
    var left = layout.boardWidth * 0.24;
    var top0 = balconyRect(layout, height).top - boardH - post - 4;
    var top = top0 + p * (height - 6 - (boardH + post) - top0);
    var radius = width * 0.06, border = width * 0.025;
    ctx.save();
    roundRect(ctx, left, top, width, boardH, radius);
    ctx.fillStyle = '#EFE9D8'; ctx.fill();
    roundRect(ctx, left + border, top + border, width - 2 * border, boardH - 2 * border, Math.max(0, radius - border));
    ctx.fillStyle = '#1E4A2A'; ctx.fill();
    var fontSize = width * 0.135, lineH = width * 0.155;
    ctx.fillStyle = '#EFE9D8';
    ctx.font = '600 ' + fontSize + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var lines = ['Please', 'walk on', 'the grass'];
    var cx = left + width / 2, cy = top + boardH / 2;
    for (var i = 0; i < 3; i++) ctx.fillText(lines[i], cx, cy + (i - 1) * lineH);
    ctx.fillStyle = '#5A4632';
    ctx.fillRect(cx - width * 0.035, top + boardH, width * 0.07, post);
    ctx.restore();
  }

  // ---------------------------------------------------------------- small drawing helpers

  function seg(c, color, x1, y1, x2, y2, width, cap) {
    c.strokeStyle = color; c.lineWidth = width; c.lineCap = cap || 'butt';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  function disc(c, color, r, x, y) { c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, 2 * PI); c.fill(); }
  /** Compose drawOval: top-left and size. */
  function oval(c, color, x, y, w, h) {
    c.fillStyle = color; c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * PI); c.fill();
  }
  /** Compose drawArc in an oval (top-left x, y, size w × h), degrees clockwise from 3 o'clock. */
  function arcIn(c, color, start, sweep, useCenter, x, y, w, h, stroke) {
    var cx = x + w / 2, cy = y + h / 2;
    c.beginPath();
    if (useCenter) c.moveTo(cx, cy);
    c.ellipse(cx, cy, w / 2, h / 2, 0, start * PI / 180, (start + sweep) * PI / 180);
    if (stroke) { c.strokeStyle = color; c.lineWidth = stroke; c.lineCap = 'butt'; c.stroke(); }
    else { if (useCenter) c.closePath(); c.fillStyle = color; c.fill(); }
  }
  function poly(c, color, pts) {
    c.fillStyle = color; c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath(); c.fill();
  }

  // ---------------------------------------------------------------- the camp

  var FIG_LEAF = '#2E5B2D', FIG_LEAF_LIGHT = '#3E7238', FIG_LEAF_DARK = '#1F4220', FIG_BARK = '#6B6157';
  var campCanvas = null;

  /** A flying fox asleep: hanging by its feet from the origin, wrapped in its wings, head down. */
  function drawSleeper(c, len, a) {
    if (a <= 0) return;
    seg(c, rgba(BAT_BONE, a), -0.05 * len, 0, -0.04 * len, 0.08 * len, 0.03 * len);
    seg(c, rgba(BAT_BONE, a), 0.05 * len, 0, 0.04 * len, 0.08 * len, 0.03 * len);
    c.fillStyle = rgba(BAT_MEMBRANE, a);
    c.beginPath();
    c.moveTo(0, 0.06 * len);
    c.bezierCurveTo(0.24 * len, 0.10 * len, 0.22 * len, 0.55 * len, 0, 0.80 * len);
    c.bezierCurveTo(-0.22 * len, 0.55 * len, -0.24 * len, 0.10 * len, 0, 0.06 * len);
    c.closePath(); c.fill();
    seg(c, rgba(BAT_BONE, a), 0.05 * len, 0.14 * len, 0.02 * len, 0.70 * len, 0.02 * len);
    disc(c, rgba(BAT_COLLAR, a * 0.9), 0.10 * len, 0, 0.74 * len);
    disc(c, rgba(BAT_BODY, a), 0.10 * len, 0, 0.86 * len);
    [-1, 1].forEach(function (m) {
      poly(c, rgba(BAT_BODY, a), [m * 0.03 * len, 0.92 * len, m * 0.07 * len, 1.0 * len, m * 0.09 * len, 0.90 * len]);
    });
  }

  /** The figs and the camp, composited at 90% (overlapping leaves don't double up). */
  function camp(ctx, layout, height) {
    var s = dprOf(ctx);
    var W = layout.boardWidth, H = height;
    if (!campCanvas) campCanvas = document.createElement('canvas');
    var pw = Math.max(1, Math.ceil(W * s)), ph = Math.max(1, Math.ceil(H * s));
    if (campCanvas.width !== pw || campCanvas.height !== ph) { campCanvas.width = pw; campCanvas.height = ph; }
    var c = campCanvas.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, pw, ph);
    c.setTransform(s, 0, 0, s, 0, 0);
    figs(layout, height).forEach(function (fig) {
      var x = fig.x, w = fig.w, inward = -fig.side;
      fig.limbs.forEach(function (l) {
        var y = l[0], reach = l[1], tipX = x + inward * reach;
        c.beginPath();
        c.moveTo(x - inward * 0.05 * w, y - 0.04 * w);
        c.quadraticCurveTo((x + tipX) / 2, y - 0.05 * w, tipX, y + reach * 0.10);
        c.strokeStyle = FIG_BARK; c.lineWidth = 0.045 * w; c.lineCap = 'round'; c.stroke();
      });
      var cy = fig.limbs[1][0] - 0.28 * w;
      [[0.02, 0.04, 0.28], [0.28, 0.08, 0.22], [0.12, -0.14, 0.24], [0.42, 0.16, 0.15], [-0.10, -0.06, 0.24]].forEach(function (m) {
        var dx = m[0], dy = m[1], r = m[2], ox = x + inward * dx * w;
        oval(c, FIG_LEAF_DARK, ox - r * w, cy + (dy - r * 0.62) * w + 0.03 * w, 2 * r * w, 1.24 * r * w);
        oval(c, FIG_LEAF, ox - r * w, cy + (dy - r * 0.62) * w, 2 * r * w, 1.24 * r * w);
        oval(c, FIG_LEAF_LIGHT, ox - r * 0.5 * w, cy + (dy - r * 0.6) * w, 1.0 * r * w, 0.5 * r * w);
      });
    });
    var t = now(), len = sleeperLength(layout);
    for (var i = 0; i < st.spots.length; i++) {
      var away = st.away[i];
      if (away !== 0 && t > away + 1) { st.away[i] = away = 0; }
      var a = away === 0 ? 1 : clamp(t - away, 0, 1);
      c.save(); c.translate(st.spots[i].x, st.spots[i].y); drawSleeper(c, len, a); c.restore();
    }
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(campCanvas, 0, 0, W, H);
    ctx.restore();
  }

  /** A sleeper wakes and flies: one on [side] if any is home there, else anywhere; −1 if none. */
  function takeOff(side) {
    var t = now(), home = [], pick = [];
    for (var i = 0; i < st.spots.length; i++) if (st.away[i] === 0) home.push(i);
    home.forEach(function (i) { if (st.sides[i] === side) pick.push(i); });
    if (!pick.length) pick = home;
    if (!pick.length) return -1;
    var k = pick[Math.floor(Math.random() * pick.length)];
    st.away[k] = t + 20 + Math.random() * 10;
    return k;
  }

  // ---------------------------------------------------------------- the kookaburra

  var KOOKA_BROWN = '#5A3F2B', KOOKA_BROWN_DARK = '#3E2B1D', KOOKA_CREAM = '#EFE6D2', KOOKA_RUFOUS = '#B8673A',
    KOOKA_BLUE = '#6E9CC0', KOOKA_BEAK = '#2B2622', KOOKA_BEAK_PALE = '#CFC2A8';
  var LAUGH_MS = [0, 1300, 1900, 3250];

  /** The bird, feet at the origin, height 1, facing right (+x). */
  function drawKookaburra(c, laugh, gape, t) {
    var bob = laugh * 0.015 * Math.sin(t * 2 * PI * 4.5);
    // The tail, barred, angled down behind; cocked up while laughing.
    c.save();
    c.translate(-0.14, -0.30); c.rotate(-28 * laugh * PI / 180); c.translate(0.14, 0.30);
    poly(c, KOOKA_RUFOUS, [-0.10, -0.36, -0.40, -0.02, -0.30, 0.04, -0.04, -0.26]);
    for (var k = 1; k <= 4; k++) {
      var f = k / 5;
      seg(c, KOOKA_BROWN_DARK, -0.10 - 0.30 * f + 0.04, -0.36 + 0.34 * f + 0.06, -0.10 - 0.30 * f - 0.03, -0.36 + 0.34 * f - 0.01, 0.022);
    }
    c.restore();
    [-0.03, 0.05].forEach(function (fx) { seg(c, KOOKA_BROWN_DARK, fx, -0.12, fx + 0.02, 0, 0.025, 'round'); });
    c.save();
    c.translate(0, bob);
    oval(c, KOOKA_CREAM, -0.18, -0.62, 0.40, 0.52);
    c.fillStyle = KOOKA_BROWN;
    c.beginPath();
    c.moveTo(-0.17, -0.52);
    c.bezierCurveTo(-0.02, -0.66, 0.12, -0.50, 0.06, -0.30);
    c.bezierCurveTo(0.0, -0.18, -0.12, -0.14, -0.22, -0.22);
    c.closePath(); c.fill();
    oval(c, KOOKA_BLUE, -0.06, -0.50, 0.11, 0.07);
    oval(c, KOOKA_BROWN_DARK, -0.18, -0.34, 0.14, 0.10);
    // Head: thrown back to laugh.
    c.translate(0.02, -0.60); c.rotate(-32 * laugh * PI / 180); c.translate(-0.02, 0.60);
    var cx = 0.04, cy = -0.76;
    disc(c, KOOKA_CREAM, 0.17, cx, cy);
    arcIn(c, KOOKA_BROWN, 180, 180, true, cx - 0.17, cy - 0.17, 0.34, 0.24);
    seg(c, KOOKA_BROWN_DARK, cx - 0.15, cy + 0.01, cx + 0.10, cy - 0.01, 0.04, 'round');
    disc(c, '#000', 0.028, cx + 0.06, cy - 0.01);
    disc(c, '#fff', 0.009, cx + 0.068, cy - 0.018);
    var hx = cx + 0.13, hy = cy + 0.02;
    c.save();
    c.translate(hx, hy); c.rotate(30 * gape * PI / 180); c.translate(-hx, -hy);
    poly(c, KOOKA_BEAK_PALE, [hx - 0.02, hy - 0.005, hx + 0.27, hy + 0.005, hx - 0.02, hy + 0.05]);
    c.restore();
    c.fillStyle = KOOKA_BEAK;
    c.beginPath();
    c.moveTo(hx - 0.03, hy - 0.06);
    c.quadraticCurveTo(hx + 0.16, hy - 0.06, hx + 0.30, hy + 0.01);
    c.lineTo(hx - 0.02, hy + 0.005);
    c.closePath(); c.fill();
    c.restore();
  }

  /** On the left bough's upper limb; when the lawn scrolls it hops down to the picnic basket. */
  function kookaburra(ctx, layout, height, p, dt) {
    st.t += dt;
    var target = now() * 1000 < st.laughUntil ? 1 : 0;
    st.laugh = clamp(st.laugh + clamp(target - st.laugh, -dt * 5, dt * 5), 0, 1);
    var fig = figs(layout, height)[0];
    var limbY = fig.limbs[1][0], reach = fig.limbs[1][1], w = fig.w, u = 0.88;
    function quad(a, b, c) { return (1 - u) * (1 - u) * a + 2 * u * (1 - u) * b + u * u * c; }
    var perchX = quad(-0.05 * w, reach / 2, reach);
    var perchY = quad(limbY - 0.04 * w, limbY - 0.05 * w, limbY + reach * 0.10) - 0.02 * w;
    var boughSize = Math.max(34, Math.min(layout.cardWidth * 0.80, 72));
    var shift = lawnScroll(layout, height);
    var spot = picnicSpot(layout, height);
    var bx = spot.x + 0.18 * spot.u, by = spot.y - 0.30 * spot.u;
    var e = p * p * (3 - 2 * p);
    var x = perchX + (bx - perchX) * e;
    var y = perchY + (by - (1 - p) * shift - perchY) * e - Math.sin(PI * p) * boughSize * 1.2;
    var size = boughSize + (0.40 * spot.u - boughSize) * e;
    var gape = st.laugh * (0.25 + 0.75 * Math.abs(Math.sin(st.t * 2 * PI * 4.5)));
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.translate(x, y);
    ctx.scale(size, size);
    drawKookaburra(ctx, st.laugh, gape, st.t);
    ctx.restore();
  }

  // ---------------------------------------------------------------- the picnic and the runners

  var SKIN = ['#F1C9A5', '#C68E63', '#8D5A3B', '#E0AC85'], HAIR = '#2B211C', WICKER = '#9C6B3A', RUG_BLUE = 'rgba(47,109,181,0.85)';

  function drawSitter(c, u, x, shirt, legs, skin, facing, kneesUp) {
    var seat = -0.09 * u;
    var hipX = x, hipY = seat - 0.02 * u;
    if (kneesUp) {
      var kx = x + facing * 0.18 * u, ky = seat - 0.24 * u;
      seg(c, legs, hipX, hipY, kx, ky, 0.09 * u, 'round');
      seg(c, legs, kx, ky, x + facing * 0.30 * u, seat, 0.08 * u, 'round');
      seg(c, shirt, x, seat - 0.30 * u, kx - facing * 0.02 * u, ky + 0.02 * u, 0.06 * u, 'round');
    } else {
      seg(c, legs, hipX, hipY, x + facing * 0.34 * u, seat - 0.01 * u, 0.09 * u, 'round');
      seg(c, shirt, x, seat - 0.30 * u, x - facing * 0.12 * u, seat, 0.06 * u, 'round');
    }
    roundRect(c, x - 0.09 * u, seat - 0.40 * u, 0.18 * u, 0.38 * u, 0.06 * u);
    c.fillStyle = shirt; c.fill();
    disc(c, skin, 0.08 * u, x + facing * 0.01 * u, seat - 0.49 * u);
    arcIn(c, HAIR, 180, 180, true, x + facing * 0.01 * u - 0.085 * u, seat - 0.575 * u, 0.17 * u, 0.15 * u);
  }

  /** The picnic, the rug's right edge at the origin: a family, fish and chips, the basket. */
  function drawPicnic(c, u) {
    var bw = 1.5 * u, bd = 0.20 * u, sk = 0.14 * u, x0 = -bw;
    poly(c, '#FFFFFF', [x0, 0, 0, 0, sk, -bd, x0 + sk, -bd]);
    var cols = 12, rows = 3;
    for (var r = 0; r < rows; r++) for (var k = 0; k < cols; k++) {
      if ((r + k) % 2 === 1) continue;
      var t0 = r / rows, t1 = (r + 1) / rows, a = x0 + k * bw / cols, b = x0 + (k + 1) * bw / cols;
      poly(c, RUG_BLUE, [a + sk * t0, -bd * t0, b + sk * t0, -bd * t0, b + sk * t1, -bd * t1, a + sk * t1, -bd * t1]);
    }
    // Fish and chips, open on their paper in the middle of the rug.
    var fx = -0.62 * u, fy = -0.08 * u;
    poly(c, '#F4F1E8', [fx - 0.16 * u, fy, fx, fy - 0.07 * u, fx + 0.16 * u, fy, fx, fy + 0.06 * u]);
    for (var i = 0; i < 7; i++) {
      var x = fx - 0.09 * u + i * 0.03 * u;
      seg(c, '#E8B84A', x, fy + 0.01 * u, x + 0.02 * u, fy - 0.04 * u, 0.018 * u, 'round');
    }
    oval(c, '#C98A3C', fx - 0.02 * u, fy - 0.035 * u, 0.10 * u, 0.045 * u);
    drawSitter(c, u, -1.25 * u, '#6E8E5A', '#3E4A5C', SKIN[3], 1, true);
    c.save(); c.translate(-0.92 * u, 0); c.scale(0.68, 0.68);
    drawSitter(c, u, 0, '#E58A3A', '#3A6EA5', SKIN[0], 1, true);
    c.restore();
    drawSitter(c, u, -0.22 * u, '#E6E0D2', '#7A5C44', SKIN[1], -1, false);
    c.fillStyle = WICKER;
    c.fillRect(0.08 * u, -0.20 * u, 0.20 * u, 0.12 * u);
    arcIn(c, WICKER, 180, 180, false, 0.11 * u, -0.30 * u, 0.14 * u, 0.16 * u, 0.025 * u);
  }

  function shade(h, k) {
    var c = hex(h);
    return 'rgb(' + Math.round(c[0] * k) + ',' + Math.round(c[1] * k) + ',' + Math.round(c[2] * k) + ')';
  }

  /** A runner, feet at the origin, height u, running toward +x; phase turns once a stride. */
  function drawRunner(c, u, phase, shirt, shorts, skin) {
    var s = Math.sin(phase), co = Math.cos(phase);
    var hx = 0, hy = -0.50 * u - 0.03 * u * Math.abs(co);
    var sx = hx + 0.07 * u, sy = hy - 0.30 * u;
    var far = shade(skin, 0.82);
    function leg(sg, color) {
      var a = 0.6 * s * sg;
      var kx = hx + Math.sin(a) * 0.26 * u, ky = hy + Math.cos(a) * 0.26 * u;
      var b = 0.25 + 0.9 * Math.max(0, sg * co); // The knee folds on the forward swing.
      var fx = kx + Math.sin(a - b) * 0.25 * u, fy = ky + Math.cos(a - b) * 0.25 * u;
      seg(c, color, hx, hy, kx, ky, 0.075 * u, 'round');
      seg(c, color, kx, ky, fx, fy, 0.065 * u, 'round');
      seg(c, shorts, hx, hy, hx + Math.sin(a) * 0.11 * u, hy + Math.cos(a) * 0.11 * u, 0.10 * u, 'round');
    }
    function arm(sg, color) {
      var a = -0.7 * s * sg;
      var ex = sx + Math.sin(a) * 0.15 * u, ey = sy + Math.cos(a) * 0.15 * u;
      seg(c, color, sx, sy, ex, ey, 0.055 * u, 'round');
      seg(c, color, ex, ey, ex + Math.cos(a) * 0.12 * u, ey - Math.sin(a) * 0.04 * u - 0.08 * u, 0.05 * u, 'round');
    }
    arm(-1, far);
    leg(-1, far);
    seg(c, shorts, hx, hy, hx + 0.01 * u, hy - 0.06 * u, 0.12 * u, 'round');
    seg(c, shirt, hx + 0.01 * u, hy - 0.05 * u, sx, sy, 0.13 * u, 'round');
    leg(1, skin);
    arm(1, skin);
    var headX = sx + 0.035 * u, headY = sy - 0.11 * u;
    disc(c, skin, 0.075 * u, headX, headY);
    arcIn(c, HAIR, 160, 200, true, headX - 0.08 * u, headY - 0.085 * u, 0.16 * u, 0.13 * u);
  }

  /** The family picnic and the runners, scrolling in from above as the photo goes. */
  function lawnPicnic(ctx, layout, height, p, dt) {
    if (p <= 0) return;
    var shift = lawnScroll(layout, height);
    var spot = picnicSpot(layout, height);
    var r = balconyRect(layout, height);
    var lanes = [[height - r.height * 0.06, 1], [height - r.height * 0.72, 0.78]];
    var bw = layout.boardWidth;
    st.runners.forEach(function (rn) {
      var scale = lanes[rn.lane][1], u = spot.u * scale, pace = 95 * rn.speed * scale;
      if (isNaN(rn.x)) rn.x = rn.dir > 0 ? bw * 0.15 - rn.lead * u : bw * 0.75;
      if (rn.wait > 0) {
        rn.wait -= dt;
        if (rn.wait <= 0) rn.x = rn.dir > 0 ? -u - rn.lead * u : bw + u;
        return;
      }
      rn.x += rn.dir * pace * dt;
      rn.phase += dt * 2 * PI * 1.4;
      var out = rn.dir > 0 ? rn.x > bw + u : rn.x < -u;
      // A pair comes round together.
      if (out) rn.wait = rn.lead > 0 ? 6 : 6 + Math.random() * 4;
    });
    ctx.save();
    ctx.globalAlpha = 0.92 * p;
    ctx.translate(0, -(1 - p) * shift);
    function runnersIn(lane) {
      var y = lanes[lane][0], scale = lanes[lane][1];
      st.runners.forEach(function (rn) {
        if (rn.lane !== lane || rn.wait > 0 || isNaN(rn.x)) return;
        ctx.save(); ctx.translate(rn.x, y); ctx.scale(rn.dir, 1);
        drawRunner(ctx, spot.u * scale, rn.phase, rn.shirt, rn.shorts, rn.skin);
        ctx.restore();
      });
    }
    runnersIn(1);
    ctx.save(); ctx.translate(spot.x, spot.y); drawPicnic(ctx, spot.u); ctx.restore();
    runnersIn(0);
    ctx.restore();
  }

  // ---------------------------------------------------------------- flying foxes

  var BAT_MEMBRANE = hex('#2A2220'), BAT_BONE = hex('#4E3E36'), BAT_BODY = hex('#3B2E29'), BAT_COLLAR = hex('#B5652E');

  /** One wing, body at the origin, span 1; lift > 0 raises the tip. Mirrored for the left. */
  function wingPath(c, lift, mirror) {
    var m = mirror ? -1 : 1;
    function p(x, y) { return { x: m * x, y: y }; }
    var shoulder = p(0.04, -0.04);
    var wrist = p(0.22, -0.06 - 0.10 * lift);
    var tip = p(0.50, 0.02 - 0.22 * lift);
    var f1 = p(0.40, 0.12 - 0.14 * lift);
    var f2 = p(0.28, 0.14 - 0.08 * lift);
    var f3 = p(0.14, 0.13 - 0.03 * lift);
    var hip = p(0.04, 0.10);
    function scallop(a, b, depth) { c.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - depth, b.x, b.y); }
    c.beginPath();
    c.moveTo(shoulder.x, shoulder.y);
    c.quadraticCurveTo((shoulder.x + wrist.x) / 2, wrist.y - 0.03, wrist.x, wrist.y);
    c.lineTo(tip.x, tip.y);
    scallop(tip, f1, 0.035);
    scallop(f1, f2, 0.035);
    scallop(f2, f3, 0.03);
    scallop(f3, hip, 0.02);
    c.closePath();
  }

  function drawBat(c, bat, alpha) {
    var lift = Math.sin(bat.phase);
    var bank = clamp(bat.vy / 400, -0.3, 0.3) * (bat.vx < 0 ? -1 : 1);
    c.save();
    c.translate(bat.x, bat.y - lift * bat.span * 0.03);
    c.rotate(bank);
    c.scale(bat.span, bat.span);
    [false, true].forEach(function (mirror) {
      wingPath(c, lift, mirror);
      c.fillStyle = rgba(BAT_MEMBRANE, alpha); c.fill();
      var m = mirror ? -1 : 1;
      var wx = m * 0.22, wy = -0.06 - 0.10 * lift;
      c.strokeStyle = rgba(BAT_BONE, alpha);
      c.lineWidth = 0.008; c.lineCap = 'butt';
      [[0.40, 0.12 - 0.14 * lift], [0.28, 0.14 - 0.08 * lift], [0.14, 0.13 - 0.03 * lift]].forEach(function (f) {
        c.beginPath(); c.moveTo(wx, wy); c.lineTo(m * f[0], f[1]); c.stroke();
      });
    });
    c.fillStyle = rgba(BAT_BODY, alpha);
    c.beginPath(); c.ellipse(0, 0.03, 0.05, 0.11, 0, 0, 2 * PI); c.fill();
    c.fillStyle = rgba(BAT_COLLAR, alpha);
    c.beginPath(); c.ellipse(0, -0.04, 0.045, 0.03, 0, 0, 2 * PI); c.fill();
    c.fillStyle = rgba(BAT_BODY, alpha);
    c.beginPath(); c.arc(0, -0.09, 0.045, 0, 2 * PI); c.fill();
    [-1, 1].forEach(function (m) {
      c.beginPath();
      c.moveTo(m * 0.012, -0.12);
      c.lineTo(m * 0.032, -0.155);
      c.lineTo(m * 0.04, -0.11);
      c.closePath();
      c.fill();
    });
    c.restore();
  }

  // ---------------------------------------------------------------- fireworks

  var COLORS = ['#FFD36B', '#FF4D5E', '#5AB4FF', '#FFF6E8', '#7CF29A', '#FF6BD5', '#FFA14A'].map(hex);
  var GOLD = hex('#FFC85A'), WARM_WHITE = hex('#FFF6E8');
  var SHELL_GRAVITY = 600, SPARK_CAP = 1100;
  var PEONY = 0, RING = 1, WILLOW = 2;

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  /** Harbour fireworks, in px: shells rise and burst into peonies, rings and gold willows. */
  function Fireworks(width, height) {
    var shells = [], sparks = [];

    function kind() {
      var n = Math.floor(Math.random() * 10);
      return n <= 5 ? PEONY : n <= 7 ? RING : WILLOW;
    }

    function burst(x, y, color, k) {
      var count = Math.min(k === PEONY ? 70 : k === RING ? 44 : 60, SPARK_CAP - sparks.length);
      var accent = Math.random() < 0.35 ? WARM_WHITE : color;
      for (var i = 0; i < count; i++) {
        var angle = k === RING ? 2 * PI * i / count : range(0, 2 * PI);
        var speed = k === PEONY ? range(110, 250) : k === RING ? 210 : range(90, 180);
        var life = k === WILLOW ? range(2.2, 3.0) : range(1.2, 1.8);
        sparks.push({
          x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          color: i % 4 === 0 ? accent : color, life: life, maxLife: life,
          drag: k === WILLOW ? 1.2 : 0.9, gravity: k === WILLOW ? 45 : 70
        });
      }
    }

    return {
      isQuiet: function () { return shells.length === 0 && sparks.length === 0; },
      /** Still putting on a show (not just a few dying embers). */
      isBusy: function () { return shells.length > 0 || sparks.length > 40; },

      launch: function () {
        var x = range(0.12, 0.88) * width;
        var burstY = range(0.18, 0.55) * height;
        var vy = -Math.sqrt(2 * SHELL_GRAVITY * (height - burstY));
        var k = kind();
        shells.push({ x: x, y: height, vx: range(-20, 20), vy: vy, color: k === WILLOW ? GOLD : pick(COLORS), kind: k, trail: [] });
      },

      burstAt: function (x, y) { burst(x, y, pick(COLORS), kind()); },

      step: function (dt) {
        var i, s, p;
        for (i = 0; i < shells.length; i++) {
          s = shells[i];
          s.trail.push({ x: s.x, y: s.y });
          if (s.trail.length > 7) s.trail.shift();
          s.vy += SHELL_GRAVITY * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
        }
        shells = shells.filter(function (s) {
          if (s.vy >= -15) { burst(s.x, s.y, s.color, s.kind); return false; }
          return true;
        });
        for (i = 0; i < sparks.length; i++) {
          p = sparks[i];
          var k = 1 - p.drag * dt;
          p.vx *= k;
          p.vy = p.vy * k + p.gravity * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
        }
        sparks = sparks.filter(function (p) { return p.life > 0; });
      },

      draw: function (c) {
        var i, j, s, p;
        c.save();
        for (i = 0; i < shells.length; i++) {
          s = shells[i];
          for (j = 0; j < s.trail.length; j++) {
            c.fillStyle = rgba(s.color, 0.15 + 0.1 * j);
            c.beginPath(); c.arc(s.trail[j].x, s.trail[j].y, 1.3, 0, 2 * PI); c.fill();
          }
          c.fillStyle = '#fff';
          c.beginPath(); c.arc(s.x, s.y, 1.8, 0, 2 * PI); c.fill();
        }
        c.lineWidth = 2.6;
        c.lineCap = 'round';
        for (i = 0; i < sparks.length; i++) {
          p = sparks[i];
          var f = p.life / p.maxLife;
          // Twinkle as it dies.
          var alpha = (f < 0.3 && Math.random() < 0.35) ? 0 : Math.min(1, f * 1.4);
          if (alpha <= 0) continue;
          c.fillStyle = rgba(p.color, alpha * 0.28);
          c.beginPath(); c.arc(p.x, p.y, 5, 0, 2 * PI); c.fill();
          c.strokeStyle = rgba(p.color, alpha);
          c.beginPath(); c.moveTo(p.x - p.vx * 0.09, p.y - p.vy * 0.09); c.lineTo(p.x, p.y); c.stroke();
        }
        c.restore();
      }
    };
  }

  /** When each shell of the opening show goes up, in seconds after the deal starts. */
  var OPENING_SHOW = [0.0, 0.35, 0.7, 1.0, 1.35, 1.6, 2.0, 2.3, 2.6];

  // ---------------------------------------------------------------- module

  window.LOCATIONS = window.LOCATIONS || {};
  window.LOCATIONS.sydney = {
    /** A kookaburra's call, one of three, never the same twice running; the bird laughs with it. */
    homeSound: function () {
      var takes = [1, 2, 3].filter(function (n) { return n !== st.lastTake; });
      var take = takes[Math.floor(Math.random() * takes.length)];
      st.lastTake = take;
      st.laughUntil = Math.max(st.laughUntil, now() * 1000 + LAUGH_MS[take]);
      return 'kookaburra_' + take;
    },
    winDim: 0.40,
    animatedSurface: false,

    surface: function (ctx, w, h) { return drawLawn(ctx, w, h); },
    menuSurface: function (ctx, w, h) { return drawLawn(ctx, w, h); },

    /** Drawn every frame, behind the cards; [game] changes with each deal, resume or table switch. */
    sceneryFrame: function (ctx, layout, sceneHeight, dt, game) {
      if (game !== st.game) { st.game = game; st.start = now(); }
      prepare(layout, sceneHeight);
      var p = reveal();
      balconyPhoto(ctx, layout, sceneHeight, p);
      grassSign(ctx, layout, sceneHeight, p);
      lawnPicnic(ctx, layout, sceneHeight, p, dt); // The runners pass in front of the sign.
      camp(ctx, layout, sceneHeight);
      kookaburra(ctx, layout, sceneHeight, p, dt);
    },

    /**
     * One of the camp wakes in a fig (on the foundations' side if any are home there), drops from
     * its limb, and flaps away across the board, away from its tree. With the whole camp out, it
     * drops from the foundation instead.
     */
    homeTouch: function (layout, f) {
      var slot = layout.foundationRect(f);
      var side = slot.cx > layout.boardWidth / 2 ? 1 : -1;
      prepare(layout, layout.sceneHeight);
      var k = takeOff(side), sx, sy, dir;
      if (k >= 0) {
        sx = st.spots[k].x; sy = st.spots[k].y + sleeperLength(layout) * 0.5;
        dir = -st.sides[k];
      } else {
        sx = slot.cx; sy = slot.cy;
        dir = Math.random() < (side > 0 ? 0.75 : 0.25) ? -1 : 1;
      }
      var bat = {
        x: sx, y: sy,
        vx: dir * (110 + Math.random() * 50), vy: 40 + Math.random() * 25,
        span: Math.max(38, layout.cardWidth * 0.9),
        phase: 0, rate: (2.3 + Math.random() * 0.6) * 2 * PI, age: 0
      };
      var fx = {
        done: false,
        step: function (dt) {
          if (fx.done) return;
          bat.vy -= 45 * dt; // Each wingbeat lifts it out of the drop.
          bat.vy = Math.max(bat.vy, -50);
          bat.x += bat.vx * dt;
          bat.y += bat.vy * dt;
          bat.phase += bat.rate * dt;
          bat.age += dt;
          if (bat.x < -bat.span || bat.x > layout.boardWidth + bat.span || bat.y < -bat.span || bat.age > 12) fx.done = true;
        },
        draw: function (ctx) {
          if (!fx.done) drawBat(ctx, bat, clamp(bat.age / 0.25, 0, 1));
        }
      };
      return fx;
    },

    /** The opening show: dusk falls, nine shells go up, daylight returns as the sparks die. */
    opening: function (w, h) {
      var show = Fireworks(w, h);
      var t = 0, next = 0, dusk = 0;
      var fx = {
        done: false,
        step: function (dt) {
          if (fx.done) return;
          t += dt;
          while (next < OPENING_SHOW.length && t >= OPENING_SHOW[next]) { show.launch(); next++; }
          show.step(dt);
          var target = (next < OPENING_SHOW.length || show.isBusy()) ? 0.38 : 0;
          dusk += (target - dusk) * Math.min(1, dt * 3);
          if (next >= OPENING_SHOW.length && show.isQuiet() && dusk <= 0.01) fx.done = true;
        },
        draw: function (ctx) {
          if (fx.done) return;
          ctx.save();
          ctx.fillStyle = 'rgba(5,11,26,' + dusk + ')';
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
          show.draw(ctx);
        }
      };
      return fx;
    },

    /** Harbour fireworks: a shell every 0.35–0.9 s; a tap bursts one at the fingertip. */
    win: function (w, h) {
      var show = Fireworks(w, h);
      var untilShell = 0;
      return {
        step: function (dt) {
          untilShell -= dt;
          if (untilShell <= 0) { show.launch(); untilShell = range(0.35, 0.9); }
          show.step(dt);
        },
        draw: function (ctx) { show.draw(ctx); },
        tap: function (x, y) { show.burstAt(x, y); }
      };
    }
  };
})();
