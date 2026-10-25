/*
 * Japan — the starting table (LOCATION-BIBLE §4). Port of BoardView.kt Torii / Bamboo /
 * SealPetals and Celebration.kt's sakura petals. The felt is the app's default (no surface),
 * the opening is the flute the app plays, and there is no home sound.
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
  function rgba(c, a) {
    return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')';
  }

  // ---------------------------------------------------------------- scenery

  /** The great torii of Meiji Jingu, vermilion with a black cap, bottom-centre at 85%. */
  function torii(ctx, layout, height) {
    var w = Math.min(layout.boardWidth * 0.62, 440);
    var h = w * 0.71;
    layer(ctx, (layout.boardWidth - w) / 2, height - h - 28, w, h, 0.85, function (c, W, H) {
      var wood = '#E2452B', cap = '#1C1C1F';
      var sag = 0.05 * H;
      function beam(top, thickness, inset) {
        c.beginPath();
        c.moveTo(inset * W, top);
        c.quadraticCurveTo(W / 2, top + 2 * sag, W - inset * W, top);
        c.lineTo(W - (inset + 0.012) * W, top + thickness);
        c.quadraticCurveTo(W / 2, top + thickness + 2 * sag, (inset + 0.012) * W, top + thickness);
        c.closePath();
      }
      beam(0, 0.045 * H, 0); c.fillStyle = cap; c.fill();
      beam(0.045 * H, 0.065 * H, 0.035); c.fillStyle = wood; c.fill();

      var pillar = 0.072 * W;
      [0.2325, 0.7675].forEach(function (center) {
        var lean = center < 0.5 ? 0.006 * W : -0.006 * W;
        var cx = center * W;
        c.beginPath();
        c.moveTo(cx - pillar / 2 + lean, 0.12 * H);
        c.lineTo(cx + pillar / 2 + lean, 0.12 * H);
        c.lineTo(cx + pillar / 2 - lean * 0.2, H);
        c.lineTo(cx - pillar / 2 - lean * 0.2, H);
        c.closePath();
        c.fillStyle = wood; c.fill();
      });

      c.fillStyle = wood;
      c.fillRect(0.1 * W, 0.30 * H, 0.8 * W, 0.06 * H);
    });
  }

  // (base x in the stand, thickness dp, height as a fraction of the stand, lean, bend)
  var STALKS = [
    [0.08, 14, 1.00, 0.25, 0.10],
    [0.34, 12, 0.86, 0.35, 0.14],
    [0.52, 15, 0.94, 0.20, 0.08],
    [0.74, 9, 0.70, 0.40, 0.16],
    [0.22, 8, 0.62, 0.15, 0.06]
  ];

  /** A bamboo clump in each bottom corner, arching in, tone-on-tone at 42%. */
  function bamboo(ctx, layout, height) {
    var standWidth = Math.min(layout.boardWidth * 0.22, 170);
    var standHeight = Math.min(height * 0.7, standWidth * 2.6);
    var scale = standWidth / 170;
    layer(ctx, 0, height - standHeight, layout.boardWidth, standHeight, 0.42, function (c, SW, SH) {
      var cane = '#2F8A52', node = '#0F4426', leaf = '#2A7D4A';

      function stand(mirror) {
        function X(v) { return mirror ? SW - v : v; }
        STALKS.forEach(function (s, i) {
          var thick = s[1] * scale;
          var h = s[2] * SH;
          var bx = s[0] * standWidth;
          var tx = bx + s[3] * standWidth;
          var bend = s[4] * h;
          function point(t) {
            var lx = bx + (tx - bx) * t;
            return { x: X(lx + bend * t * t), y: SH - h * t };
          }
          var nodes = 7 + i % 3;
          for (var n = 0; n < nodes; n++) {
            var t0 = n / nodes, t1 = (n + 1) / nodes;
            var w0 = thick * (1 - 0.35 * t0) / 2;
            var w1 = thick * (1 - 0.35 * t1) / 2;
            var a = point(t0), b = point(t1);
            c.beginPath();
            c.moveTo(a.x - w0, a.y);
            c.lineTo(a.x + w0, a.y);
            c.lineTo(b.x + w1, b.y + 1.5);
            c.lineTo(b.x - w1, b.y + 1.5);
            c.closePath();
            c.fillStyle = cane; c.fill();
            if (n > 0) { c.fillStyle = node; c.fillRect(a.x - w0 * 1.15, a.y - 0.9, w0 * 2.3, 1.8); }
          }

          // Leaf sprays near the top: narrow blades drooping outward.
          for (var k = 0; k < 4; k++) {
            var t = 0.52 + k * 0.13;
            if (t > 1) break;
            var at = point(t);
            var out = (k + i) % 2 === 0 ? 1 : -1;
            for (var j = 0; j < 3; j++) {
              var len = (34 + 10 * ((i + j + k) % 3)) * scale;
              var angle = out * (0.35 + 0.38 * j);
              if (mirror) angle = -angle;
              var dx = Math.sin(angle) * len;
              var dy = Math.cos(angle) * len * 0.55;
              var d = Math.hypot(dx, dy);
              var nx = -dy / d * len * 0.12;
              var ny = dx / d * len * 0.12;
              var tipX = at.x + dx, tipY = at.y + dy;
              var midX = at.x + dx * 0.45, midY = at.y + dy * 0.45;
              c.beginPath();
              c.moveTo(at.x, at.y);
              c.quadraticCurveTo(midX + nx, midY + ny, tipX, tipY);
              c.quadraticCurveTo(midX - nx, midY - ny, at.x, at.y);
              c.closePath();
              c.fillStyle = leaf; c.fill();
            }
          }
        });
      }
      stand(false);
      stand(true);
    });
  }

  // ---------------------------------------------------------------- sakura petals

  /** Sakura pinks, pale to deep — no confetti red or white. */
  var SAKURA = ['#FFB7C5', '#FFB7C5', '#F9C9D6', '#F9C9D6', '#FDE3EA', '#E88AA0', '#E88AA0', '#D4566F'].map(hex);
  var DEEP = '#D4566F';

  function range(a, b) { return a + Math.random() * (b - a); }

  function sakuraPetal(x, y, vx, vy, allowBlossom) {
    if (allowBlossom === undefined) allowBlossom = true;
    var blossom = allowBlossom && Math.random() < 0.2;
    return {
      x: x, y: y, vx: vx, vy: vy,
      size: blossom ? range(22, 30) : range(12, 19),
      angle: Math.random() * 2 * PI, spin: range(-0.6, 0.6),
      color: SAKURA[Math.floor(Math.random() * SAKURA.length)], blossom: blossom,
      fall: range(45, 95), drift: range(-10, 25),
      swayPhase: Math.random() * 2 * PI, swayRate: range(1.2, 2.4), swayAmp: range(8, 22),
      flutterPhase: Math.random() * 2 * PI,
      flutterRate: blossom ? range(0.4, 0.9) : range(1.0, 2.2)
    };
  }

  /** Air drag: velocity relaxes toward the petal's own slow fall and drift. */
  function stepPetal(p, dt) {
    p.vx += (p.drift - p.vx) * 1.6 * dt;
    p.vy += (p.fall - p.vy) * 1.6 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.angle += p.spin * dt;
    p.swayPhase += p.swayRate * dt;
    p.flutterPhase += p.flutterRate * dt;
  }

  /** One petal, base at the centre, notched tip pointing up; unit length. */
  function petalPath(c) {
    var w = 0.62;
    c.moveTo(0, 0.5);
    c.bezierCurveTo(-w * 0.55, 0.25, -w * 0.6, -0.3, -w * 0.18, -0.5);
    c.lineTo(0, -0.38);
    c.lineTo(w * 0.18, -0.5);
    c.bezierCurveTo(w * 0.6, -0.3, w * 0.55, 0.25, 0, 0.5);
    c.closePath();
  }

  function drawPetal(ctx, p, alpha) {
    if (alpha === undefined) alpha = 1;
    if (alpha <= 0) return;
    var px = p.x + Math.sin(p.swayPhase) * p.swayAmp;
    var flutter = Math.cos(p.flutterPhase);
    var col = p.color;
    if (flutter < 0) col = [col[0] + (255 - col[0]) * 0.35, col[1] + (255 - col[1]) * 0.35, col[2] + (255 - col[2]) * 0.35];
    ctx.save();
    ctx.translate(px, p.y);
    ctx.rotate(p.angle);
    ctx.scale(Math.max(0.3, Math.abs(flutter)) * p.size, p.size);
    ctx.fillStyle = rgba(col, alpha);
    if (p.blossom) {
      for (var k = 0; k < 5; k++) {
        ctx.save();
        ctx.rotate(k * 72 * PI / 180);
        ctx.translate(0, -0.3);
        ctx.scale(0.55, 0.55);
        ctx.beginPath(); petalPath(ctx); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha *= alpha;
      ctx.fillStyle = DEEP;
      ctx.beginPath(); ctx.arc(0, 0, 0.09, 0, 2 * PI); ctx.fill();
    } else {
      ctx.beginPath(); petalPath(ctx); ctx.fill();
    }
    ctx.restore();
  }

  var PETAL_LIFE = 5;
  var PETALS = 130, PETAL_CAP = 280, PETAL_BURST = 14;

  // ---------------------------------------------------------------- module

  window.LOCATIONS = window.LOCATIONS || {};
  window.LOCATIONS.japan = {
    homeSound: null,

    scenery: function (ctx, layout, sceneHeight) {
      bamboo(ctx, layout, sceneHeight); // behind the torii
      torii(ctx, layout, sceneHeight);
    },

    /** One petal per foundation move, drifting down from the seal, fading over the last 1.5 s. */
    homeTouch: function (layout, f, seal) {
      var p = sakuraPetal(seal.cx, seal.cy, (Math.random() - 0.3) * 40, 10, false);
      var age = 0;
      var fx = {
        done: false,
        step: function (dt) {
          stepPetal(p, dt);
          age += dt;
          if (age > PETAL_LIFE) fx.done = true;
        },
        draw: function (ctx) {
          var fade = Math.min(1, Math.max(0, (PETAL_LIFE - age) / 1.5));
          drawPetal(ctx, p, fade);
        }
      };
      return fx;
    },

    /** Sakura petals in place of the confetti; a tap shakes a puff from the fingertip. */
    win: function (w, h) {
      var petals = [];
      function falling(y) { return sakuraPetal(Math.random() * w, y, range(-10, 25), range(45, 95)); }
      for (var i = 0; i < PETALS; i++) petals.push(falling(-Math.random() * h));
      return {
        step: function (dt) {
          for (var i = 0; i < petals.length; i++) {
            var p = petals[i];
            stepPetal(p, dt);
            if (p.y > h + 30 || p.x < -60 || p.x > w + 60) {
              p.x = Math.random() * w;
              p.y = -30;
              p.vx = p.drift;
              p.vy = p.fall;
            }
          }
        },
        draw: function (ctx) {
          for (var i = 0; i < petals.length; i++) drawPetal(ctx, petals[i]);
        },
        tap: function (x, y) {
          var n = Math.max(0, Math.min(PETAL_BURST, PETAL_CAP - petals.length));
          for (var i = 0; i < n; i++) {
            var angle = -PI / 2 + range(-1.4, 1.4);
            var v = range(50, 130);
            petals.push(sakuraPetal(x, y, Math.cos(angle) * v, Math.sin(angle) * v));
          }
        }
      };
    }
  };
})();
