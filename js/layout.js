/*
 * The board's geometry — a port of the app's BoardLayout. All CSS px (= dp), relative to the
 * board's top-left. Card width comes from the board width, capped in landscape so the tallest
 * column fits: min(widthBased, (boardHeight / (extent + 1.5)) / 1.4), never below 28. In
 * portrait the cap is off and the board scrolls instead.
 */
(function () {
  'use strict';
  var E = window.Engine, B = E.Board;

  var MARGIN = 10, FACE_UP_STEP = 0.28, FACE_DOWN_STEP = 0.11, WASTE_FAN = 0.22, MIN_CARD = 28, ASPECT = 1.4;

  /** A column's height in card heights. */
  function extent(column) {
    if (!column.length) return 1;
    var e = 1;
    for (var i = 0; i < column.length - 1; i++) e += column[i].up ? FACE_UP_STEP : FACE_DOWN_STEP;
    return e;
  }

  function Layout(board, width, height, capToHeight) {
    var L = this;
    L.board = board;
    L.columns = board.tableau.length;
    L.boardWidth = width;
    L.gap = Math.max(5, width * 0.012);
    var widthBased = (width - 2 * MARGIN - L.gap * (L.columns - 1)) / L.columns;
    var tallest = Math.max.apply(null, board.tableau.map(extent));
    var heightBased = (height / (tallest + 1.5)) / ASPECT;
    L.cardWidth = Math.max(MIN_CARD, capToHeight ? Math.min(widthBased, heightBased) : widthBased);
    L.cardHeight = L.cardWidth * ASPECT;
    L.originX = (width - (L.columns * L.cardWidth + (L.columns - 1) * L.gap)) / 2;
    L.topRowY = L.cardHeight * 0.15;
    L.tableauY = L.topRowY + L.cardHeight * 1.2;
    L.contentHeight = L.tableauY + L.cardHeight * tallest + L.cardHeight * 0.15;
    L.isKlondike = B.isKlondike(board); L.isFreeCell = B.isFreeCell(board);
    L.isGolf = B.isGolf(board); L.isSpider = B.isSpider(board);
  }

  Layout.prototype.slotX = function (slot) { return this.originX + slot * (this.cardWidth + this.gap); };

  /**
   * Top-row slot of each non-tableau pile: Klondike/Golf stock, waste, seal, 4 foundations (Golf
   * leaves them empty); FreeCell 4 cells + 4 foundations; Spider stock, seal, 8 foundations.
   */
  Layout.prototype.topSlot = function (p) {
    switch (p.k) {
      case 'stock': return 0;
      case 'waste': return 1;
      case 'free': return p.i;
      case 'found': return this.columns === 10 ? 2 + p.i : this.columns - 4 + p.i;
    }
    throw new Error('not a top-row pile');
  };

  function rect(left, top, w, h) {
    return { left: left, top: top, width: w, height: h, right: left + w, bottom: top + h, cx: left + w / 2, cy: top + h / 2 };
  }
  Layout.prototype.slotRect = function (p) {
    if (p.k === 'tab') return rect(this.slotX(p.i), this.tableauY, this.cardWidth, this.cardHeight);
    return rect(this.slotX(this.topSlot(p)), this.topRowY, this.cardWidth, this.cardHeight);
  };
  Layout.prototype.foundationRect = function (f) { return this.slotRect(E.found(f)); };
  Layout.prototype.stockRect = function () { return this.slotRect(E.STOCK); };
  Layout.prototype.wasteRect = function () { return this.slotRect(E.WASTE); };

  /** Offset of card [i] within a column, from the cards above it. */
  Layout.prototype.columnOffset = function (column, i) {
    var y = 0;
    for (var k = 0; k < i; k++) y += this.cardHeight * (column[k].up ? FACE_UP_STEP : FACE_DOWN_STEP);
    return y;
  };

  /** Where cards not yet dealt wait: the stock, or (FreeCell) the middle of the top row. */
  Layout.prototype.deckOrigin = function () {
    if (!this.isFreeCell) { var s = this.stockRect(); return { x: s.left, y: s.top }; }
    return { x: this.boardWidth / 2 - this.cardWidth / 2, y: this.topRowY };
  };

  /**
   * Every card's place: {card, pile, index, x, y, z, up, dealing}. [dealOrder] maps tableau card
   * ids to their place in the deal; those at or past [dealtCount] wait face down at the deck.
   */
  Layout.prototype.placements = function (dealOrder, dealtCount, hidden) {
    var L = this, b = L.board, out = [], deck = L.deckOrigin();
    function waiting(c) { var o = dealOrder[E.id(c)]; return o !== undefined && o >= dealtCount; }
    var s = L.stockRect();
    b.stock.forEach(function (c, i) { out.push({ card: c, pile: E.STOCK, index: i, x: s.left, y: s.top, z: i, up: false }); });
    var fanned = Math.min(3, b.waste.length), w = L.wasteRect();
    b.waste.forEach(function (c, i) {
      if (hidden[E.id(c)]) return;
      var fan = i - (b.waste.length - fanned);
      out.push({ card: c, pile: E.WASTE, index: i, x: w.left + (fan > 0 ? fan * L.cardWidth * WASTE_FAN : 0), y: L.topRowY, z: 100 + i, up: true });
    });
    b.freeCells.forEach(function (c, i) {
      if (!c) return;
      var r = L.slotRect(E.free(i));
      out.push({ card: c, pile: E.free(i), index: 0, x: r.left, y: r.top, z: 200, up: true });
    });
    b.foundations.forEach(function (pile, f) {
      var r = L.foundationRect(f);
      pile.forEach(function (c, i) {
        if (hidden[E.id(c)]) return;
        out.push({ card: c, pile: E.found(f), index: i, x: r.left, y: r.top, z: 300 + i, up: true });
      });
    });
    b.tableau.forEach(function (col, ci) {
      col.forEach(function (c, i) {
        var order = dealOrder[E.id(c)];
        if (waiting(c)) {
          out.push({ card: c, pile: E.tab(ci), index: i, x: deck.x, y: deck.y, z: 900 - order, up: false, dealing: true });
        } else {
          out.push({ card: c, pile: E.tab(ci), index: i, x: L.slotX(ci), y: L.tableauY + L.columnOffset(col, i), z: 400 + i, up: c.up, dealing: order !== undefined });
        }
      });
    });
    return out;
  };

  /** The pile a drop at [x, y] lands on: foundations, then free cells, then columns. */
  Layout.prototype.dropTarget = function (x, y, bottom) {
    var L = this, b = L.board, i, r;
    function inside(r) { return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }
    if (L.isGolf) { if (inside(L.wasteRect())) return E.WASTE; }
    for (i = 0; i < b.foundations.length; i++) if (inside(L.foundationRect(i))) return E.found(i);
    if (L.isFreeCell) for (i = 0; i < 4; i++) if (inside(L.slotRect(E.free(i)))) return E.free(i);
    for (i = 0; i < L.columns; i++) {
      r = rect(L.slotX(i), L.tableauY, L.cardWidth, Math.max(bottom, L.contentHeight) - L.tableauY);
      if (inside(r)) return E.tab(i);
    }
    return null;
  };

  /** Where a hint's destination pulses: the slot, or the last card of an occupied column. */
  Layout.prototype.targetRect = function (p) {
    if (p.k === 'tab') {
      var col = this.board.tableau[p.i];
      if (!col.length) return this.slotRect(p);
      return rect(this.slotX(p.i), this.tableauY + this.columnOffset(col, col.length - 1), this.cardWidth, this.cardHeight);
    }
    return this.slotRect(p);
  };

  window.Layout = Layout;
  Layout.ASPECT = ASPECT;
})();
