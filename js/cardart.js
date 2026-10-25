/*
 * Card faces and backs — a port of the app's CardArt. Proportional to the card width; height is
 * 1.4 × width. Cards are rendered once per size (and per table, for backs) into canvases and
 * reused as images, so the board and the win cascade share one look.
 */
(function () {
  'use strict';
  var E = window.Engine;
  var RED = 'rgb(199,26,33)', BLACK = '#000', BACK_RED = 'rgb(204,28,38)', BACK_DARK = 'rgb(26,26,31)';
  var FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  var SYMBOL = '︎'; // Variation selector 15: the monochrome glyph, not the colour emoji.

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** Draws [s] with its visual (ink) centre at (cx, cy). */
  function centred(ctx, s, cx, cy) {
    var m = ctx.measureText(s);
    var mid = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    ctx.fillText(s, cx, cy + mid);
  }

  function corner(ctx, c, suit, w, h) {
    var inset = w * 0.07, rankSize = w * 0.26, suitSize = w * 0.22;
    ctx.font = 'bold ' + rankSize + 'px ' + FONT;
    var label = E.rankLabel(c);
    // Column centred on the widest glyph ("10"), so single ranks sit in the same place.
    var columnWidth = Math.max(ctx.measureText('10').width * 0.9, ctx.measureText(label).width);
    var cx = inset + columnWidth / 2, capHeight = rankSize * 0.72;
    if (c.rank === 10 && 'letterSpacing' in ctx) ctx.letterSpacing = (-0.08 * rankSize) + 'px';
    ctx.fillText(label, cx, inset + capHeight);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.font = suitSize + 'px ' + FONT;
    var suitTop = inset + capHeight + h * 0.035 - h * 0.01;
    centred(ctx, suit, cx, suitTop + suitSize * 0.40);
  }

  function drawFace(ctx, c, w, h) {
    var r = w * 0.10;
    roundRect(ctx, 0, 0, w, h, r);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 0.5; ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.stroke();
    ctx.fillStyle = E.isRed(c) ? RED : BLACK;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    var suit = E.SUITS[c.suit].symbol + SYMBOL;
    ctx.font = (w * 0.55) + 'px ' + FONT;
    centred(ctx, suit, w / 2, h / 2);
    corner(ctx, c, suit, w, h);
    ctx.save(); ctx.translate(w, h); ctx.rotate(Math.PI); corner(ctx, c, suit, w, h); ctx.restore();
  }

  function outline(ctx, w, h) {
    roundRect(ctx, 0, 0, w, h, w * 0.10);
    ctx.lineWidth = 0.5; ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.stroke();
  }

  /** White card; a 5 × 7 checkerboard in red and near-black, or the table's own back. */
  function drawBack(ctx, w, h, location) {
    roundRect(ctx, 0, 0, w, h, w * 0.10);
    ctx.fillStyle = '#fff'; ctx.fill();
    var L = window.LOCATIONS && window.LOCATIONS[location];
    if (L && L.drawBack) {
      ctx.save(); var drawn = L.drawBack(ctx, w, h); ctx.restore();
      if (drawn) { outline(ctx, w, h); return; }
    }
    var pad = w * 0.10, grout = Math.max(0.8, w * 0.018), cols = 5, rows = 7;
    var cw = (w - 2 * pad - grout * (cols - 1)) / cols, chh = (h - 2 * pad - grout * (rows - 1)) / rows;
    var cr = Math.min(cw, chh) * 0.18;
    for (var r = 0; r < rows; r++) for (var col = 0; col < cols; col++) {
      ctx.fillStyle = (r + col) % 2 === 0 ? BACK_RED : BACK_DARK;
      roundRect(ctx, pad + col * (cw + grout), pad + r * (chh + grout), cw, chh, cr);
      ctx.fill();
    }
    outline(ctx, w, h);
  }

  var cache = {};
  /** A card image (canvas) for [c] face up/down at width w, drawn at the device pixel ratio. */
  function image(c, up, w, location) {
    var dpr = window.devicePixelRatio || 1;
    var key = (up ? 'f' + E.id(c) % 52 : 'b' + location) + '@' + Math.round(w * 10) + 'x' + dpr;
    var hit = cache[key];
    if (hit) return hit;
    var h = w * 1.4, cv = document.createElement('canvas');
    cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr);
    var ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    if (up) drawFace(ctx, c, w, h); else drawBack(ctx, w, h, location);
    cache[key] = cv;
    return cv;
  }
  function url(c, up, w, location) {
    var cv = image(c, up, w, location);
    if (!cv.url) cv.url = cv.toDataURL();
    return cv.url;
  }
  function clear() { cache = {}; }

  window.CardArt = { image: image, url: url, drawFace: drawFace, drawBack: drawBack, roundRect: roundRect, clear: clear };
})();
