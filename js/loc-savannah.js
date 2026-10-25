/*
 * Savannah (home) — port of ui/Savannah.kt.
 * Scenery: the Forsyth Park fountain, its walkways, a picnic and two photographers.
 * Home touch: a riverboat sets out from the foundation. Opening: City Hall strikes three and the
 * crows fly. Win: the river parade. Card back: City Hall's gold dome on green.
 * Units: CSS px = dp. Time: seconds.
 */
(function () {
  'use strict';
  var PI = Math.PI;

  // ------------------------------------------------------------------------------------------
  // Helpers

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  /** Pixel scale of a (dpr-scaled) context, for sharp offscreen layers. */
  function scaleOf(ctx) {
    var m = ctx.getTransform ? ctx.getTransform() : null;
    var s = m ? Math.sqrt(m.a * m.a + m.b * m.b) : (window.devicePixelRatio || 1);
    return s > 0 ? s : 1;
  }

  /**
   * graphicsLayer(alpha, Offscreen): draws fn(octx) into an offscreen canvas of w × h (local
   * coordinates), then composites it at (x, y) with globalAlpha.
   */
  function layer(ctx, x, y, w, h, alpha, fn) {
    if (w <= 0 || h <= 0) return;
    var s = scaleOf(ctx);
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * s));
    c.height = Math.max(1, Math.ceil(h * s));
    var o = c.getContext('2d');
    o.setTransform(s, 0, 0, s, 0, 0);
    fn(o);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(c, x, y, c.width / s, c.height / s);
    ctx.restore();
  }

  function fillPoly(ctx, p, color) {
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  /** Compose drawOval(topLeft, size). */
  function oval(ctx, l, t, w, h) {
    ctx.beginPath();
    ctx.ellipse(l + w / 2, t + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, 2 * PI);
  }
  function fillOval(ctx, color, l, t, w, h) { oval(ctx, l, t, w, h); ctx.fillStyle = color; ctx.fill(); }
  function strokeOval(ctx, color, l, t, w, h, width) {
    oval(ctx, l, t, w, h); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'butt'; ctx.stroke();
  }
  function fillCircle(ctx, color, r, x, y) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * PI); ctx.fillStyle = color; ctx.fill();
  }

  /** Compose drawArc(start°, sweep°, useCenter, topLeft, size) — fill, or stroke when width given. */
  function arc(ctx, color, start, sweep, useCenter, l, t, w, h, width) {
    var cx = l + w / 2, cy = t + h / 2;
    var a0 = start * PI / 180, a1 = (start + sweep) * PI / 180;
    ctx.beginPath();
    if (useCenter) ctx.moveTo(cx, cy);
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, a0, a1, sweep < 0);
    if (useCenter) ctx.closePath();
    if (width != null) {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'butt'; ctx.stroke();
    } else {
      ctx.fillStyle = color; ctx.fill();
    }
  }

  function line(ctx, color, x0, y0, x1, y1, width, cap) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = cap || 'butt';
    ctx.stroke();
  }

  function box(ctx, l, t, r, b, color) { ctx.fillStyle = color; ctx.fillRect(l, t, r - l, b - t); }

  function roundRect(ctx, color, l, t, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(l, t, w, h, r);
    else ctx.rect(l, t, w, h);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function vGrad(ctx, y0, y1, c0, c1) {
    var g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    return g;
  }

  // ------------------------------------------------------------------------------------------
  // The Forsyth Park fountain

  var IronWhite = '#F2F1EA';
  var IronShade = '#C9CCC4';
  function spray(a) { return 'rgba(255,255,255,' + a + ')'; }

  function fountainSize(layout) {
    var w = Math.min(layout.boardWidth * 0.56, 400);
    return { w: w, h: w * 0.66 };
  }

  function drawFountain(ctx, W, H) {
    var px = 1;
    var cx = W / 2;

    function bowl(y, rx, ry, depth) {
      ctx.beginPath();
      ctx.moveTo(cx - rx, y);
      ctx.ellipse(cx, y, rx, depth, 0, PI, 0, true);
      ctx.closePath();
      ctx.fillStyle = vGrad(ctx, y, y + depth, IronWhite, IronShade);
      ctx.fill();
      fillOval(ctx, '#7FB6CC', cx - rx, y - ry, 2 * rx, 2 * ry);
      strokeOval(ctx, IronWhite, cx - rx, y - ry, 2 * rx, 2 * ry, 1.6 * px);
    }

    function spill(y, rx, ry, toY) {
      for (var k = 0; k <= 8; k++) {
        var a = (15 + k * 150 / 8) * PI / 180;
        var x = cx + Math.cos(a) * rx;
        var top = y + Math.sin(a) * ry;
        var out = (x - cx) / rx * 3 * px;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.quadraticCurveTo(x + out * 2, top + (toY - top) * 0.3, x + out * 1.5, toY);
        ctx.strokeStyle = spray(k === 0 || k === 8 ? 0.6 : 0.35);
        ctx.lineWidth = 1.1 * px;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    // The basin: its wall, the water, the rim.
    var rimY = 0.80 * H, rimRx = 0.47 * W, rimRy = 0.055 * H, wallH = 0.09 * H;
    ctx.beginPath();
    ctx.moveTo(cx - rimRx, rimY);
    ctx.lineTo(cx - rimRx, rimY + wallH);
    ctx.ellipse(cx, rimY + wallH, rimRx, rimRy, 0, PI, 0, true);
    ctx.lineTo(cx + rimRx, rimY);
    ctx.closePath();
    ctx.fillStyle = vGrad(ctx, rimY, rimY + wallH + rimRy, IronWhite, IronShade);
    ctx.fill();
    oval(ctx, cx - rimRx, rimY - rimRy, 2 * rimRx, 2 * rimRy);
    ctx.fillStyle = vGrad(ctx, rimY - rimRy, rimY + rimRy, '#4F8FAD', '#8EC3D6');
    ctx.fill();
    strokeOval(ctx, IronWhite, cx - rimRx, rimY - rimRy, 2 * rimRx, 2 * rimRy, 2.2 * px);

    // The pedestal, in two stages, with a knop on each.
    var bowl1Y = 0.47 * H, bowl2Y = 0.28 * H;
    fillPoly(ctx, [cx - 0.045 * W, rimY, cx + 0.045 * W, rimY, cx + 0.02 * W, bowl1Y, cx - 0.02 * W, bowl1Y], IronWhite);
    fillOval(ctx, IronShade, cx - 0.035 * W, 0.62 * H, 0.07 * W, 0.04 * H);
    fillPoly(ctx, [cx - 0.016 * W, bowl1Y, cx + 0.016 * W, bowl1Y, cx + 0.01 * W, bowl2Y, cx - 0.01 * W, bowl2Y], IronWhite);
    fillOval(ctx, IronShade, cx - 0.022 * W, 0.37 * H, 0.044 * W, 0.03 * H);

    // Tritons at the foot of the pedestal, each blowing a horn of water out into the basin.
    var s = 0.09 * H;
    [-1, 1].forEach(function (side) {
      ctx.save();
      ctx.translate(cx + side * 0.13 * W, rimY - 0.01 * H);
      ctx.scale(side, 1);
      ctx.beginPath();
      ctx.moveTo(-0.1 * s, -0.15 * s);
      ctx.quadraticCurveTo(-0.9 * s, 0.05 * s, -0.85 * s, -0.45 * s);
      ctx.strokeStyle = IronWhite; ctx.lineWidth = 0.22 * s; ctx.lineCap = 'round'; ctx.stroke();
      fillOval(ctx, IronWhite, -0.2 * s, -0.95 * s, 0.38 * s, 0.85 * s);
      fillCircle(ctx, IronWhite, 0.16 * s, 0.05 * s, -1.08 * s);
      line(ctx, IronWhite, 0.1 * s, -0.82 * s, 0.45 * s, -1.15 * s, 0.12 * s, 'round');
      fillPoly(ctx, [0.12 * s, -1.06 * s, 0.62 * s, -1.38 * s, 0.70 * s, -1.22 * s], IronShade);
      ctx.beginPath();
      ctx.moveTo(0.68 * s, -1.32 * s);
      ctx.quadraticCurveTo(1.6 * s, -2.1 * s, 2.6 * s, 0);
      ctx.strokeStyle = spray(0.55); ctx.lineWidth = 0.07 * s; ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
    });

    // The lower bowl spills into the basin, the upper bowl into the lower.
    bowl(bowl1Y, 0.17 * W, 0.022 * H, 0.06 * H);
    spill(bowl1Y, 0.17 * W, 0.022 * H, rimY);
    bowl(bowl2Y, 0.08 * W, 0.012 * H, 0.035 * H);
    spill(bowl2Y, 0.08 * W, 0.012 * H, bowl1Y);

    // The figure on top: a plinth, a long robe, her head, and the staff in her raised hand.
    fillPoly(ctx, [cx - 0.02 * W, bowl2Y - 0.008 * H, cx + 0.02 * W, bowl2Y - 0.008 * H, cx + 0.015 * W, 0.245 * H, cx - 0.015 * W, 0.245 * H], IronShade);
    fillPoly(ctx, [cx - 0.018 * W, 0.245 * H, cx + 0.018 * W, 0.245 * H, cx + 0.009 * W, 0.11 * H, cx - 0.009 * W, 0.11 * H], IronWhite);
    fillCircle(ctx, IronWhite, 0.012 * W, cx, 0.095 * H);
    line(ctx, IronWhite, cx + 0.006 * W, 0.13 * H, cx + 0.024 * W, 0.10 * H, 0.008 * W, 'round');
    line(ctx, IronShade, cx + 0.026 * W, 0.03 * H, cx + 0.026 * W, 0.22 * H, 1.3 * px);

    // The low iron fence around the basin, in front.
    var fenceY = rimY + wallH * 0.75, fenceRx = 0.50 * W, fenceRy = 0.085 * H, post = 0.07 * H;
    var fence = 'rgba(28,31,28,0.8)';
    arc(ctx, fence, 0, 180, false, cx - fenceRx, fenceY - post - fenceRy, 2 * fenceRx, 2 * fenceRy, 1.4 * px);
    arc(ctx, fence, 0, 180, false, cx - fenceRx, fenceY - 0.2 * post - fenceRy, 2 * fenceRx, 2 * fenceRy, 1.2 * px);
    var posts = Math.floor(PI * fenceRx / (13 * px));
    for (var k = 0; k <= posts; k++) {
      var a = PI * k / posts;
      var x = cx + Math.cos(a) * fenceRx;
      var y = fenceY + Math.sin(a) * fenceRy;
      line(ctx, fence, x, y - post, x, y, 0.9 * px);
    }
  }

  // ------------------------------------------------------------------------------------------
  // The walkways

  var Paving = '#E6DDCB';

  function drawWalks(ctx, layout, height) {
    var f = fountainSize(layout), fw = f.w, fh = f.h;
    var top = height - 12 - fh * 0.30;
    var W = layout.boardWidth, H = height - top;
    layer(ctx, 0, top, W, H, 0.30, function (c) {
      var cx = W / 2;
      var gy = height - 12 - fh * 0.06 - top;
      var rx = 0.58 * fw, ry = 0.13 * fh;
      c.fillStyle = Paving;
      [-1, 1].forEach(function (side) {
        c.beginPath();
        c.moveTo(cx + side * rx * 0.8, gy - ry * 0.75);
        c.lineTo(cx + side * W * 0.6, gy - ry * 1.15);
        c.lineTo(cx + side * W * 0.6, gy - ry * 0.55);
        c.lineTo(cx + side * rx * 0.8, gy + ry * 0.45);
        c.closePath();
        c.fill();
      });
      c.beginPath();
      c.moveTo(cx - 0.17 * fw, gy);
      c.lineTo(cx + 0.17 * fw, gy);
      c.lineTo(cx + 0.26 * fw, H);
      c.lineTo(cx - 0.26 * fw, H);
      c.closePath();
      c.fill();
      fillOval(c, Paving, cx - rx, gy - ry, 2 * rx, 2 * ry);
    });
  }

  // ------------------------------------------------------------------------------------------
  // People at the fountain

  var skinTones = ['#F1C9A5', '#C68E63', '#8D5A3B', '#E0AC85'];
  var Hair = '#2B211C';
  var Gingham = 'rgba(192,57,43,0.85)';
  var Wicker = '#9C6B3A';

  function drawPhotographer(ctx, u, shirt, pants, skin, camera) {
    line(ctx, pants, -0.04 * u, -0.45 * u, -0.07 * u, -0.02 * u, 0.09 * u, 'round');
    line(ctx, pants, 0.05 * u, -0.45 * u, 0.07 * u, -0.02 * u, 0.09 * u, 'round');
    roundRect(ctx, shirt, -0.11 * u, -0.80 * u, 0.22 * u, 0.38 * u, 0.06 * u);
    fillCircle(ctx, skin, 0.085 * u, -0.01 * u, -0.90 * u);
    arc(ctx, Hair, 180, 180, true, -0.095 * u, -0.99 * u, 0.17 * u, 0.15 * u);
    if (camera) {
      line(ctx, shirt, -0.05 * u, -0.76 * u, -0.17 * u, -0.80 * u, 0.07 * u, 'round');
      line(ctx, skin, -0.17 * u, -0.80 * u, -0.14 * u, -0.89 * u, 0.05 * u, 'round');
      roundRect(ctx, '#151515', -0.22 * u, -0.95 * u, 0.11 * u, 0.075 * u, 0.015 * u);
      fillCircle(ctx, '#4A4A4A', 0.025 * u, -0.235 * u, -0.912 * u);
    } else {
      line(ctx, shirt, -0.06 * u, -0.76 * u, -0.20 * u, -0.84 * u, 0.07 * u, 'round');
      line(ctx, skin, -0.20 * u, -0.84 * u, -0.25 * u, -0.90 * u, 0.05 * u, 'round');
      roundRect(ctx, '#151515', -0.29 * u, -0.99 * u, 0.05 * u, 0.095 * u, 0.012 * u);
    }
  }

  function drawSitter(ctx, u, x, shirt, legs, skin, facing, kneesUp) {
    var seat = -0.09 * u;
    var hipX = x, hipY = seat - 0.02 * u;
    if (kneesUp) {
      var kx = x + facing * 0.18 * u, ky = seat - 0.24 * u;
      line(ctx, legs, hipX, hipY, kx, ky, 0.09 * u, 'round');
      line(ctx, legs, kx, ky, x + facing * 0.30 * u, seat, 0.08 * u, 'round');
      line(ctx, shirt, x, seat - 0.30 * u, kx - facing * 0.02 * u, ky + 0.02 * u, 0.06 * u, 'round');
    } else {
      line(ctx, legs, hipX, hipY, x + facing * 0.34 * u, seat - 0.01 * u, 0.09 * u, 'round');
      line(ctx, shirt, x, seat - 0.30 * u, x - facing * 0.12 * u, seat, 0.06 * u, 'round');
    }
    roundRect(ctx, shirt, x - 0.09 * u, seat - 0.40 * u, 0.18 * u, 0.38 * u, 0.06 * u);
    fillCircle(ctx, skin, 0.08 * u, x + facing * 0.01 * u, seat - 0.49 * u);
    arc(ctx, Hair, 180, 180, true, x + facing * 0.01 * u - 0.085 * u, seat - 0.575 * u, 0.17 * u, 0.15 * u);
  }

  function drawPicnic(ctx, u) {
    var bw = 1.25 * u, bd = 0.16 * u, x0 = -bw, sk = 0.12 * u;
    fillPoly(ctx, [x0, 0, 0, 0, sk, -bd, x0 + sk, -bd], '#FFFFFF');
    var cols = 10, rows = 3;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      if ((r + c) % 2 === 1) continue;
      var t0 = r / rows, t1 = (r + 1) / rows;
      var a = x0 + c * bw / cols, b = x0 + (c + 1) * bw / cols;
      fillPoly(ctx, [a + sk * t0, -bd * t0, b + sk * t0, -bd * t0, b + sk * t1, -bd * t1, a + sk * t1, -bd * t1], Gingham);
    }
    ctx.fillStyle = Wicker;
    ctx.fillRect(-0.32 * u, -0.20 * u, 0.20 * u, 0.12 * u);
    arc(ctx, Wicker, 180, 180, false, -0.29 * u, -0.30 * u, 0.14 * u, 0.16 * u, 0.025 * u);
    drawSitter(ctx, u, -0.95 * u, '#7A9E7E', '#3E4A5C', skinTones[2], 1, true);
    drawSitter(ctx, u, -0.50 * u, '#D9786A', '#E8E2D4', skinTones[3], -1, false);
  }

  function drawVisitors(ctx, layout, height) {
    var f = fountainSize(layout), fw = f.w, fh = f.h;
    var p = fh * 0.22;
    var ground = height - 12 - fh * 0.03;
    var left = (layout.boardWidth - fw) / 2;
    var H = p * 2.2;
    layer(ctx, 0, ground - H, layout.boardWidth, H, 0.88, function (c) {
      var u = p, g = H;
      c.save();
      c.translate(left + fw * 0.02 - 0.45 * u, g - 1.0 * u);
      c.scale(0.85, 0.85);
      drawPicnic(c, u);
      c.restore();
      c.save();
      c.translate(left + fw * 0.98 + 0.35 * u, g);
      drawPhotographer(c, u, '#2E5C8A', '#3A3A40', skinTones[1], false);
      c.restore();
      c.save();
      c.translate(left + fw * 0.98 + 0.85 * u, g);
      c.scale(0.92, 0.92);
      drawPhotographer(c, u, '#D9A441', '#5A4632', skinTones[0], true);
      c.restore();
    });
  }

  function scenery(ctx, layout, sceneHeight) {
    drawWalks(ctx, layout, sceneHeight);
    var f = fountainSize(layout);
    layer(ctx, (layout.boardWidth - f.w) / 2, sceneHeight - f.h - 12, f.w, f.h, 0.88, function (c) {
      drawFountain(c, f.w, f.h);
    });
    drawVisitors(ctx, layout, sceneHeight);
  }

  // ------------------------------------------------------------------------------------------
  // The riverboat (unit drawing: facing right, waterline at origin, height 1 to the stack tops)

  var BoatWhite = '#F7F5F0';
  var BoatRed = '#B3262C';
  var Window = '#2B3540';
  var Stack = '#1C1C1C';
  var Crown = '#D4A72C';

  function drawRiverboat(ctx, wheel) {
    function windows(l, r, t, b) {
      for (var x = l; x + 0.05 < r; x += 0.09) box(ctx, x, t, x + 0.05, b, Window);
    }

    // The stern wheel, behind the hull, cut off at the waterline.
    ctx.save();
    ctx.beginPath();
    ctx.rect(-3, -3, 6, 3);
    ctx.clip();
    var hx = -1.22, hy = -0.13;
    line(ctx, BoatRed, -0.98, -0.32, hx, hy, 0.035);
    ctx.beginPath(); ctx.arc(hx, hy, 0.21, 0, 2 * PI);
    ctx.strokeStyle = BoatRed; ctx.lineWidth = 0.035; ctx.stroke();
    for (var k = 0; k < 8; k++) {
      var a = wheel + k * PI / 4, dx = Math.cos(a), dy = Math.sin(a);
      line(ctx, BoatRed, hx, hy, hx + dx * 0.21, hy + dy * 0.21, 0.022);
      line(ctx, BoatRed, hx + dx * 0.13, hy + dy * 0.13, hx + dx * 0.25, hy + dy * 0.25, 0.06);
    }
    fillCircle(ctx, Stack, 0.035, hx, hy);
    ctx.restore();

    // Hull: a raised bow, a red stripe.
    fillPoly(ctx, [-1.02, 0, 0.98, 0, 1.16, -0.21, -1.04, -0.21], BoatWhite);
    fillPoly(ctx, [-1.03, -0.07, 1.04, -0.07, 1.08, -0.11, -1.03, -0.11], BoatRed);

    // Three decks, each with its row of windows and red trim.
    box(ctx, -0.95, -0.40, 0.82, -0.21, BoatWhite);
    windows(-0.89, 0.78, -0.35, -0.26);
    box(ctx, -1.0, -0.43, 0.90, -0.40, BoatRed);
    box(ctx, -0.86, -0.60, 0.64, -0.43, BoatWhite);
    windows(-0.80, 0.60, -0.56, -0.48);
    box(ctx, -0.90, -0.63, 0.70, -0.60, BoatRed);
    // The open top deck: a rail on posts.
    line(ctx, BoatWhite, -0.72, -0.71, 0.44, -0.71, 0.02);
    for (var p = -0.72; p <= 0.44 + 1e-6; p += 0.08) line(ctx, BoatWhite, p, -0.71, p, -0.63, 0.012);

    // The pilot house.
    box(ctx, 0.10, -0.84, 0.38, -0.63, BoatWhite);
    box(ctx, 0.13, -0.80, 0.35, -0.74, Window);
    box(ctx, 0.07, -0.87, 0.41, -0.84, BoatRed);

    // Twin stacks forward, with gold crowns.
    [0.50, 0.64].forEach(function (sx) {
      box(ctx, sx - 0.03, -1.0, sx + 0.03, -0.60, Stack);
      ctx.beginPath();
      ctx.moveTo(sx - 0.045, -0.98);
      for (var k = 0; k <= 4; k++) ctx.lineTo(sx - 0.045 + k * 0.0225, k % 2 === 0 ? -1.07 : -1.02);
      ctx.lineTo(sx + 0.045, -0.98);
      ctx.closePath();
      ctx.fillStyle = Crown;
      ctx.fill();
    });
  }

  /** Home touch: a riverboat sets out from foundation f and sails off to the left. */
  function homeTouch(layout, f) {
    var slot = layout.foundationRect(f);
    var b = { x: slot.cx, waterline: slot.bottom, height: Math.max(34, layout.cardHeight * 0.5),
      age: 0, speed: 0, wheel: 0, wake: [], untilWake: 0 };
    var fx = {
      done: false,
      step: function (dt) {
        b.age += dt;
        if (b.age > 0.3) b.speed = Math.min(110, b.speed + 120 * dt);
        b.x -= b.speed * dt;
        b.wheel -= (1.2 + b.speed / 20) * dt;
        b.untilWake -= dt;
        var away = b.x < -1.4 * b.height;
        // (Kotlin keeps laying wake after the boat has left, so its wake never empties; stop
        // laying it once the boat is off the board so the effect can finish.)
        if (!away && b.age > 0.3 && b.untilWake <= 0) {
          b.wake.push([b.x + 1.3 * b.height, 0]);
          b.untilWake = 0.09;
        }
        for (var i = 0; i < b.wake.length; i++) b.wake[i][1] += dt;
        b.wake = b.wake.filter(function (w) { return w[1] <= 1.2; });
        if (away && b.wake.length === 0) fx.done = true;
      },
      draw: function (ctx) {
        var y = b.waterline, h = b.height;
        fillOval(ctx, 'rgba(61,127,166,0.45)', b.x - 1.4 * h, y - 0.05 * h, 2.9 * h, 0.12 * h);
        for (var i = 0; i < b.wake.length; i++) {
          var w = b.wake[i], f = w[1] / 1.2, half = (0.08 + 0.25 * f) * h;
          line(ctx, 'rgba(255,255,255,' + (0.5 * (1 - f)) + ')', w[0] - half, y + 0.01 * h, w[0] + half, y + 0.01 * h, 1.2, 'round');
        }
        ctx.save();
        ctx.translate(b.x, y);
        ctx.scale(-h, h); // Heading left.
        drawRiverboat(ctx, b.wheel);
        ctx.restore();
      }
    };
    return fx;
  }

  // ------------------------------------------------------------------------------------------
  // The opening: City Hall strikes three, and the crows fly

  var CrowBlack = '#111114';
  var CROWS = 11;

  function crowScale(c) { return 1 - 0.6 * Math.min(1, Math.max(0, c.age - c.delay) / 2); }

  /** A crow from behind, heading up (−y), wingspan 1, wings at lift (−1…1). */
  function drawCrow(ctx, lift) {
    fillOval(ctx, CrowBlack, -0.06, -0.16, 0.12, 0.30);
    fillCircle(ctx, CrowBlack, 0.055, 0, -0.19);
    fillPoly(ctx, [-0.03, 0.10, -0.09, 0.30, 0.09, 0.30, 0.03, 0.10], CrowBlack);
    var tip = -lift * 0.22;
    ctx.fillStyle = CrowBlack;
    [-1, 1].forEach(function (side) {
      ctx.beginPath();
      ctx.moveTo(0, -0.08);
      ctx.quadraticCurveTo(side * 0.22, -0.12 + tip * 0.5, side * 0.50, tip - 0.02);
      ctx.lineTo(side * 0.46, tip + 0.04);
      ctx.lineTo(side * 0.48, tip + 0.06);
      ctx.lineTo(side * 0.42, tip + 0.08);
      ctx.lineTo(side * 0.43, tip + 0.11);
      ctx.quadraticCurveTo(side * 0.22, 0.06 + tip * 0.4, 0, 0.06);
      ctx.closePath();
      ctx.fill();
    });
  }

  function opening(width, height) {
    var size = Math.min(1.8, Math.max(1, Math.min(width, height) / 400));
    var crows = [];
    for (var i = 0; i < CROWS; i++) {
      crows.push({
        x: width * rnd(0.30, 0.70), y: height * rnd(0.18, 0.40),
        heading: rnd(-1.25, 1.25), delay: rnd(0, 0.35),
        span: rnd(34, 48) * size, flap: Math.random() * 6.28,
        flapRate: rnd(12, 16), topSpeed: rnd(260, 360), age: 0, speed: 0
      });
    }
    var fx = {
      done: false,
      step: function (dt) {
        for (var i = 0; i < crows.length; i++) {
          var c = crows[i];
          c.age += dt;
          if (c.age < c.delay) continue;
          c.speed = Math.min(c.topSpeed, c.speed + 420 * dt);
          c.x += Math.sin(c.heading) * c.speed * dt;
          c.y -= Math.cos(c.heading) * c.speed * dt;
          c.flap += c.flapRate * dt;
        }
        crows = crows.filter(function (c) {
          return !(c.y < -60 || c.x < -60 || c.x > width + 60 || crowScale(c) < 0.2);
        });
        if (crows.length === 0) fx.done = true;
      },
      draw: function (ctx) {
        for (var i = 0; i < crows.length; i++) {
          var c = crows[i], sc = crowScale(c) * c.span;
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate(c.heading);
          ctx.scale(sc, sc);
          drawCrow(ctx, c.age < c.delay ? 0.9 : Math.sin(c.flap));
          ctx.restore();
        }
      }
    };
    return fx;
  }

  // ------------------------------------------------------------------------------------------
  // The win: the river parade

  var HullNavy = '#22313F';
  var HullBlack = '#1C1C1C';
  var AntiFoul = '#9E2B25';
  var boxColors = ['#2F6FA8', '#B8352C', '#E07B2A', '#3D8A4F', '#8C8F93',
    '#E9E6DD', '#6B4A8C', '#1F4E79', '#C9A227', '#7A2E2A'];

  var RIVERBOAT = { name: 'riverboat', bow: 1.16, stern: 1.45, horn: 'horn_whistle' };
  var CONTAINER = { name: 'container', bow: 2.62, stern: 2.55, horn: 'horn_ship' };
  var TUG = { name: 'tug', bow: 0.82, stern: 0.80, horn: 'horn_tug' };

  var SPEED = 70, HORNS = 10, GULLS = 7, GULL_CAP = 16;

  function drawContainerShip(ctx, boxes) {
    ctx.beginPath();
    ctx.moveTo(-2.48, 0);
    ctx.lineTo(2.25, 0);
    ctx.quadraticCurveTo(2.5, -0.12, 2.62, -0.38);
    ctx.lineTo(-2.55, -0.38);
    ctx.lineTo(-2.55, -0.08);
    ctx.closePath();
    ctx.fillStyle = HullNavy;
    ctx.fill();
    box(ctx, -2.5, -0.06, 2.28, 0, AntiFoul);
    box(ctx, -2.55, -0.40, 2.6, -0.38, '#E9E6DD');
    var i = 0;
    for (var c = 0; c < 16; c++) {
      var l = -1.72 + c * 0.245;
      var tiers = c >= 14 ? 2 : 3;
      for (var t = 0; t < tiers; t++) {
        var b = -0.40 - t * 0.14;
        box(ctx, l, b - 0.13, l + 0.225, b, boxes[i++ % boxes.length]);
      }
    }
    box(ctx, -2.38, -1.0, -1.86, -0.40, '#F2F1EA');
    for (var wy = -0.92; wy < -0.45; wy += 0.1) box(ctx, -2.32, wy, -1.92, wy + 0.035, Window);
    box(ctx, -2.48, -1.02, -1.78, -0.96, '#F2F1EA');
    box(ctx, -2.42, -0.99, -1.84, -0.965, Window);
    box(ctx, -2.32, -1.16, -2.12, -1.0, HullBlack);
    box(ctx, -2.32, -1.12, -2.12, -1.08, BoatRed);
    line(ctx, '#E9E6DD', 2.35, -0.40, 2.35, -0.78, 0.025);
  }

  function drawTug(ctx) {
    ctx.beginPath();
    ctx.moveTo(-0.74, 0);
    ctx.lineTo(0.55, 0);
    ctx.quadraticCurveTo(0.78, -0.08, 0.82, -0.30);
    ctx.lineTo(-0.80, -0.22);
    ctx.closePath();
    ctx.fillStyle = HullBlack;
    ctx.fill();
    box(ctx, -0.74, -0.05, 0.58, 0, BoatRed);
    line(ctx, '#3A3A3A', 0.62, -0.02, 0.80, -0.28, 0.07, 'round');
    for (var k = 0; k < 5; k++) fillCircle(ctx, '#2A2A2A', 0.045, -0.55 + k * 0.25, -0.17);
    box(ctx, -0.48, -0.46, 0.28, -0.24, BoatWhite);
    box(ctx, -0.42, -0.40, 0.20, -0.34, Window);
    box(ctx, -0.02, -0.72, 0.36, -0.46, BoatWhite);
    box(ctx, 0.02, -0.66, 0.32, -0.58, Window);
    box(ctx, -0.05, -0.75, 0.39, -0.72, BoatRed);
    box(ctx, -0.30, -0.80, -0.18, -0.46, HullBlack);
    box(ctx, -0.30, -0.76, -0.18, -0.70, BoatRed);
    line(ctx, BoatWhite, 0.18, -0.75, 0.18, -0.95, 0.02);
  }

  function win(width, height, play) {
    var waterTop = height * 0.70;
    var waterH = height - waterTop;
    var unit = Math.min(width, height) * 0.12;
    // Far, middle and near lanes; the middle runs the other way.
    var lanes = [
      { waterline: waterTop + 0.30 * waterH, scale: 0.6, dir: 1 },
      { waterline: waterTop + 0.60 * waterH, scale: 0.8, dir: -1 },
      { waterline: waterTop + 0.93 * waterH, scale: 1.0, dir: 1 }
    ];
    var ships = [], gulls = [];
    var launched = 0, untilNext = 0.8, time = 0;
    var shimmer = [];
    for (var i = 0; i < 36; i++) shimmer.push([Math.random() * width, Math.random(), rnd(10, 34)]);

    function gull(x, y, vy) {
      return {
        x: x, y: y, vx: (Math.random() < 0.5 ? 1 : -1) * rnd(35, 70), vy: vy,
        span: rnd(0.38, 0.62) * unit, flap: Math.random() * 6.28, flapRate: rnd(7, 10),
        glide: Math.random() * 6.28, glideRate: rnd(0.5, 0.9)
      };
    }
    for (i = 0; i < GULLS; i++) gulls.push(gull(Math.random() * width, rnd(0.08, 0.55) * height, 0));

    function sternIn(s) {
      return s.lane.dir > 0 ? s.x - s.kind.stern * s.unit : width - (s.x + s.kind.stern * s.unit);
    }
    function gone(s) {
      return s.lane.dir > 0 ? s.x - s.kind.stern * s.unit > width : s.x + s.kind.stern * s.unit < 0;
    }
    function nextKind() {
      if (launched === 0) return RIVERBOAT;
      if (launched === 1) return CONTAINER;
      if (launched === 2) return TUG;
      var r = Math.random();
      return r < 0.35 ? CONTAINER : r < 0.75 ? TUG : RIVERBOAT;
    }
    function clear(lane) {
      return !ships.some(function (s) { return s.lane === lane && sternIn(s) < 30; });
    }
    function launch() {
      var kind = nextKind();
      var allowed = kind === CONTAINER ? lanes.slice(0, 2)
        : kind === RIVERBOAT ? (launched === 0 ? lanes.slice(2) : lanes.slice(1))
        : lanes.slice();
      allowed = allowed.filter(clear);
      if (allowed.length === 0) { untilNext = 0.3; return; }
      var lane = pick(allowed);
      var u = unit * lane.scale;
      var x = lane.dir > 0 ? -kind.bow * u : width + kind.bow * u;
      var boxes = [];
      for (var k = 0; k < 48; k++) boxes.push(pick(boxColors));
      ships.push({ kind: kind, lane: lane, x: x, unit: u, boxes: boxes, horns: launched < HORNS,
        age: 0, wheel: 0, honked: false });
      launched++;
      untilNext = launched < HORNS ? rnd(1.4, 2.6) : rnd(3, 5);
    }

    function drawShip(ctx, s) {
      var y = s.lane.waterline, u = s.unit, dir = s.lane.dir;
      var front = s.x + dir * s.kind.bow * u;
      var back = s.x - dir * s.kind.stern * u;
      fillOval(ctx, 'rgba(14,42,53,0.45)', Math.min(front, back), y - 0.05 * u, Math.abs(front - back), 0.14 * u);
      line(ctx, 'rgba(255,255,255,0.6)', front - dir * 0.25 * u, y + 0.02 * u, front + dir * 0.06 * u, y + 0.02 * u, 1.4, 'round');
      for (var k = 0; k < 4; k++) {
        var f = (time * 1.6 + k / 4) % 1;
        var start = back - dir * (0.1 + f * 1.1) * u;
        var wy = y + (0.02 + 0.03 * (k % 2)) * u;
        line(ctx, 'rgba(255,255,255,' + (0.45 * (1 - f)) + ')', start, wy, start - dir * (0.25 + 0.3 * f) * u, wy, 1.2, 'round');
      }
      ctx.save();
      ctx.translate(s.x, y);
      ctx.scale(dir * u, u);
      if (s.kind === RIVERBOAT) drawRiverboat(ctx, s.wheel);
      else if (s.kind === CONTAINER) drawContainerShip(ctx, s.boxes);
      else drawTug(ctx);
      ctx.restore();
    }

    return {
      step: function (dt) {
        time += dt;
        untilNext -= dt;
        if (untilNext <= 0) launch();
        for (var i = 0; i < ships.length; i++) {
          var s = ships[i];
          s.age += dt;
          s.x += s.lane.dir * SPEED * s.lane.scale * dt;
          s.wheel -= 3 * dt;
          if (s.horns && !s.honked && s.age > 0.5) {
            s.honked = true;
            if (play) play(s.kind.horn);
          }
        }
        ships = ships.filter(function (s) { return !gone(s); });

        for (i = 0; i < gulls.length; i++) {
          var g = gulls[i];
          g.x += g.vx * dt;
          g.vy += -g.vy * 1.2 * dt;
          g.y += (g.vy + Math.sin(g.glide * 1.7) * 8) * dt;
          g.glide += g.glideRate * dt;
          // Flap, then glide a while.
          g.flap += g.flapRate * dt * (Math.sin(g.glide) > 0.35 ? 0.12 : 1);
          if (g.x < -40) g.x = width + 40;
          if (g.x > width + 40) g.x = -40;
          g.y = Math.min(waterTop - 20, Math.max(20, g.y));
        }
      },

      /** The water and the ships on it, behind the flying cards. */
      drawBehind: function (ctx) {
        var top = waterTop;
        ctx.fillStyle = vGrad(ctx, top, height, 'rgba(47,106,128,0.92)', 'rgba(29,74,92,0.97)');
        ctx.fillRect(0, top, width, height - top);
        // The far bank: Hutchinson Island, low and dark.
        ctx.fillStyle = 'rgba(36,59,40,0.75)';
        ctx.fillRect(0, top - 5, width, 6);
        for (var i = 0; i < shimmer.length; i++) {
          var sh = shimmer[i];
          var x = ((sh[0] + time * 12) % (width + 40)) - 20;
          var y = top + (0.08 + 0.9 * sh[1]) * waterH;
          line(ctx, 'rgba(255,255,255,' + (0.10 + 0.08 * Math.sin(time * 2 + sh[2])) + ')', x, y, x + sh[2], y, 1);
        }
        for (var l = 0; l < lanes.length; l++) {
          for (var k = 0; k < ships.length; k++) if (ships[k].lane === lanes[l]) drawShip(ctx, ships[k]);
        }
      },

      /** The gulls, above the cards. */
      draw: function (ctx) {
        for (var i = 0; i < gulls.length; i++) {
          var g = gulls[i];
          var x = g.x, y = g.y, half = g.span / 2;
          var lift = Math.sin(g.flap);
          var dir = g.vx > 0 ? 1 : -1;
          var tipY = y - lift * half * 0.55;
          var elbowY = y - half * 0.28 - lift * half * 0.2;
          var sw = Math.max(1.6, g.span * 0.09);
          ctx.beginPath();
          ctx.moveTo(x - half, tipY);
          ctx.quadraticCurveTo(x - half * 0.45, elbowY, x, y);
          ctx.quadraticCurveTo(x + half * 0.45, elbowY, x + half, tipY);
          ctx.strokeStyle = 'rgba(255,255,255,0.95)';
          ctx.lineWidth = sw;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'miter';
          ctx.stroke();
          // Dark wingtips, and a small body with its head toward the way it's flying.
          for (var side = -1; side <= 1; side += 2) {
            line(ctx, '#3A3A3A', x + side * half, tipY, x + side * half * 0.8, tipY + (elbowY - tipY) * 0.3, sw, 'round');
          }
          fillOval(ctx, '#FFFFFF', x - half * 0.22 + dir * half * 0.05, y - half * 0.06, half * 0.44, half * 0.16);
        }
      },

      /** A tap: a gull lifts off from the fingertip. */
      tap: function (x, y) {
        if (gulls.length >= GULL_CAP) gulls.splice(GULLS, 1);
        gulls.push(gull(x, y, -rnd(40, 80)));
      }
    };
  }

  // ------------------------------------------------------------------------------------------
  // The card back: City Hall's gold dome on green

  var backGreen = '#1E6640';
  var backGreenLight = '#2C8052';
  var gold = '#D4AF37';
  var goldLight = '#F6DA7A';
  var goldDark = '#A87A1A';
  var granite = '#E8E1D0';
  var graniteShade = '#B9B09C';

  function drawBack(ctx, w, h) {
    var density = 1;
    ctx.save();
    var pad = w * 0.08;
    var l = pad, t = pad, r = w - pad, b = h - pad;
    var g = ctx.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, h * 0.6);
    g.addColorStop(0, backGreenLight);
    g.addColorStop(1, backGreen);
    roundRect(ctx, g, l, t, r - l, b - t, w * 0.06);

    var frame = w * 0.05;
    l += frame; t += frame; r -= frame; b -= frame;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(l, t, r - l, b - t, w * 0.03); else ctx.rect(l, t, r - l, b - t);
    ctx.strokeStyle = gold;
    ctx.globalAlpha = 170 / 255;
    ctx.lineWidth = Math.max(0.6 * density, w * 0.012);
    ctx.lineCap = 'butt';
    ctx.stroke();
    ctx.globalAlpha = 1;

    var cx = w / 2;
    // The roof line of the building the dome sits on.
    box(ctx, cx - w * 0.30, h * 0.64, cx + w * 0.30, h * 0.70, granite);
    box(ctx, cx - w * 0.30, h * 0.68, cx + w * 0.30, h * 0.70, graniteShade);

    // The drum, its columns and the clock.
    box(ctx, cx - w * 0.20, h * 0.50, cx + w * 0.20, h * 0.64, granite);
    [-0.17, -0.11, 0.11, 0.17].forEach(function (k) {
      box(ctx, cx + k * w - w * 0.012, h * 0.505, cx + k * w + w * 0.012, h * 0.635, graniteShade);
    });
    var clockY = h * 0.57, clockR = w * 0.055;
    fillCircle(ctx, '#FFFFFF', clockR, cx, clockY);
    ctx.beginPath(); ctx.arc(cx, clockY, clockR, 0, 2 * PI);
    ctx.strokeStyle = goldDark; ctx.lineWidth = Math.max(0.5 * density, w * 0.01); ctx.stroke();
    var hw = Math.max(0.5 * density, w * 0.008);
    line(ctx, '#000000', cx, clockY, cx, clockY - clockR * 0.75, hw);
    line(ctx, '#000000', cx, clockY, cx + clockR * 0.5, clockY, hw);

    // The dome: a gilded half-ellipse with ribs, a cornice band under it.
    box(ctx, cx - w * 0.225, h * 0.49, cx + w * 0.225, h * 0.51, gold);
    var domeTop = h * 0.31, domeBase = h * 0.49;
    var lg = ctx.createLinearGradient(cx - w * 0.21, 0, cx + w * 0.21, 0);
    lg.addColorStop(0, goldDark);
    lg.addColorStop(0.35, goldLight);
    lg.addColorStop(0.6, gold);
    lg.addColorStop(1, goldDark);
    ctx.beginPath();
    ctx.moveTo(cx, domeBase);
    ctx.ellipse(cx, domeBase, w * 0.21, domeBase - domeTop, 0, PI, 2 * PI, false);
    ctx.closePath();
    ctx.fillStyle = lg;
    ctx.fill();
    ctx.strokeStyle = goldDark;
    ctx.lineWidth = Math.max(0.4 * density, w * 0.008);
    [-0.6, -0.25, 0.25, 0.6].forEach(function (k) {
      ctx.beginPath();
      ctx.moveTo(cx + k * w * 0.21, domeBase);
      ctx.quadraticCurveTo(cx + k * w * 0.21 * 0.95, domeTop + (domeBase - domeTop) * 0.25, cx, domeTop);
      ctx.stroke();
    });

    // The lantern, its gold cap, and the finial.
    box(ctx, cx - w * 0.045, h * 0.26, cx + w * 0.045, h * 0.315, granite);
    arc(ctx, gold, 180, 180, true, cx - w * 0.055, h * 0.225, w * 0.11, h * 0.07);
    line(ctx, gold, cx, h * 0.23, cx, h * 0.18, Math.max(0.6 * density, w * 0.014));
    fillCircle(ctx, gold, w * 0.012, cx, h * 0.18);
    ctx.restore();
    return true;
  }

  // ------------------------------------------------------------------------------------------

  window.LOCATIONS = window.LOCATIONS || {};
  window.LOCATIONS.savannah = {
    scenery: scenery,
    homeTouch: homeTouch,
    homeSound: 'boarding',
    opening: opening,
    openingSound: 'city_hall',
    openingHoldMs: 2400,
    win: win,
    winDim: 0.25,
    drawBack: drawBack
  };
})();
