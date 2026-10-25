/*
 * The rules — a port of the Android app's game/*.kt (Cards, Board, Hints, Records).
 * Boards are treated as immutable: every change returns a new board, so an undo snapshot is just
 * the previous board. Pile lists run bottom to top; the last element is the top card.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------------------------
  // Cards

  /** Suits in model order: spades 0, hearts 1, diamonds 2, clubs 3. */
  var SUITS = [
    { symbol: '♠', red: false },
    { symbol: '♥', red: true },
    { symbol: '♦', red: true },
    { symbol: '♣', red: false }
  ];

  /** [copy] tells apart the duplicates in Spider's two decks (0 in every one-deck game). */
  function card(suit, rank, up, copy) {
    return { suit: suit, rank: rank, up: !!up, copy: copy || 0 };
  }
  function id(c) { return c.copy * 52 + c.suit * 13 + c.rank; }
  function isRed(c) { return SUITS[c.suit].red; }
  function rankLabel(c) { return c.rank === 1 ? 'A' : c.rank === 11 ? 'J' : c.rank === 12 ? 'Q' : c.rank === 13 ? 'K' : String(c.rank); }
  function faceUp(c) { return c.up ? c : card(c.suit, c.rank, true, c.copy); }
  function faceDown(c) { return c.up ? card(c.suit, c.rank, false, c.copy) : c; }

  function deck() {
    var out = [];
    for (var s = 0; s < 4; s++) for (var r = 1; r <= 13; r++) out.push(card(s, r, false));
    return out;
  }

  /** Spider's 104: eight suits of 13 — all spades, spades+hearts ×4, or every suit ×2. */
  function spiderDeck(suits) {
    var pattern = suits === 1 ? [0, 0, 0, 0, 0, 0, 0, 0]
      : suits === 2 ? [0, 0, 0, 0, 1, 1, 1, 1] : [0, 1, 2, 3, 0, 1, 2, 3];
    var seen = [0, 0, 0, 0], out = [];
    pattern.forEach(function (s) {
      var copy = seen[s]++;
      for (var r = 1; r <= 13; r++) out.push(card(s, r, false, copy));
    });
    return out;
  }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var VARIANTS = {
    klondike: { key: 'klondike', title: 'Klondike', columns: 7, cards: 52, foundations: 4 },
    freecell: { key: 'freecell', title: 'FreeCell', columns: 8, cards: 52, foundations: 4 },
    golf: { key: 'golf', title: 'Golf', columns: 7, cards: 52, foundations: 4 },
    spider: { key: 'spider', title: 'Spider', columns: 10, cards: 104, foundations: 8 }
  };
  var ORDER = ['klondike', 'freecell', 'golf', 'spider'];

  // ---------------------------------------------------------------------------------------------
  // Piles

  var STOCK = { k: 'stock', i: 0 }, WASTE = { k: 'waste', i: 0 };
  function free(i) { return { k: 'free', i: i }; }
  function found(i) { return { k: 'found', i: i }; }
  function tab(i) { return { k: 'tab', i: i }; }
  function samePile(a, b) { return a && b && a.k === b.k && a.i === b.i; }

  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function emptyLists(n) { return range(n).map(function () { return []; }); }
  function replacing(list, i, v) { var a = list.slice(); a[i] = v; return a; }

  // ---------------------------------------------------------------------------------------------
  // The board

  function makeBoard(variant, o) {
    o = o || {};
    var v = VARIANTS[variant];
    return {
      variant: variant,
      stock: o.stock || [],
      waste: o.waste || [],
      freeCells: o.freeCells || [null, null, null, null],
      foundations: o.foundations || emptyLists(v.foundations),
      tableau: o.tableau || emptyLists(v.columns),
      moves: o.moves || 0
    };
  }
  function copyBoard(b, o) {
    return {
      variant: b.variant,
      stock: 'stock' in o ? o.stock : b.stock,
      waste: 'waste' in o ? o.waste : b.waste,
      freeCells: 'freeCells' in o ? o.freeCells : b.freeCells,
      foundations: 'foundations' in o ? o.foundations : b.foundations,
      tableau: 'tableau' in o ? o.tableau : b.tableau,
      moves: 'moves' in o ? o.moves : b.moves
    };
  }

  var B = {};
  B.isKlondike = function (b) { return b.variant === 'klondike'; };
  B.isFreeCell = function (b) { return b.variant === 'freecell'; };
  B.isGolf = function (b) { return b.variant === 'golf'; };
  B.isSpider = function (b) { return b.variant === 'spider'; };

  B.cardsHome = function (b) { return b.foundations.reduce(function (n, f) { return n + f.length; }, 0); };
  /** Every card home — in Golf, the table cleared. */
  B.isWon = function (b) {
    return B.isGolf(b) ? b.tableau.every(function (c) { return c.length === 0; }) : B.cardsHome(b) === VARIANTS[b.variant].cards;
  };
  B.emptyFreeCells = function (b) { return B.isFreeCell(b) ? b.freeCells.filter(function (c) { return !c; }).length : 0; };
  B.emptyColumns = function (b) { return b.tableau.filter(function (c) { return c.length === 0; }).length; };

  B.cards = function (b, p) {
    switch (p.k) {
      case 'stock': return b.stock;
      case 'waste': return b.waste;
      case 'free': return b.freeCells[p.i] ? [b.freeCells[p.i]] : [];
      case 'found': return b.foundations[p.i];
      default: return b.tableau[p.i];
    }
  };

  // Golf: play column tops onto the waste one rank up or down, any suit — nothing on a King,
  // no wrapping between King and Ace.
  B.golfFits = function (b, c) {
    var top = b.waste[b.waste.length - 1];
    return !!top && top.rank !== 13 && Math.abs(c.rank - top.rank) === 1;
  };
  B.golfHoleOver = function (b) {
    return B.isGolf(b) && (B.isWon(b) || (b.stock.length === 0 && !b.tableau.some(function (col) {
      return col.length && B.golfFits(b, col[col.length - 1]);
    })));
  };
  /** Golf strokes: cards left on the table, or minus the stock left if it's clear. */
  B.golfStrokes = function (b) {
    var left = b.tableau.reduce(function (n, c) { return n + c.length; }, 0);
    return left > 0 ? left : -b.stock.length;
  };

  // Spider: any card on one rank higher, any suit; only a same-suit descending run moves.
  B.isSuitedRun = function (run) {
    for (var i = 0; i < run.length; i++) {
      if (!run[i].up) return false;
      if (i > 0 && (run[i].suit !== run[i - 1].suit || run[i].rank !== run[i - 1].rank - 1)) return false;
    }
    return true;
  };
  /** Spider: finished King-to-Ace runs at the column bottoms go up to the foundations. */
  function collectingRuns(b) {
    var board = b;
    for (var c = 0; c < board.tableau.length; c++) {
      var col = board.tableau[c];
      if (col.length < 13) continue;
      var run = col.slice(col.length - 13);
      if (run[0].rank !== 13 || !B.isSuitedRun(run)) continue;
      var f = board.foundations.findIndex(function (p) { return p.length === 0; });
      if (f < 0) continue;
      var rest = col.slice(0, col.length - 13);
      if (rest.length && !rest[rest.length - 1].up) rest = rest.slice(0, -1).concat([faceUp(rest[rest.length - 1])]);
      board = copyBoard(board, { tableau: replacing(board.tableau, c, rest), foundations: replacing(board.foundations, f, run) });
    }
    return board;
  }

  /** Face-up target, opposite colour, exactly one rank lower. */
  B.canStack = function (moving, onto) { return onto.up && isRed(moving) !== isRed(onto) && moving.rank === onto.rank - 1; };

  /** FreeCell supermove: (emptyFreeCells + 1) × 2^emptyColumns, not counting an empty destination. */
  B.maxMovable = function (b, toEmptyColumn) {
    var cols = Math.max(0, B.emptyColumns(b) - (toEmptyColumn ? 1 : 0));
    return (B.emptyFreeCells(b) + 1) * Math.pow(2, cols);
  };

  B.isOrderedRun = function (run) {
    for (var i = 0; i < run.length; i++) {
      if (!run[i].up) return false;
      if (i > 0 && !B.canStack(run[i], run[i - 1])) return false;
    }
    return true;
  };

  /** The cards lifted by picking up [index] of [pile], or null if they can't be lifted. */
  B.pickUp = function (b, p, index) {
    var cards = B.cards(b, p);
    if (index < 0 || index >= cards.length) return null;
    switch (p.k) {
      case 'waste': case 'found': return index === cards.length - 1 ? [cards[index]] : null;
      case 'free': return cards;
      case 'tab':
        if (!cards[index].up) return null;
        if (B.isGolf(b) && index !== cards.length - 1) return null;
        var run = cards.slice(index);
        if (B.isSpider(b)) return B.isSuitedRun(run) ? run : null;
        // Klondike never makes an unordered face-up run, and doesn't re-check.
        if (B.isFreeCell(b) && !B.isOrderedRun(run)) return null;
        return run;
      default: return null;
    }
  };

  B.canDrop = function (b, run, target) {
    if (!run || !run.length) return false;
    if (B.isGolf(b)) return target.k === 'waste' && run.length === 1 && B.golfFits(b, run[0]);
    if (B.isSpider(b)) {
      if (target.k !== 'tab') return false;
      var col = b.tableau[target.i], top = col[col.length - 1];
      return !col.length || (top.up && run[0].rank === top.rank - 1);
    }
    switch (target.k) {
      case 'found':
        if (run.length !== 1) return false;
        var pile = b.foundations[target.i], last = pile[pile.length - 1];
        return pile.length ? run[0].suit === last.suit && run[0].rank === last.rank + 1 : run[0].rank === 1;
      case 'free': return B.isFreeCell(b) && run.length === 1 && !b.freeCells[target.i];
      case 'tab':
        var column = b.tableau[target.i];
        var fits = column.length ? B.canStack(run[0], column[column.length - 1]) : (B.isFreeCell(b) || run[0].rank === 13);
        return fits && (B.isKlondike(b) || run.length <= B.maxMovable(b, column.length === 0));
      default: return false;
    }
  };

  function removing(b, p, index) {
    switch (p.k) {
      case 'stock': return copyBoard(b, { stock: b.stock.slice(0, index) });
      case 'waste': return copyBoard(b, { waste: b.waste.slice(0, index) });
      case 'free': return copyBoard(b, { freeCells: replacing(b.freeCells, p.i, null) });
      case 'found': return copyBoard(b, { foundations: replacing(b.foundations, p.i, b.foundations[p.i].slice(0, index)) });
      default:
        var col = b.tableau[p.i].slice(0, index);
        if ((B.isKlondike(b) || B.isSpider(b)) && col.length && !col[col.length - 1].up) {
          col = col.slice(0, -1).concat([faceUp(col[col.length - 1])]);
        }
        return copyBoard(b, { tableau: replacing(b.tableau, p.i, col) });
    }
  }
  function adding(b, run, p) {
    var cards = run.map(faceUp);
    switch (p.k) {
      case 'stock': return copyBoard(b, { stock: b.stock.concat(cards) });
      case 'waste': return copyBoard(b, { waste: b.waste.concat(cards) });
      case 'free': return copyBoard(b, { freeCells: replacing(b.freeCells, p.i, cards[0]) });
      case 'found': return copyBoard(b, { foundations: replacing(b.foundations, p.i, b.foundations[p.i].concat(cards)) });
      default: return copyBoard(b, { tableau: replacing(b.tableau, p.i, b.tableau[p.i].concat(cards)) });
    }
  }

  /** Moves the cards at [index] of [from] onto [to], or null if illegal. Counts one move. */
  B.move = function (b, from, index, to) {
    if (samePile(from, to) || (from.k === 'found' && to.k === 'found')) return null;
    if ((B.isGolf(b) || B.isSpider(b)) && from.k !== 'tab') return null;
    var run = B.pickUp(b, from, index);
    if (!run || !B.canDrop(b, run, to)) return null;
    var moved = adding(removing(b, from, index), run, to);
    moved = copyBoard(moved, { moves: b.moves + 1 });
    return B.isSpider(b) ? collectingRuns(moved) : moved;
  };

  /**
   * Stock tap. Klondike: draw min(drawMode, stock) onto the waste, or recycle the waste. Golf: one
   * card, no recycling. Spider: one card face up onto every column, not while any is empty.
   */
  B.draw = function (b, drawMode) {
    if (B.isSpider(b)) {
      if (!b.stock.length || b.tableau.some(function (c) { return !c.length; })) return null;
      var n = b.tableau.length, dealt = b.stock.slice(b.stock.length - n).reverse();
      return collectingRuns(copyBoard(b, {
        stock: b.stock.slice(0, b.stock.length - n),
        tableau: b.tableau.map(function (c, i) { return c.concat([faceUp(dealt[i])]); }),
        moves: b.moves + 1
      }));
    }
    if (B.isGolf(b)) {
      if (!b.stock.length) return null;
      return copyBoard(b, { stock: b.stock.slice(0, -1), waste: b.waste.concat([faceUp(b.stock[b.stock.length - 1])]), moves: b.moves + 1 });
    }
    if (!B.isKlondike(b)) return null;
    if (b.stock.length) {
      var count = Math.min(drawMode, b.stock.length);
      var drawn = b.stock.slice(b.stock.length - count).reverse().map(faceUp);
      return copyBoard(b, { stock: b.stock.slice(0, b.stock.length - count), waste: b.waste.concat(drawn), moves: b.moves + 1 });
    }
    if (!b.waste.length) return null;
    return copyBoard(b, { stock: b.waste.slice().reverse().map(faceDown), waste: [], moves: b.moves + 1 });
  };

  B.foundationFor = function (b, c) {
    for (var f = 0; f < b.foundations.length; f++) if (B.canDrop(b, [c], found(f))) return found(f);
    return null;
  };

  /** Double-tap auto-place: foundation → occupied column → empty column → free cell. */
  B.autoPlaceTarget = function (b, from, index) {
    if (from.k === 'found') return null;
    var run = B.pickUp(b, from, index);
    if (!run) return null;
    if (B.isGolf(b)) return B.canDrop(b, run, WASTE) ? WASTE : null;
    var source = from.k === 'tab' ? from.i : -1;
    var columns = range(b.tableau.length).filter(function (i) { return i !== source; });
    var hit;
    if (B.isSpider(b)) {
      hit = columns.find(function (i) { var c = b.tableau[i]; return c.length && c[c.length - 1].suit === run[0].suit && B.canDrop(b, run, tab(i)); });
      if (hit !== undefined) return tab(hit);
      hit = columns.find(function (i) { return b.tableau[i].length && B.canDrop(b, run, tab(i)); });
      if (hit !== undefined) return tab(hit);
      if (index !== 0) { hit = columns.find(function (i) { return !b.tableau[i].length; }); if (hit !== undefined) return tab(hit); }
      return null;
    }
    if (run.length === 1) { var f = B.foundationFor(b, run[0]); if (f) return f; }
    hit = columns.find(function (i) { return b.tableau[i].length && B.canDrop(b, run, tab(i)); });
    if (hit !== undefined) return tab(hit);
    // Moving a whole column onto another empty column is pointless.
    var wholeColumn = source >= 0 && index === 0;
    if (!wholeColumn) {
      hit = columns.find(function (i) { return !b.tableau[i].length && B.canDrop(b, run, tab(i)); });
      if (hit !== undefined) return tab(hit);
    }
    if (B.isFreeCell(b) && run.length === 1 && from.k !== 'free') {
      var cell = b.freeCells.findIndex(function (c) { return !c; });
      if (cell >= 0) return free(cell);
    }
    return null;
  };

  /** Waste top, each free cell, each tableau top — the hint and auto-complete source order. */
  B.topCards = function (b) {
    var out = [];
    if (b.waste.length) out.push([WASTE, b.waste.length - 1]);
    b.freeCells.forEach(function (c, i) { if (c) out.push([free(i), 0]); });
    b.tableau.forEach(function (c, i) { if (c.length) out.push([tab(i), c.length - 1]); });
    return out;
  };

  B.nextTopCardHome = function (b) {
    var tops = B.topCards(b);
    for (var k = 0; k < tops.length; k++) {
      var p = tops[k][0], i = tops[k][1];
      var target = B.foundationFor(b, B.cards(b, p)[i]);
      if (target) return B.move(b, p, i, target);
    }
    return null;
  };

  /** True once the rest plays itself: all face up (Klondike) or a greedy run home (FreeCell). */
  B.canAutoComplete = function (b) {
    if (B.isWon(b) || B.isGolf(b) || B.isSpider(b)) return false;
    if (B.isKlondike(b)) {
      return b.tableau.every(function (col) { return col.every(function (c) { return c.up; }); }) &&
        (b.stock.length > 0 || b.waste.length > 0 || B.cardsHome(b) > 0);
    }
    var board = b, next;
    while ((next = B.nextTopCardHome(board))) board = next;
    return B.isWon(board);
  };

  /** One auto-complete step; Klondike falls back to buried waste/stock cards, played straight home. */
  B.autoCompleteStep = function (b) {
    var n = B.nextTopCardHome(b);
    if (n) return n;
    if (!B.isKlondike(b)) return null;
    var piles = [['waste', b.waste], ['stock', b.stock]];
    for (var k = 0; k < piles.length; k++) {
      var cards = piles[k][1];
      for (var i = cards.length - 1; i >= 0; i--) {
        var target = B.foundationFor(b, cards[i]);
        if (!target) continue;
        var rest = cards.slice(); rest.splice(i, 1);
        var removed = piles[k][0] === 'waste' ? copyBoard(b, { waste: rest }) : copyBoard(b, { stock: rest });
        return copyBoard(adding(removed, [cards[i]], target), { moves: b.moves + 1 });
      }
    }
    return null;
  };

  // ---------------------------------------------------------------------------------------------
  // Deals — each returns [board, order of tableau card ids as dealt]

  B.dealKlondike = function () {
    var d = shuffle(deck()), cols = emptyLists(7), order = [];
    for (var row = 0; row < 7; row++) for (var j = row; j < 7; j++) {
      var c = d.pop(); if (row === j) c = faceUp(c);
      cols[j].push(c); order.push(id(c));
    }
    return [makeBoard('klondike', { stock: d, tableau: cols }), order];
  };
  B.dealFreeCell = function () {
    var d = shuffle(deck()).map(faceUp), cols = emptyLists(8);
    d.forEach(function (c, i) { cols[i % 8].push(c); });
    return [makeBoard('freecell', { tableau: cols }), d.map(id)];
  };
  /** Golf: seven columns of five, face up; 17 left, the top one already turned onto the waste. */
  B.dealGolf = function () {
    var d = shuffle(deck()), cols = emptyLists(7), order = [];
    for (var row = 0; row < 5; row++) for (var j = 0; j < 7; j++) {
      var c = faceUp(d.pop()); cols[j].push(c); order.push(id(c));
    }
    var start = faceUp(d.pop());
    return [makeBoard('golf', { stock: d, waste: [start], tableau: cols }), order];
  };
  /** Spider: 54 to ten columns (0–3 get six, 4–9 five), last face up; 50 in the stock. */
  B.dealSpider = function (suits) {
    var d = shuffle(spiderDeck(suits)), cols = emptyLists(10), order = [];
    for (var row = 0; row < 6; row++) for (var j = 0; j < 10; j++) {
      var size = j < 4 ? 6 : 5;
      if (row >= size) continue;
      var c = d.pop(); if (row === size - 1) c = faceUp(c);
      cols[j].push(c); order.push(id(c));
    }
    return [makeBoard('spider', { stock: d, tableau: cols }), order];
  };
  B.deal = function (variant, spiderSuits) {
    switch (variant) {
      case 'klondike': return B.dealKlondike();
      case 'freecell': return B.dealFreeCell();
      case 'golf': return B.dealGolf();
      default: return B.dealSpider(spiderSuits || 1);
    }
  };

  // ---------------------------------------------------------------------------------------------
  // Hints — the ladder's exact priorities are part of the feel. Steps 1–3 are the "obvious move".

  function hint(from, index, to, cardId) { return { from: from, index: index, to: to, cardId: cardId, isStock: from.k === 'stock' }; }
  function hintsEqual(a, b) {
    return !!a && !!b && samePile(a.from, b.from) && a.index === b.index && a.cardId === b.cardId &&
      ((!a.to && !b.to) || samePile(a.to, b.to));
  }

  var H = {};
  H.hint = function (b) {
    if (B.isGolf(b)) return golfPlay(b) || golfDraw(b);
    if (B.isSpider(b)) return spiderObvious(b) || spiderAnyMove(b) || spiderDeal(b);
    return H.obviousMove(b) || parkedCardToColumn(b) || drawFromStock(b);
  };
  H.obviousMove = function (b) {
    if (B.isGolf(b)) return golfPlay(b);
    if (B.isSpider(b)) return spiderObvious(b);
    return toFoundation(b) || productiveRunMove(b) || releaseFoundationCard(b);
  };
  H.equal = hintsEqual;

  /** 1. A card that can go up: waste top, then each free cell, then each tableau top. */
  function toFoundation(b) {
    var tops = B.topCards(b);
    for (var k = 0; k < tops.length; k++) {
      var c = B.cards(b, tops[k][0])[tops[k][1]], t = B.foundationFor(b, c);
      if (t) return hint(tops[k][0], tops[k][1], t, id(c));
    }
    return null;
  }
  /** 2. Klondike: a run move that exposes a face-down card. FreeCell: one that empties its column. */
  function productiveRunMove(b) {
    for (var c = 0; c < b.tableau.length; c++) {
      var col = b.tableau[c], start;
      if (B.isKlondike(b)) {
        start = col.findIndex(function (x) { return x.up; });
        if (start <= 0) continue;
      } else {
        if (!col.length) continue;
        start = 0;
      }
      var run = B.pickUp(b, tab(c), start);
      if (!run) continue;
      for (var d = 0; d < b.tableau.length; d++) {
        if (d === c || !b.tableau[d].length) continue;
        if (B.canDrop(b, run, tab(d))) return hint(tab(c), start, tab(d), id(run[0]));
      }
    }
    return null;
  }
  /** 3. A top card sitting on a foundation-ready card: move it to free the one beneath. */
  function releaseFoundationCard(b) {
    for (var c = 0; c < b.tableau.length; c++) {
      var col = b.tableau[c];
      if (col.length < 2) continue;
      var beneath = col[col.length - 2];
      if (!beneath.up || !B.foundationFor(b, beneath)) continue;
      var top = col[col.length - 1];
      for (var d = 0; d < b.tableau.length; d++) {
        if (d === c || !b.tableau[d].length) continue;
        if (B.canDrop(b, [top], tab(d))) return hint(tab(c), col.length - 1, tab(d), id(top));
      }
      if (B.isFreeCell(b)) {
        var cell = b.freeCells.findIndex(function (x) { return !x; });
        if (cell >= 0) return hint(tab(c), col.length - 1, free(cell), id(top));
      }
    }
    return null;
  }
  /** 4. Any single waste or free-cell card that fits some tableau column. */
  function parkedCardToColumn(b) {
    var sources = [];
    if (b.waste.length) sources.push([WASTE, b.waste.length - 1]);
    b.freeCells.forEach(function (c, i) { if (c) sources.push([free(i), 0]); });
    for (var k = 0; k < sources.length; k++) {
      var c = B.cards(b, sources[k][0])[sources[k][1]];
      for (var d = 0; d < b.tableau.length; d++) {
        if (B.canDrop(b, [c], tab(d))) return hint(sources[k][0], sources[k][1], tab(d), id(c));
      }
    }
    return null;
  }
  /** 5. Klondike: draw from the stock (or recycle the waste). */
  function drawFromStock(b) {
    return B.isKlondike(b) && (b.stock.length || b.waste.length) ? hint(STOCK, 0, null, null) : null;
  }

  // Golf: play the column top that leaves the most to play next, else turn the stock.
  function golfPlay(b) {
    var best = -1, bestScore = -2;
    b.tableau.forEach(function (col, c) {
      if (!col.length || !B.golfFits(b, col[col.length - 1])) return;
      var after = B.move(b, tab(c), col.length - 1, WASTE);
      var score = after ? after.tableau.filter(function (x) { return x.length && B.golfFits(after, x[x.length - 1]); }).length : -1;
      if (score > bestScore) { bestScore = score; best = c; }
    });
    if (best < 0) return null;
    var col = b.tableau[best];
    return hint(tab(best), col.length - 1, WASTE, id(col[col.length - 1]));
  }
  function golfDraw(b) { return b.stock.length ? hint(STOCK, 0, null, null) : null; }

  // Spider: 1. a suited move that gains something; 2. a move that uncovers a card or empties a
  // column; 3. any move that isn't lifting a run off a card it already sits on; 4. deal.
  function spiderRuns(b) {
    var out = [];
    b.tableau.forEach(function (col, c) {
      if (!col.length) return;
      var start = col.length - 1;
      while (start > 0 && B.pickUp(b, tab(c), start - 1)) start--;
      out.push([c, start]);
    });
    return out;
  }
  function spiderMoves(b, accept) {
    var runs = spiderRuns(b);
    for (var k = 0; k < runs.length; k++) {
      var c = runs[k][0], start = runs[k][1], col = b.tableau[c];
      for (var s = start; s < col.length; s++) {
        var run = col.slice(s);
        for (var d = 0; d < b.tableau.length; d++) {
          if (d === c || !b.tableau[d].length) continue;
          if (B.canDrop(b, run, tab(d)) && accept(c, s, d, start)) return hint(tab(c), s, tab(d), id(run[0]));
        }
      }
    }
    return null;
  }
  function gains(b, c, s) { return s === 0 || !b.tableau[c][s - 1].up; }
  function settled(b, c, s) {
    if (s === 0) return false;
    var above = b.tableau[c][s - 1], x = b.tableau[c][s];
    return above.up && above.suit === x.suit && above.rank === x.rank + 1;
  }
  function sitsOnHigher(b, c, s) {
    if (s === 0) return false;
    var above = b.tableau[c][s - 1];
    return above.up && above.rank === b.tableau[c][s].rank + 1;
  }
  function spiderObvious(b) {
    return spiderMoves(b, function (c, s, d) {
      var top = b.tableau[d][b.tableau[d].length - 1];
      return top.suit === b.tableau[c][s].suit && !settled(b, c, s) && (gains(b, c, s) || !sitsOnHigher(b, c, s));
    }) || spiderMoves(b, function (c, s, d, start) { return gains(b, c, s) && s === start; });
  }
  function spiderAnyMove(b) { return spiderMoves(b, function (c, s) { return !sitsOnHigher(b, c, s); }); }
  function spiderDeal(b) {
    return b.stock.length && !b.tableau.some(function (c) { return !c.length; }) ? hint(STOCK, 0, null, null) : null;
  }

  // ---------------------------------------------------------------------------------------------
  // Records: statistics and the saved game (localStorage JSON, same shapes as the app's)

  function stats(o) { o = o || {}; return { played: o.played || 0, won: o.won || 0, bestWins: (o.bestWins || []).slice() }; }
  var R = {};
  R.winRate = function (s) { return s.played ? Math.round(s.won * 100 / s.played) : 0; };
  R.recordingWin = function (s, moves) {
    return { played: s.played, won: s.won + 1, bestWins: s.bestWins.concat([moves]).sort(function (a, b) { return a - b; }).slice(0, 10) };
  };
  /** Statistics by key: klondike, freecell, golf, spider1/2/4. */
  R.statsGet = function (all, key) { return stats(all[key]); };
  R.statsUpdating = function (all, key, change) { var o = Object.assign({}, all); o[key] = change(stats(all[key])); return o; };
  R.statsEmpty = function (all) { return Object.keys(all).every(function (k) { return !all[k].played && !all[k].won; }); };

  function cardJson(c) { var o = { suit: c.suit, rank: c.rank, isFaceUp: c.up }; if (c.copy) o.copy = c.copy; return o; }
  function cardFrom(o) {
    if (!(o.rank >= 1 && o.rank <= 13) || !(o.suit >= 0 && o.suit <= 3)) throw new Error('bad card');
    return card(o.suit, o.rank, o.isFaceUp, o.copy || 0);
  }
  R.saveJson = function (g) {
    var b = g.board;
    var o = {
      variant: b.variant,
      stock: b.stock.map(cardJson), waste: b.waste.map(cardJson),
      freeCells: b.freeCells.map(function (c) { return c ? cardJson(c) : null; }),
      foundations: b.foundations.map(function (p) { return p.map(cardJson); }),
      tableau: b.tableau.map(function (p) { return p.map(cardJson); }),
      moves: b.moves, drawModeRaw: g.drawMode
    };
    if (B.isSpider(b)) o.spiderSuits = g.spiderSuits;
    if (B.isGolf(b)) { o.golfHole = g.golfHole; o.golfScores = g.golfScores; }
    return JSON.stringify(o);
  };
  /** Null for missing or unreadable data. */
  R.loadJson = function (json) {
    if (!json) return null;
    try {
      var o = JSON.parse(json), v = VARIANTS[o.variant];
      if (!v) return null;
      var list = function (a) { return (a || []).map(cardFrom); };
      var cells = o.freeCells || [];
      var b = makeBoard(o.variant, {
        stock: list(o.stock), waste: list(o.waste),
        freeCells: [0, 1, 2, 3].map(function (i) { return cells[i] ? cardFrom(cells[i]) : null; }),
        foundations: range(v.foundations).map(function (i) { return list((o.foundations || [])[i]); }),
        tableau: (o.tableau || []).map(list),
        moves: o.moves | 0
      });
      if (b.tableau.length !== v.columns) return null;
      var count = b.stock.length + b.waste.length + b.freeCells.filter(Boolean).length + B.cardsHome(b) +
        b.tableau.reduce(function (n, c) { return n + c.length; }, 0);
      if (count !== v.cards) return null;
      return {
        board: b,
        drawMode: o.drawModeRaw === 1 ? 1 : 3,
        golfHole: Math.min(9, Math.max(1, o.golfHole || 1)),
        golfScores: (o.golfScores || []).map(Number),
        spiderSuits: [1, 2, 4].indexOf(o.spiderSuits) >= 0 ? o.spiderSuits : 1
      };
    } catch (e) { return null; }
  };

  window.Engine = {
    SUITS: SUITS, VARIANTS: VARIANTS, ORDER: ORDER,
    card: card, id: id, isRed: isRed, rankLabel: rankLabel, faceUp: faceUp,
    STOCK: STOCK, WASTE: WASTE, free: free, found: found, tab: tab, samePile: samePile,
    makeBoard: makeBoard, Board: B, Hints: H, Records: R
  };
})();
