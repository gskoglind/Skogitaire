/*
 * Sydney (LOCATION-BIBLE §5). Port of Sydney.kt: the Botanic Garden lawn, the Harbour Bridge on
 * its strip of harbour, the "Please walk on the grass" sign, flying foxes off the foundations,
 * and the fireworks engine (opening show with its dusk wash, and the win show).
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

  // ---------------------------------------------------------------- bridge and sign

  var STEEL = '#3F4A53', GRANITE = '#9A9284', GRANITE_DARK = '#6F685D';

  /** dp per metre: the bridge's 650 m, pylon to pylon, across nearly the whole board. */
  function bridgeScale(layout) { return Math.min(layout.boardWidth * 0.94, 900) / 650; }
  function harbourHeight(layout) { return Math.max(14, bridgeScale(layout) * 22); }

  function harbourBridge(ctx, layout, height) {
    var s = bridgeScale(layout);
    var water = harbourHeight(layout);
    var bridgeHeight = 140 * s;
    var bw = layout.boardWidth;
    layer(ctx, 0, height - bridgeHeight - water, bw, bridgeHeight + water, 0.85, function (c, W, H) {
      var waterY = bridgeHeight;
      var left = (bw - 650 * s) / 2;
      function x(m) { return left + m * s; }
      function y(m) { return waterY - m * s; }
      function line(x1, y1, x2, y2, width, cap) {
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
        c.lineWidth = width; c.lineCap = cap || 'butt'; c.stroke();
      }

      // The harbour, with a few lighter ripples (fixed seed).
      c.fillStyle = 'rgba(31,94,134,0.75)';
      c.fillRect(0, waterY, W, H - waterY);
      var ripples = window.SEEDED ? window.SEEDED(7) : { next: Math.random };
      c.strokeStyle = 'rgba(255,255,255,0.18)';
      var n = Math.floor(W / 40);
      for (var r = 0; r < n; r++) {
        var rx = ripples.next() * W;
        var ry = waterY + (0.2 + 0.6 * ripples.next()) * (H - waterY);
        var len = 10 + ripples.next() * 18;
        line(rx, ry, rx + len, ry, 1.2, 'round');
      }

      // The arch.
      var center = 325, half = 251.5;
      function lower(u) { return 118 * (1 - u * u); }
      function upper(u) { return 60 + 74 * (1 - u * u); }
      var chord = Math.max(2, 6 * s);
      var member = Math.max(1, 2.2 * s);
      c.strokeStyle = STEEL;
      var panels = 28;
      for (var i = 0; i <= panels; i++) {
        var u = -1 + 2 * i / panels;
        var mx = x(center + u * half);
        line(mx, y(lower(u)), mx, y(upper(u)), member);
        if (i < panels) {
          var u2 = -1 + 2 * (i + 1) / panels;
          var mx2 = x(center + u2 * half);
          if (i % 2 === 0) line(mx, y(lower(u)), mx2, y(upper(u2)), member);
          else line(mx, y(upper(u)), mx2, y(lower(u2)), member);
        }
        if (Math.abs(lower(u) - 49) > 4) line(mx, y(lower(u)), mx, y(49), member);
      }
      [lower, upper].forEach(function (hf) {
        c.beginPath();
        for (var k = 0; k <= 60; k++) {
          var uu = -1 + 2 * k / 60;
          var px = x(center + uu * half), py = y(hf(uu));
          if (k === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.lineWidth = chord; c.lineCap = 'butt'; c.lineJoin = 'miter'; c.stroke();
      });

      // The deck, out onto the approaches on piers, to the edges of the board.
      c.fillStyle = STEEL;
      c.fillRect(0, y(49), W, 8 * s);
      var pier = -10;
      while (x(pier) > 0) {
        [pier, 650 - pier].forEach(function (m) { c.fillRect(x(m) - member, y(41), 2 * member, 41 * s); });
        pier -= 45;
      }

      // Granite pylons, tapering, with a cornice and darker courses.
      [40, 610].forEach(function (p) {
        c.beginPath();
        c.moveTo(x(p - 25), y(0));
        c.lineTo(x(p + 25), y(0));
        c.lineTo(x(p + 21), y(82));
        c.lineTo(x(p - 21), y(82));
        c.closePath();
        c.fillStyle = GRANITE; c.fill();
        c.fillStyle = GRANITE_DARK; c.fillRect(x(p - 23), y(86), 46 * s, 4 * s);
        c.fillStyle = GRANITE; c.fillRect(x(p - 18), y(89), 36 * s, 3 * s);
        c.fillStyle = GRANITE_DARK;
        [20, 62].forEach(function (hh) { c.fillRect(x(p - 24), y(hh), 48 * s, 1.2 * s); });
      });
    });
  }

  /** "Please walk on the grass", on a small green board on a post above the left pylon. */
  function grassSign(ctx, layout, height) {
    var width = clamp(layout.boardWidth * 0.15, 74, 112);
    var post = width * 0.42;
    var boardH = width * 0.64;
    var left = 14;
    var top = height - harbourHeight(layout) - 100 * bridgeScale(layout) - boardH - post;
    var radius = width * 0.06, border = width * 0.025;
    ctx.save();
    // Board, with the border drawn inside its shape (as Compose's border does).
    roundRect(ctx, left, top, width, boardH, radius);
    ctx.fillStyle = '#EFE9D8'; ctx.fill();
    roundRect(ctx, left + border, top + border, width - 2 * border, boardH - 2 * border, Math.max(0, radius - border));
    ctx.fillStyle = '#1E4A2A'; ctx.fill();
    // Text: three centred lines.
    var fontSize = width * 0.135, lineH = width * 0.155;
    ctx.fillStyle = '#EFE9D8';
    ctx.font = '600 ' + fontSize + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var lines = ['Please', 'walk on', 'the grass'];
    var cx = left + width / 2, cy = top + boardH / 2;
    for (var i = 0; i < 3; i++) ctx.fillText(lines[i], cx, cy + (i - 1) * lineH);
    // Post, centred under the board.
    ctx.fillStyle = '#5A4632';
    ctx.fillRect(cx - width * 0.035, top + boardH, width * 0.07, post);
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
    homeSound: null,
    winDim: 0.40,
    animatedSurface: false,

    surface: function (ctx, w, h) { return drawLawn(ctx, w, h); },
    menuSurface: function (ctx, w, h) { return drawLawn(ctx, w, h); },

    scenery: function (ctx, layout, sceneHeight) {
      harbourBridge(ctx, layout, sceneHeight);
      grassSign(ctx, layout, sceneHeight);
    },

    /** A flying fox drops off the foundation, then flaps away across the board and out. */
    homeTouch: function (layout, f) {
      var slot = layout.foundationRect(f);
      var towardLeft = Math.random() < (slot.cx > layout.boardWidth / 2 ? 0.75 : 0.25);
      var dir = towardLeft ? -1 : 1;
      var bat = {
        x: slot.cx, y: slot.cy,
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
