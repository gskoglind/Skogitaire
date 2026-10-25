/* Bermuda — port of ui/Bermuda.kt (Android). Horseshoe Bay surface, the moon gate, the scooter
   home touch, the landing announcement, and the Good Friday kites. See LOCATION-BIBLE.md §6. */
(function () {
  window.LOCATIONS = window.LOCATIONS || {};

  var TAU = Math.PI * 2;
  function dprNow() { return window.devicePixelRatio || 1; }
  function offscreen(w, h) {
    var dpr = dprNow();
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * dpr)); c.height = Math.max(1, Math.ceil(h * dpr));
    var g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas: c, ctx: g, w: w, h: h, dpr: dpr };
  }
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function vgrad(ctx, y0, y1, stops) {
    var g = ctx.createLinearGradient(0, y0, 0, y1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }

  // ------------------------------------------------------------------------------------------
  // The beach

  var DeepWater = '#125A86', OpenWater = '#1E86AA', Turquoise = '#3DB8C3', Shallows = '#93DDD3';
  var WetSand = '#E6A69C', DrySand = '#F5D3C8', PaleSand = '#F8DED5';
  var SHORE = 0.58, WAVE_PERIOD = 10;

  var grain = (function () {
    var r = SEEDED(1609), out = [];
    for (var i = 0; i < 900; i++) out.push([r.next(), r.next(), r.next()]);
    return out;
  })();

  // Sea, sand and grain are static: cached per window size.
  var beachCache = null;
  function staticBeach(w, h) {
    var dpr = dprNow();
    if (beachCache && beachCache.w === w && beachCache.h === h && beachCache.dpr === dpr) return beachCache;
    var o = offscreen(w, h), c = o.ctx, shore = SHORE * h;
    c.fillStyle = vgrad(c, 0, shore, [[0, DeepWater], [0.45, OpenWater], [0.8, Turquoise], [1, Shallows]]);
    c.fillRect(0, 0, w, shore + 2);
    c.fillStyle = vgrad(c, shore, h, [[0, WetSand], [0.18, DrySand], [1, PaleSand]]);
    c.fillRect(0, shore, w, h - shore);
    for (var i = 0; i < grain.length; i++) {
      var g = grain[i];
      c.fillStyle = rgba('#B9776F', 0.10 + 0.12 * g[2]);
      c.beginPath(); c.arc(g[0] * w, shore + g[1] * (h - shore), 0.6 + g[2], 0, TAU); c.fill();
    }
    beachCache = o;
    return o;
  }

  function surface(ctx, W, H, t) {
    var bg = staticBeach(W, H);
    ctx.drawImage(bg.canvas, 0, 0, W, H);

    var phase = ((t || 0) % WAVE_PERIOD) / WAVE_PERIOD;
    if (phase < 0) phase += 1;
    var shore = SHORE * H, reach = 0.07 * H;
    var run;
    if (phase < 0.4) { var a = phase / 0.4; run = 1 - (1 - a) * (1 - a); }
    else { var b = (phase - 0.4) / 0.6; run = 1 - b * b * (3 - 2 * b); }
    var edge = shore + run * reach;
    function wobble(x, amp) {
      return amp * (Math.sin(x / W * 9 + phase * 6.283) * 0.6 + Math.sin(x / W * 23 - phase * 6.283 * 2) * 0.4);
    }
    var x;

    // Where the last wave reached: wet, darker sand, drying as the cycle goes on.
    var dry = phase < 0.4 ? run : 1 - (phase - 0.4) / 0.6 * 0.85;
    ctx.beginPath(); ctx.moveTo(0, shore);
    for (x = 0; x <= W; x += 6) ctx.lineTo(x, shore + reach + wobble(x * 0.7, 6));
    ctx.lineTo(W, shore); ctx.closePath();
    ctx.fillStyle = rgba('#C9857C', 0.32 * dry); ctx.fill();

    // The sheet of water over the sand, and its foam edge.
    ctx.beginPath(); ctx.moveTo(0, shore - 2);
    for (x = 0; x <= W; x += 6) ctx.lineTo(x, edge + wobble(x, 5));
    ctx.lineTo(W, shore - 2); ctx.closePath();
    ctx.fillStyle = vgrad(ctx, shore, edge + 6, [[0, rgba(Shallows, 0.95)], [1, rgba(Shallows, 0.45)]]);
    ctx.fill();

    ctx.lineCap = 'round'; ctx.lineJoin = 'miter';
    ctx.beginPath(); ctx.moveTo(0, edge + wobble(0, 5));
    for (x = 0; x <= W; x += 6) ctx.lineTo(x, edge + wobble(x, 5));
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 + 0.25 * run) + ')'; ctx.lineWidth = 2.5; ctx.stroke();

    // A line of broken water out where the waves stand up.
    var y = shore - 0.05 * H;
    ctx.beginPath(); ctx.moveTo(0, y + wobble(0, 3));
    for (x = 0; x <= W; x += 8) ctx.lineTo(x, y + wobble(x * 1.3 + W * 0.2, 3));
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.lineCap = 'butt';
    return true;
  }

  function menuSurface(ctx, w, h) {
    ctx.fillStyle = vgrad(ctx, 0, h, [[0, DeepWater], [1, OpenWater]]);
    ctx.fillRect(0, 0, w, h);
    return true;
  }

  // ------------------------------------------------------------------------------------------
  // The moon gate

  var Limestone = '#F1ECE1', LimestoneShade = '#CFC6B4', Hill = '#6E9F55', Cedar = '#3F6E3A';
  var pastels = ['#F4B6C2', '#F7E08A', '#A9D3EE', '#B8E3C6', '#F8C9A0', '#CDB8E6', '#F4F1EA'];

  function drawMoonGate(c, W, H) {
    var px = 1;
    var rnd = SEEDED(1609); // The same town every time.
    function r() { return rnd.next(); }
    var hillTop = 0.30 * H, shore = 0.58 * H;
    function ridge(x) {
      return hillTop + 0.10 * H * (0.5 + 0.5 * Math.sin(x / W * 2.3 * Math.PI + 0.8)) +
        0.05 * H * Math.sin(x / W * 7.1 * Math.PI);
    }
    var x, i;
    c.beginPath(); c.moveTo(0, shore);
    for (x = 0; x <= W; x += 4 * px) c.lineTo(x, ridge(x));
    c.lineTo(W, shore); c.closePath(); c.fillStyle = Hill; c.fill();
    var cedars = Math.floor(W / (22 * px));
    c.fillStyle = Cedar;
    for (i = 0; i < cedars; i++) {
      var cx = r() * W;
      var cy = ridge(cx) + r() * (shore - ridge(cx)) * 0.8;
      c.beginPath(); c.arc(cx, cy, (3 + r() * 3) * px, 0, TAU); c.fill();
    }

    // Pastel houses with white stepped roofs, in loose rows up the slope.
    var house = 19 * px;
    x = r() * house;
    while (x < W - house) {
      var top = ridge(x + house / 2);
      var y = top + (0.25 + r() * 0.55) * (shore - top - house);
      var w = house * (0.8 + r() * 0.5);
      var h = w * 0.62;
      c.fillStyle = pastels[Math.floor(r() * pastels.length)];
      c.fillRect(x, y, w, h);
      c.beginPath();
      c.moveTo(x - w * 0.06, y); c.lineTo(x + w * 0.22, y - h * 0.62);
      c.lineTo(x + w * 0.78, y - h * 0.62); c.lineTo(x + w * 1.06, y); c.closePath();
      c.fillStyle = '#FFFFFF'; c.fill();
      c.strokeStyle = LimestoneShade; c.lineWidth = 0.6 * px;
      for (var k = 1; k <= 2; k++) {
        var sy = y - h * 0.62 * k / 3, inset = w * 0.28 * k / 3;
        c.beginPath(); c.moveTo(x + inset - w * 0.06, sy); c.lineTo(x + w * 1.06 - inset, sy); c.stroke();
      }
      c.fillStyle = '#3A4A55';
      c.fillRect(x + w * 0.2, y + h * 0.35, w * 0.14, h * 0.3);
      c.fillRect(x + w * 0.62, y + h * 0.35, w * 0.14, h * 0.3);
      x += w * (1.4 + r() * 1.6);
    }

    // The water: turquoise, paler in the shallows near us.
    var wallTop = 0.84 * H;
    c.fillStyle = vgrad(c, shore, wallTop, [[0, '#2B9FB3'], [1, '#7FD6D3']]);
    c.fillRect(0, shore, W, wallTop - shore);
    var ripples = Math.floor(W / (30 * px));
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.1 * px; c.lineCap = 'round';
    for (i = 0; i < ripples; i++) {
      var rx = r() * W;
      var ry = shore + (0.1 + 0.85 * r()) * (wallTop - shore);
      var len = (8 + r() * 14) * px;
      c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx + len, ry); c.stroke();
    }
    c.lineCap = 'butt';

    // The beach the gate stands on.
    var sand = vgrad(c, wallTop, H, [[0, WetSand], [0.35, DrySand]]);
    c.fillStyle = sand; c.fillRect(0, wallTop, W, H - wallTop);
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(0, wallTop, W, 1.5 * px);

    // The moon gate: a ring of limestone, its foot sunk into the sand.
    var R = 0.44 * H, ring = R * 0.18;
    var gx = W / 2, gy = wallTop - 0.70 * R;
    c.lineWidth = ring;
    c.strokeStyle = LimestoneShade;
    c.beginPath(); c.arc(gx + 2 * px, gy + 2 * px, R, 0, TAU); c.stroke();
    c.strokeStyle = Limestone;
    c.beginPath(); c.arc(gx, gy, R - ring / 2, 0, TAU); c.stroke();
    // Voussoir joints and the keystone.
    c.strokeStyle = LimestoneShade; c.lineWidth = 0.8 * px;
    for (k = 0; k < 24; k++) {
      var a = TAU * k / 24, ca = Math.cos(a), sa = Math.sin(a);
      var oy = gy + sa * R;
      if (oy < wallTop) {
        c.beginPath(); c.moveTo(gx + ca * (R - ring), gy + sa * (R - ring)); c.lineTo(gx + ca * R, oy); c.stroke();
      }
    }
    var kx = gx - ring * 0.45, ky = gy - R - ring * 0.15;
    c.fillStyle = Limestone; c.fillRect(kx, ky, ring * 0.9, ring * 1.25);
    c.strokeRect(kx, ky, ring * 0.9, ring * 1.25);
    // The sand covers the ring's foot, and the ring stands on a footing either side.
    c.fillStyle = sand;
    c.fillRect(gx - R - 2 * px, wallTop + 1.5 * px, 2 * R + 4 * px, H - wallTop);
    [-1, 1].forEach(function (side) {
      var fx = gx + side * (R - ring / 2);
      var fw = ring * 1.7, fh = ring * 0.8;
      var lx = fx - fw / 2, ty = wallTop - fh;
      c.fillStyle = Limestone; c.fillRect(lx, ty, fw, fh);
      c.fillStyle = LimestoneShade; c.fillRect(lx, ty, fw, 1.5 * px);
    });
  }

  function scenery(ctx, layout, sceneHeight) {
    var W = layout.boardWidth;
    var H = Math.min(W * 0.42, 340);
    if (W <= 0 || H <= 0) return;
    var o = offscreen(W, H);
    drawMoonGate(o.ctx, W, H);
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(o.canvas, 0, sceneHeight - H, W, H);
    ctx.restore();
  }

  // ------------------------------------------------------------------------------------------
  // The scooter

  var ScooterRed = '#D8433A', Tyre = '#222222', Blazer = '#1F2D55', Shorts = '#F49AAE',
    Socks = '#1F2D55', Skin = '#DDAE86', Helmet = '#F5F5F5';

  // A Bermudian on a scooter in profile, facing right, ground at the origin, height 1.
  function drawScooter(c) {
    function poly(p, color) {
      c.beginPath(); c.moveTo(p[0], p[1]);
      for (var i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
      c.closePath(); c.fillStyle = color; c.fill();
    }
    function circle(color, r, x, y) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = color; c.fill(); }
    function line(color, x0, y0, x1, y1, wdt, cap) {
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1);
      c.strokeStyle = color; c.lineWidth = wdt; c.lineCap = cap || 'butt'; c.stroke();
    }
    // Wheels.
    [-0.30, 0.32].forEach(function (wx) { circle(Tyre, 0.12, wx, -0.12); circle('#9A9A9A', 0.05, wx, -0.12); });
    // Rear cowl, floorboard, front fender, leg shield, handlebars, headlight.
    c.beginPath(); c.moveTo(-0.47, -0.20); c.quadraticCurveTo(-0.48, -0.40, -0.32, -0.41);
    c.lineTo(-0.06, -0.40); c.lineTo(-0.06, -0.22); c.closePath(); c.fillStyle = ScooterRed; c.fill();
    poly([-0.08, -0.23, 0.22, -0.23, 0.22, -0.17, -0.08, -0.17], '#3A3A3A');
    poly([0.20, -0.27, 0.44, -0.25, 0.44, -0.20, 0.20, -0.21], ScooterRed);
    poly([0.17, -0.18, 0.27, -0.18, 0.33, -0.60, 0.26, -0.63, 0.22, -0.40], ScooterRed);
    line('#555555', 0.29, -0.60, 0.27, -0.72, 0.025);
    line('#555555', 0.20, -0.73, 0.31, -0.72, 0.025, 'round');
    circle('#FFF4D0', 0.03, 0.325, -0.66);
    // Seat.
    poly([-0.36, -0.46, -0.08, -0.46, -0.06, -0.40, -0.38, -0.40], '#2A2A2A');
    // Socks and shoes, a knee, then the shorts over the thigh.
    line(Socks, 0.10, -0.47, 0.10, -0.24, 0.07);
    poly([0.06, -0.25, 0.19, -0.24, 0.19, -0.19, 0.06, -0.19], '#4A2E1E');
    circle(Skin, 0.04, 0.10, -0.49);
    line(Shorts, -0.20, -0.48, 0.06, -0.50, 0.10, 'round');
    // Blazer, arm to the bars, hand.
    poly([-0.27, -0.44, -0.08, -0.45, -0.03, -0.80, -0.18, -0.83], Blazer);
    line(Blazer, -0.09, -0.77, 0.22, -0.72, 0.06, 'round');
    circle(Skin, 0.03, 0.24, -0.72);
    // Head and an open-face helmet with a short peak.
    circle(Skin, 0.07, -0.07, -0.89);
    var hx = -0.185 + 0.095, hy = -1.015 + 0.095;
    c.beginPath(); c.moveTo(hx, hy);
    c.arc(hx, hy, 0.095, 130 * Math.PI / 180, (130 + 215) * Math.PI / 180);
    c.closePath(); c.fillStyle = Helmet; c.fill();
    line(Helmet, -0.01, -0.95, 0.04, -0.94, 0.022, 'round');
    line('#555555', -0.08, -0.86, -0.05, -0.82, 0.008);
    c.lineCap = 'butt';
  }

  function homeTouch(layout, f) {
    var slot = layout.foundationRect(f);
    var rider = { x: slot.cx, ground: slot.bottom, height: Math.max(46, layout.cardHeight * 0.6),
      age: 0, speed: 0, puffs: [], untilPuff: 0 };
    var fx = {
      done: false,
      step: function (dt) {
        var r = rider;
        r.age += dt;
        // A beat for the horn, then off — across the board, away from the foundations.
        if (r.age > 0.35) r.speed = Math.min(230, r.speed + 260 * dt);
        r.x -= r.speed * dt;
        r.untilPuff -= dt;
        var gone = r.x < -r.height;
        if (!gone && r.age > 0.3 && r.untilPuff <= 0) {
          r.puffs.push([r.x + 0.5 * r.height, r.ground - 0.15 * r.height, 0]);
          r.untilPuff = 0.12;
        }
        for (var i = 0; i < r.puffs.length; i++) r.puffs[i][2] += dt;
        r.puffs = r.puffs.filter(function (p) { return p[2] <= 0.8; });
        if (gone && r.puffs.length === 0) fx.done = true;
      },
      draw: function (ctx) {
        var r = rider;
        for (var i = 0; i < r.puffs.length; i++) {
          var p = r.puffs[i], f = p[2] / 0.8;
          ctx.fillStyle = 'rgba(187,187,187,' + (0.45 * (1 - f)) + ')';
          ctx.beginPath(); ctx.arc(p[0], p[1] - 6 * f, 3 + 7 * f, 0, TAU); ctx.fill();
        }
        if (r.x < -r.height) return;
        var bounce = r.speed > 0 ? Math.sin(r.age * 40) * 0.6 : 0;
        ctx.save();
        ctx.translate(r.x, r.ground + bounce);
        ctx.scale(-r.height, r.height); // Facing left.
        drawScooter(ctx);
        ctx.restore();
      }
    };
    return fx;
  }

  // ------------------------------------------------------------------------------------------
  // The opening: prepare for landing

  var ANNOUNCEMENT = 'We will be arriving to Bermuda soon, please prepare for landing.';
  var SCROLL_SPEED = 140;
  var FONT = '600 18px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  // Material "Flight" icon (24×24 viewport), as Icons.Filled.Flight draws it: nose up.
  var PLANE = 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z';
  var planePath = null;

  function opening(w, h) {
    var m = document.createElement('canvas').getContext('2d');
    m.font = FONT;
    var textW = m.measureText(ANNOUNCEMENT).width;
    var rowW = 22 + 12 + textW;
    var crossing = (w + rowW + 32) / SCROLL_SPEED;
    var t = 0;
    if (!planePath && window.Path2D) planePath = new Path2D(PLANE);
    var fx = {
      done: false,
      step: function (dt) {
        t += dt;
        if (t >= 0.9 + crossing + 0.5) fx.done = true;
      },
      draw: function (ctx) {
        var scroll = Math.max(0, t - 0.9);
        var alpha;
        if (t < 0.9) alpha = 0;
        else if (t < 1.3) alpha = (t - 0.9) / 0.4;
        else if (scroll > crossing) alpha = 1 - (scroll - crossing) / 0.5;
        else alpha = 1;
        alpha = Math.max(0, Math.min(1, alpha));
        if (alpha <= 0) return;
        var top = h * 0.30, bandH = 48, mid = top + bandH / 2;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.rect(0, top, w, bandH); ctx.clip();
        ctx.fillStyle = 'rgba(33,33,33,0.82)';
        ctx.fillRect(0, top, w, bandH);
        var x0 = w - scroll * SCROLL_SPEED;
        if (planePath) {
          ctx.save();
          ctx.translate(x0, mid - 11);
          ctx.scale(22 / 24, 22 / 24);
          ctx.fillStyle = '#FFCC00';
          ctx.fill(planePath);
          ctx.restore();
        }
        ctx.font = FONT;
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(ANNOUNCEMENT, x0 + 34, mid);
        ctx.restore();
      }
    };
    return fx;
  }

  // ------------------------------------------------------------------------------------------
  // The kites

  var kiteColors = ['#E53935', '#FDD835', '#1E88E5', '#43A047', '#FB8C00', '#D81B60', '#8E24AA', '#FFFFFF'];
  var KiteStick = '#5A3E28';
  var KITES = 10, KITE_CAP = 18;

  function win(width, height) {
    var kites = [], launched = 0, untilNext = 0;
    function range(a, b) { return a + Math.random() * (b - a); }
    function shuffled(list) {
      var a = list.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = a[i]; a[i] = a[j]; a[j] = tmp; }
      return a;
    }
    function launch(x, fromY) {
      if (kites.length >= KITE_CAP) kites.shift();
      var three = shuffled(kiteColors).slice(0, 3);
      kites.push({
        baseX: x, startY: fromY, targetY: range(0.10, 0.55) * height,
        anchorX: x + range(-0.25, 0.25) * width,
        size: range(0.07, 0.12) * Math.max(Math.min(width, height), 400),
        outer: [three[0], three[1]], inner: three[2], tail: three[0],
        rise: range(2.4, 3.6), phase: Math.random() * 6.28, rate: range(0.9, 1.5),
        age: 0, x: x, y: fromY, angle: 0
      });
    }
    function corner(i, radius) {
      var a = (i * 60 - 90) * Math.PI / 180;
      return [Math.cos(a) * radius, Math.sin(a) * radius];
    }
    function hexPath(c, radius) {
      c.beginPath();
      for (var i = 0; i <= 6; i++) { var p = corner(i, radius); if (i === 0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]); }
      c.closePath();
    }
    function drawKite(c, k) {
      var cx = k.x, cy = k.y, r = k.size / 2, i, p;
      // The string, down off the bottom of the screen.
      c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 1; c.lineCap = 'butt';
      c.beginPath(); c.moveTo(cx, cy + r * 0.2); c.lineTo(k.anchorX, height + 40); c.stroke();
      // The tail: a long wavering line with little paper bows.
      var tailLen = k.size * 2.4;
      var px0 = cx, py0 = cy + r;
      for (i = 1; i <= 16; i++) {
        var f = i / 16;
        var tx = cx + Math.sin(k.phase * 2.2 - f * 5) * r * 0.5 * f, ty = cy + r + tailLen * f;
        c.strokeStyle = rgba(KiteStick, 0.8); c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(px0, py0); c.lineTo(tx, ty); c.stroke();
        if (i % 3 === 0) {
          var bw = r * 0.16;
          c.beginPath();
          c.moveTo(tx - bw, ty - bw * 0.6); c.lineTo(tx, ty); c.lineTo(tx - bw, ty + bw * 0.6); c.closePath();
          c.moveTo(tx + bw, ty - bw * 0.6); c.lineTo(tx, ty); c.lineTo(tx + bw, ty + bw * 0.6); c.closePath();
          c.fillStyle = k.tail; c.fill();
        }
        px0 = tx; py0 = ty;
      }
      c.save();
      c.translate(cx, cy);
      c.rotate(k.angle * Math.PI / 180);
      // Fringe: short paper frills around the rim.
      c.lineWidth = 1.6;
      for (i = 0; i < 36; i++) {
        var a = i * 10 * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
        c.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.9)' : rgba(k.inner, 0.9);
        c.beginPath(); c.moveTo(ca * r * 0.92, sa * r * 0.92); c.lineTo(ca * r * 1.12, sa * r * 1.12); c.stroke();
      }
      // Six tissue panels in two colours, an inner hexagon in a third.
      for (i = 0; i < 6; i++) {
        var p1 = corner(i, r), p2 = corner(i + 1, r);
        c.beginPath(); c.moveTo(0, 0); c.lineTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.closePath();
        c.fillStyle = k.outer[i % 2]; c.fill();
      }
      hexPath(c, r * 0.45); c.fillStyle = k.inner; c.fill();
      // Three sticks crossing at the centre, and the rim.
      c.strokeStyle = KiteStick; c.lineWidth = Math.max(1.2, r * 0.04);
      for (i = 0; i < 3; i++) {
        p = corner(i, r); var q = corner(i + 3, r);
        c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke();
      }
      hexPath(c, r); c.lineWidth = Math.max(1, r * 0.03); c.lineJoin = 'miter'; c.stroke();
      c.restore();
    }
    return {
      step: function (dt) {
        if (launched < KITES) {
          untilNext -= dt;
          if (untilNext <= 0) {
            launch(width * (0.08 + 0.84 * ((launched * 0.618) % 1)), height + 60);
            launched++;
            untilNext = range(0.45, 0.8);
          }
        }
        for (var i = 0; i < kites.length; i++) {
          var k = kites[i];
          k.age += dt;
          k.phase += k.rate * dt;
          var t = Math.min(1, k.age / k.rise);
          var ease = 1 - (1 - t) * (1 - t) * (1 - t);
          k.y = k.startY + (k.targetY - k.startY) * ease + Math.sin(k.phase * 1.3) * 6 * t;
          k.x = k.baseX + Math.sin(k.phase) * 14;
          k.angle = Math.sin(k.phase * 0.8) * 9;
        }
      },
      draw: function (ctx) {
        ctx.save();
        for (var i = 0; i < kites.length; i++) drawKite(ctx, kites[i]);
        ctx.restore();
      },
      // A tap: a kite goes up from the fingertip (in place of the confetti burst).
      tap: function (x, y) { launch(x, y); }
    };
  }

  LOCATIONS.bermuda = {
    surface: surface,
    animatedSurface: true,
    menuSurface: menuSurface,
    scenery: scenery,
    homeTouch: homeTouch,
    homeSound: 'scooter',
    opening: opening,
    openingSound: 'cabin_chime',
    openingHoldMs: 0,
    win: win,
    winDim: 0.25
  };
})();
