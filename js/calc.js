/* Casa da Qualidade (QFD) — cálculos */
(function (Q) {
  'use strict';

  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }

  /* Ranking de competição: empates dividem a posição (1, 2, 2, 4) */
  function rankDesc(values) {
    return values.map(function (v) { return 1 + values.filter(function (x) { return x > v; }).length; });
  }

  Q.weight = function (s, level) { return level ? Number(s.scale[level]) || 0 : 0; };
  Q.relLevel = function (s, rId, cId) { return (s.rel[rId] && s.rel[rId][cId]) || ''; };
  Q.benchNote = function (s, rId, kId) {
    const v = s.bench[rId] && s.bench[rId][kId];
    return v == null || v === '' ? null : Number(v);
  };
  Q.corrOf = function (s, a, b) { return s.corr[Q.corrKey(a, b)] || ''; };

  Q.calc = function (s) {
    const imp = s.reqs.map(function (r) { return Number(r.imp) || 0; });
    const impSum = sum(imp);
    const reqPct = imp.map(function (v) { return impSum ? v / impSum * 100 : 0; });

    const charTotal = s.chars.map(function (c) {
      return s.reqs.reduce(function (a, r, i) { return a + imp[i] * Q.weight(s, Q.relLevel(s, r.id, c.id)); }, 0);
    });
    const charSum = sum(charTotal);
    const charPct = charTotal.map(function (v) { return charSum ? v / charSum * 100 : 0; });
    const charRank = rankDesc(charTotal);
    const order = s.chars.map(function (_, j) { return j; })
      .sort(function (a, b) { return charTotal[b] - charTotal[a] || a - b; });
    const topN = s.settings.topN;
    const isTop = charTotal.map(function (v, j) { return v > 0 && charRank[j] <= topN; });

    const benchWeighted = s.comps.map(function (k) {
      return s.reqs.reduce(function (a, r, i) { return a + imp[i] * (Q.benchNote(s, r.id, k.id) || 0); }, 0);
    });
    const benchSimple = s.comps.map(function (k) {
      return s.reqs.reduce(function (a, r) { return a + (Q.benchNote(s, r.id, k.id) || 0); }, 0);
    });
    const benchRank = rankDesc(benchWeighted);

    const leaders = s.reqs.map(function (r) {
      let best = null, who = [];
      s.comps.forEach(function (k, ki) {
        const v = Q.benchNote(s, r.id, k.id);
        if (v == null) return;
        if (best == null || v > best) { best = v; who = [ki]; }
        else if (v === best) who.push(ki);
      });
      return { best: best, who: who };
    });

    return {
      imp: imp, impSum: impSum, reqPct: reqPct,
      charTotal: charTotal, charSum: charSum, charPct: charPct, charRank: charRank, order: order, isTop: isTop,
      benchWeighted: benchWeighted, benchSimple: benchSimple, benchRank: benchRank, leaders: leaders
    };
  };
})(window.QFD);
