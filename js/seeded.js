/* A tiny seeded PRNG (mulberry32) for drawings that must look the same every time. */
window.SEEDED = function (seed) {
  var a = seed >>> 0;
  return {
    next: function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  };
};
