/*
 * The win (§3) — a port of the app's Celebration: foundation cards fly off Windows-style,
 * bouncing, leaving trails, launching faster and faster (Golf: off the waste), under the
 * location's win layer. Every tap speeds it up (and is handed to the layer). Stepped at 60 Hz.
 * Window coordinates, CSS px.
 */
(function () {
  'use strict';
  var E = window.Engine;
  var TICK = 1 / 60, GRAVITY = 1100, TRAIL = 8, TRAIL_EVERY = 3;

  /**
   * [origin] is the board's top-left in the window; [onLaunched](ids) tells the board which
   * cards have left so it stops drawing them.
   */
  function Celebration(board, layout, origin, width, height, locationKey, play, onLaunched) {
    var self = this;
    self.layout = layout; self.origin = origin; self.width = width; self.height = height;
    self.speed = 1; self.flyers = []; self.launched = {}; self.onLaunched = onLaunched;
    var L = (window.LOCATIONS || {})[locationKey] || {};
    self.dim = L.winDim != null ? L.winDim : 0.25;
    self.layer = L.win ? L.win(width, height, play) : null;
    self.location = locationKey;

    // Launch list: the top card of each foundation in rotation (Golf: the waste, top down).
    var queue = [];
    if (E.Board.isGolf(board)) {
      board.waste.slice().reverse().forEach(function (c) { queue.push([c, E.WASTE]); });
    } else {
      var stacks = board.foundations.map(function (p) { return p.slice(); });
      while (stacks.some(function (s) { return s.length; })) {
        stacks.forEach(function (s, f) { if (s.length) queue.push([s.pop(), E.found(f)]); });
      }
    }
    self.queue = queue; self.next = 0; self.untilLaunch = delayBefore(0);
    self.accumulator = 0;
  }

  function delayBefore(k) { return Math.max(0.045, 0.30 * Math.pow(0.86, k)); }
  function range(a, b) { return a + Math.random() * (b - a); }

  Celebration.prototype.hurry = function (x, y) {
    this.speed = Math.min(3.5, this.speed + 0.75);
    if (this.layer && this.layer.tap) this.layer.tap(x, y);
  };

  /** Advance by real time [dt] seconds (scaled by the speed-up), in fixed ticks. */
  Celebration.prototype.advance = function (dt) {
    this.accumulator += Math.min(0.1, dt) * this.speed;
    while (this.accumulator >= TICK) { this.step(); this.accumulator -= TICK; }
  };

  Celebration.prototype.step = function () {
    var self = this, L = self.layout;
    if (self.next < self.queue.length) {
      self.untilLaunch -= TICK;
      if (self.untilLaunch <= 0) {
        var item = self.queue[self.next], slot = L.slotRect(item[1]);
        var dir = Math.random() < 0.5 ? 1 : -1;
        self.flyers.push({
          card: item[0], x: self.origin.x + slot.left, y: self.origin.y + slot.top,
          vx: dir * range(150, 340), vy: -range(60, 200), trail: [], ticks: 0, alive: true
        });
        self.launched[E.id(item[0])] = true;
        self.onLaunched(self.launched);
        self.next++;
        self.untilLaunch = delayBefore(self.next);
      }
    }
    var floor = self.height - L.cardHeight;
    self.flyers.forEach(function (f) {
      if (!f.alive) {
        if (f.trail.length && f.ticks++ % TRAIL_EVERY === 0) f.trail.shift();
        return;
      }
      f.vy += GRAVITY * TICK; f.x += f.vx * TICK; f.y += f.vy * TICK;
      if (f.y > floor) { f.y = floor; f.vy = -f.vy * 0.72; f.vx *= 0.99; }
      if (f.ticks++ % TRAIL_EVERY === 0) { f.trail.push({ x: f.x, y: f.y }); if (f.trail.length > TRAIL) f.trail.shift(); }
      if (f.x + L.cardWidth < 0 || f.x > self.width) f.alive = false;
    });
    self.flyers = self.flyers.filter(function (f) { return f.alive || f.trail.length; });
    if (self.layer) self.layer.step(TICK);
  };

  Celebration.prototype.draw = function (ctx) {
    var self = this, L = self.layout, w = L.cardWidth, h = L.cardHeight;
    ctx.fillStyle = 'rgba(0,0,0,' + self.dim + ')';
    ctx.fillRect(0, 0, self.width, self.height);
    if (self.layer && self.layer.drawBehind) { ctx.save(); self.layer.drawBehind(ctx); ctx.restore(); }
    self.flyers.forEach(function (f) {
      var img = CardArt.image(f.card, true, w, self.location);
      f.trail.forEach(function (p, i) {
        ctx.globalAlpha = 0.06 + 0.34 * i / (TRAIL - 1);
        ctx.drawImage(img, p.x, p.y, w, h);
      });
      if (f.alive) { ctx.globalAlpha = 1; ctx.drawImage(img, f.x, f.y, w, h); }
    });
    ctx.globalAlpha = 1;
    if (self.layer && self.layer.draw) { ctx.save(); self.layer.draw(ctx); ctx.restore(); }
  };

  window.Celebration = Celebration;
})();
