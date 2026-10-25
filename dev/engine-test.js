// Dev-only: run with macOS's JavaScriptCore shell from the repo root —
//   /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc dev/engine-test.js
// Plays random hinted games of every variant and checks
// the card count never changes, plus a few rule spot checks.
var window = this;
load('js/engine.js');
var E = window.Engine, B = E.Board, H = E.Hints;
function assert(ok, msg) { if (!ok) throw new Error(msg || 'assertion failed'); }
assert.strictEqual = function (a, b, msg) { if (a !== b) throw new Error((msg || 'not equal') + ': ' + a + ' vs ' + b); };
var n = 0;
E.ORDER.forEach(function (v) {
  for (var g = 0; g < 30; g++) {
    var b = B.deal(v, [1, 2, 4][g % 3])[0];
    for (var m = 0; m < 300; m++) {
      var h = H.hint(b); if (!h) break;
      var next = h.isStock ? B.draw(b, 3) : B.move(b, h.from, h.index, h.to);
      assert(next, v + ': hinted move failed');
      b = next;
      var all = b.stock.concat(b.waste, b.freeCells.filter(Boolean), [].concat.apply([], b.foundations), [].concat.apply([], b.tableau));
      assert.strictEqual(new Set(all.map(E.id)).size, E.VARIANTS[v].cards, v + ' lost a card');
      n++;
    }
  }
});
// Golf rules.
var c = E.card;
var golf = E.makeBoard('golf', { waste: [c(1, 7, true)], tableau: [[c(0, 8, true)], [], [], [], [], [], []] });
assert(B.golfFits(golf, c(0, 8, true)) && !B.golfFits(golf, c(0, 9, true)));
assert(!B.golfFits(E.makeBoard('golf', { waste: [c(1, 13, true)] }), c(0, 12, true)));
// Spider: finished run goes home.
var run = []; for (var r = 13; r >= 2; r--) run.push(c(0, r, true));
var sp = E.makeBoard('spider', { tableau: [[c(2, 4, false)].concat(run), [c(0, 1, true)]].concat([[], [], [], [], [], [], [], []].map(function () { return [c(2, 13, false)]; })) });
var after = B.move(sp, E.tab(1), 0, E.tab(0));
assert.strictEqual(after.foundations[0].length, 13); assert(after.tableau[0][0].up);
// Save round trip.
var d = B.deal('spider', 4)[0], j = E.Records.saveJson({ board: d, drawMode: 3, spiderSuits: 4, golfHole: 1, golfScores: [] });
assert.strictEqual(E.Records.loadJson(j).board.stock.length, 50);
print('ok —', n, 'hinted moves checked');
