/* Casa da Qualidade (QFD) — desenho da casa em SVG */
(function (Q) {
  'use strict';
  const esc = Q.esc;

  function wrap(text, max, maxLines) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    words.forEach(function (w) {
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= max) cur += ' ' + w;
      else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    if (!lines.length) lines.push('');
    if (lines.length > maxLines) {
      const keep = lines.slice(0, maxLines);
      keep[maxLines - 1] += '…';
      return keep;
    }
    return lines;
  }
  Q.wrap = wrap;

  /* Cores fixas para o SVG exportado sozinho (fora da página) */
  const STANDALONE_CSS =
    'text{font-family:"Archivo Narrow","Arial Narrow",Arial,sans-serif;fill:#1c2822}' +
    '.g{stroke:#cfdcd4;stroke-width:1}.s{stroke:#8fa69a;stroke-width:1.4}' +
    '.roof{fill:#e4eee8;stroke:#8fa69a;stroke-width:1.4}.dia{fill:none;stroke:#cfdcd4;stroke-width:1}' +
    '.tint{fill:#e4eee8}.hi{fill:#d6eadc}.hi2{fill:#bfdeca}.sym{fill:none;stroke:#2e6a4e;stroke-width:2}.dot{fill:#2e6a4e}' +
    '.pos{fill:#2e6a4e;font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:17px}' +
    '.neg{fill:#ad4430;font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:17px}.sm{font-size:14px}' +
    '.cap{font-size:12px;fill:#5a6a62;letter-spacing:.06em}.lh{font-size:12px;font-weight:600;letter-spacing:.05em;fill:#2e6a4e}' +
    '.lg{font-size:12px;fill:#5a6a62}.hh{font-size:15px;font-weight:600}.vh{font-size:13px;font-weight:600}' +
    '.code{font-family:"IBM Plex Mono",monospace;font-size:13px;font-weight:600;fill:#2e6a4e}.dir{font-size:15px;fill:#2e6a4e}' +
    '.rq{font-size:13.5px}.num{font-family:"IBM Plex Mono",monospace;font-size:13px}.b{font-weight:600}' +
    '.lo{fill:#ad4430;font-weight:600}.tiny{font-family:"IBM Plex Mono",monospace;font-size:9.5px;fill:#5a6a62}' +
    '.bl{font-size:13.5px;font-weight:600}.empty{font-size:13px;fill:#5a6a62;font-style:italic}.hit{fill:transparent}';

  Q.renderHouse = function (s, c, opts) {
    opts = opts || {};
    const act = !!opts.interactive;
    const P = { LW: 240, IW: 52, PW: 62, w: 64, bh: 36, pad: 10, top: 28 };
    const n = s.reqs.length, m = s.chars.length, K = s.comps.length;
    const w = P.w;
    const bw = K ? Math.max(46, Math.ceil(150 / K)) : 0;
    const xL = P.pad, xi = xL + P.LW, xp = xi + P.IW, x0 = xp + P.PW;
    const mw = m ? m * w : 150;
    const xb = x0 + mw, xe = xb + K * bw;
    const roofH = m * w / 2;
    const yR = P.top + Math.max(roofH, 150);
    const apexY = yR - roofH;

    const charLines = s.chars.map(function (ch) { return wrap(ch.name || 'Sem nome', 20, 3); });
    const compLines = s.comps.map(function (k) { return wrap(k.name || 'Sem nome', 18, 2); });
    const allLens = [].concat.apply([], charLines.concat(compLines)).map(function (l) { return l.length; });
    const maxLen = allLens.length ? Math.max.apply(null, allLens) : 0;
    const hH = Math.max(165, 46 + maxLen * 6.7);
    const yH = yR + hH, yD = yH + 30;

    const reqLines = s.reqs.map(function (r) { return wrap(r.name || 'Sem nome', 32, 3); });
    const rowH = reqLines.map(function (L) { return Math.max(44, L.length * 16 + 14); });
    const rowY = [];
    let yy = yD;
    rowH.forEach(function (h) { rowY.push(yy); yy += h; });
    const yB = yy + (n ? 0 : 56);
    const yEnd = yB + 3 * P.bh;
    const W = Math.max(xe, 360) + P.pad + 4;
    const H = yEnd + P.pad;
    const sc = s.scale;

    const o = [];
    function t(x, y, txt, cls, anchor, extra) {
      o.push('<text x="' + x + '" y="' + y + '" text-anchor="' + (anchor || 'middle') + '" class="' + (cls || '') + '"' + (extra ? ' ' + extra : '') + '>' + esc(txt) + '</text>');
    }
    function vt(x, y, txt, cls) {
      o.push('<text transform="translate(' + x + ',' + y + ') rotate(-90)" class="' + cls + '">' + esc(txt) + '</text>');
    }
    function line(x1, y1, x2, y2, cls) { o.push('<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="' + (cls || 'g') + '"/>'); }
    function rect(x, y, ww, hh, cls, extra) { o.push('<rect x="' + x + '" y="' + y + '" width="' + ww + '" height="' + hh + '" class="' + cls + '"' + (extra ? ' ' + extra : '') + '/>'); }
    function sym(cx, cy, level, r) {
      r = r || 10;
      if (level === 's') o.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" class="sym"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.42).toFixed(1) + '" class="dot"/>');
      else if (level === 'm') o.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" class="sym"/>');
      else if (level === 'w') o.push('<polygon points="' + cx + ',' + (cy - r) + ' ' + (cx + r * 0.95).toFixed(1) + ',' + (cy + r * 0.7).toFixed(1) + ' ' + (cx - r * 0.95).toFixed(1) + ',' + (cy + r * 0.7).toFixed(1) + '" class="sym"/>');
    }

    /* Fundos */
    rect(xL, yR, xe - xL, yH - yR + 30, 'tint');
    rect(xL, yB, xe - xL, yEnd - yB, 'tint');
    s.chars.forEach(function (ch, j) {
      if (!c.isTop[j]) return;
      rect(x0 + j * w, yD, w, yB - yD, 'hi');
      rect(x0 + j * w, yB, w, yEnd - yB, 'hi2');
    });

    /* Telhado */
    if (m) {
      o.push('<polygon points="' + x0 + ',' + yR + ' ' + (x0 + m * w / 2) + ',' + apexY + ' ' + xb + ',' + yR + '" class="roof"/>');
      for (let i = 0; i < m; i++) {
        for (let j = i + 1; j < m; j++) {
          const cx = x0 + (i + j + 1) * w / 2, cy = yR - (j - i) * w / 2, h = w / 2;
          const pts = cx + ',' + (cy - h) + ' ' + (cx + h) + ',' + cy + ' ' + cx + ',' + (cy + h) + ' ' + (cx - h) + ',' + cy;
          o.push('<polygon points="' + pts + '" class="dia"/>');
          const v = Q.corrOf(s, s.chars[i].id, s.chars[j].id);
          if (v) t(cx, cy + 6, Q.CORR_SYM[v], v.indexOf('+') >= 0 ? 'pos' : 'neg');
        }
      }
      t(x0 + m * w / 2, apexY - 10, 'MATRIZ DE CORRELAÇÃO (TELHADO)', 'cap');
    }

    /* Legendas */
    const lx = xL + 4, ly = P.top + 8;
    t(lx, ly, 'CORRELAÇÕES', 'lh', 'start');
    [['++', 'positiva forte', 'pos'], ['+', 'positiva', 'pos'], ['−', 'negativa', 'neg'], ['−−', 'negativa forte', 'neg']]
      .forEach(function (a, i) {
        t(lx + 14, ly + 22 + i * 19, a[0], a[2] + ' sm');
        t(lx + 34, ly + 22 + i * 19, a[1], 'lg', 'start');
      });
    const lx2 = lx + 180;
    t(lx2, ly, 'RELACIONAMENTOS', 'lh', 'start');
    [['s', 'forte = ' + Q.fmt(sc.s)], ['m', 'média = ' + Q.fmt(sc.m)], ['w', 'fraca = ' + Q.fmt(sc.w)]].forEach(function (a, i) {
      sym(lx2 + 10, ly + 17 + i * 22, a[0], 8);
      t(lx2 + 26, ly + 21 + i * 22, a[1], 'lg', 'start');
    });
    t(lx2 + 26, ly + 21 + 3 * 22, 'vazio = 0', 'lg', 'start');
    t(lx, ly + 118, '▲ maximizar   ▼ minimizar   ◆ valor-alvo', 'lg', 'start');

    /* Cabeçalhos */
    t(xL + 10, yR + 28, 'Requisitos do cliente', 'hh', 'start');
    t(xL + 10, yR + 46, '(o que o cliente deseja)', 'lg', 'start');
    [[xi + P.IW / 2, 'Importância', '(1 = baixa, ' + sc.impMax + ' = alta)'], [xp + P.PW / 2, 'Percentual de', 'importância (%)']].forEach(function (a) {
      vt(a[0] - 4, yH - 10, a[1], 'vh');
      vt(a[0] + 12, yH - 10, a[2], 'lg');
    });
    s.chars.forEach(function (ch, j) {
      const cx = x0 + j * w + w / 2;
      t(cx, yR + 22, 'C' + (j + 1), 'code');
      const L = charLines[j];
      L.forEach(function (ln, k) { vt(cx - (L.length - 1) * 7.5 + k * 15 + 4, yH - 10, ln, 'vh'); });
      const d = Q.DIRS[ch.dir] || Q.DIRS.none;
      t(cx, yD - 9, d.sym, 'dir');
    });
    if (!m) t(x0 + mw / 2, yR + hH / 2, 'Adicione características', 'empty');
    t(x0 - 8, yD - 9, 'Sentido de melhoria', 'lg', 'end');
    if (K) {
      const cxb = xb + K * bw / 2;
      t(cxb, yR + 22, K * bw >= 130 ? 'Benchmarking' : 'Bench.', 'hh');
      t(cxb, yR + 38, 'notas de 1 a ' + sc.benchMax, 'lg');
      s.comps.forEach(function (k, ki) {
        const cx = xb + ki * bw + bw / 2;
        const L = compLines[ki];
        L.forEach(function (ln, q) { vt(cx - (L.length - 1) * 7.5 + q * 15 + 4, yH - 10, ln, 'vh'); });
      });
    }

    /* Linhas da matriz */
    if (!n) t(xL + 10, yD + 32, 'Adicione requisitos do cliente', 'empty', 'start');
    s.reqs.forEach(function (r, i) {
      const y = rowY[i], h = rowH[i], cy = y + h / 2;
      const L = reqLines[i];
      L.forEach(function (ln, k) { t(xL + 10, cy + 5 - (L.length - 1) * 8 + k * 16, ln, 'rq', 'start'); });
      t(xi + P.IW / 2, cy + 6, r.imp, 'num b');
      t(xp + P.PW / 2, cy + 5, Q.fmt(c.reqPct[i], 2), 'num');
      s.chars.forEach(function (ch, j) {
        const lv = Q.relLevel(s, r.id, ch.id);
        if (!lv) return;
        sym(x0 + j * w + w / 2, cy, lv);
        t(x0 + (j + 1) * w - 6, y + h - 5, Q.fmt(Q.weight(s, lv)), 'tiny', 'end');
      });
      const lead = c.leaders[i];
      s.comps.forEach(function (k, ki) {
        const v = Q.benchNote(s, r.id, k.id);
        if (v == null) return;
        let cls = 'num';
        if (v === sc.benchMax || (lead.best === v && lead.who.length < K)) cls += ' b';
        if (v <= Math.floor(sc.benchMax * 0.4)) cls = 'num lo';
        t(xb + ki * bw + bw / 2, cy + 6, v, cls);
      });
    });

    /* Linhas de resultado */
    ['Importância da característica', 'Percentual de importância', 'Prioridade'].forEach(function (lab, k) {
      const cy = yB + k * P.bh + P.bh / 2 + 5;
      t(x0 - 10, cy, lab, 'bl', 'end');
      s.chars.forEach(function (ch, j) {
        const cx = x0 + j * w + w / 2;
        if (k === 0) t(cx, cy, Q.fmt(c.charTotal[j]), 'num b');
        else if (k === 1) t(cx, cy, Q.fmt(c.charPct[j], 2) + '%', 'num');
        else t(cx, cy, c.charTotal[j] > 0 ? c.charRank[j] + 'º' : '–', c.isTop[j] ? 'num b' : 'num');
      });
    });
    if (K) {
      const cxb = xb + K * bw / 2;
      t(cxb, yB + P.bh / 2 - 2, 'Σ importância × nota', 'lg');
      s.comps.forEach(function (k, ki) { t(xb + ki * bw + bw / 2, yB + P.bh / 2 + 14, Q.fmt(c.benchWeighted[ki]), 'num b'); });
      t(cxb, yB + P.bh * 1.5 + 5, 'Σ importância = ' + Q.fmt(c.impSum), 'lg');
      t(cxb, yB + P.bh * 2.5 + 5, 'Σ características = ' + Q.fmt(c.charSum), 'lg');
    }

    /* Grade */
    rowY.forEach(function (y) { line(xL, y, xe, y); });
    for (let k = 1; k < 3; k++) line(xL, yB + k * P.bh, xe, yB + k * P.bh);
    [xi, xp].forEach(function (x) { line(x, yR, x, yH); line(x, yD, x, yB); });
    for (let j = 0; j <= m; j++) line(x0 + j * w, yR, x0 + j * w, yEnd, (j === 0 || j === m) ? 's' : 'g');
    if (!m) line(xb, yR, xb, yEnd, 's');
    for (let k = 1; k < K; k++) line(xb + k * bw, yR + 50, xb + k * bw, yB);
    line(xL, yR, xe, yR, 's'); line(xL, yH, xb, yH); line(xL, yD, xe, yD, 's');
    line(xL, yB, xe, yB, 's'); line(xL, yEnd, xe, yEnd, 's');
    line(xL, yR, xL, yEnd, 's'); line(xe, yR, xe, yEnd, 's');

    /* Áreas clicáveis (modo editor) */
    if (act) {
      const A = function (label) { return 'tabindex="0" role="button" aria-label="' + esc(label) + '"'; };
      s.reqs.forEach(function (r, i) {
        const y = rowY[i], h = rowH[i];
        rect(xL, y, P.LW, h, 'hit name', 'data-focus="req:' + r.id + '" ' + A('Editar requisito ' + r.name));
        rect(xi, y, P.IW, h, 'hit cell', 'data-imp="' + r.id + '" ' + A('Importância de ' + r.name + ': ' + r.imp));
        s.chars.forEach(function (ch, j) {
          const lv = Q.relLevel(s, r.id, ch.id);
          rect(x0 + j * w, y, w, h, 'hit cell', 'data-r="' + r.id + '" data-c="' + ch.id + '" ' +
            A(r.name + ' × C' + (j + 1) + ': ' + (lv ? Q.REL[lv] : 'sem relação')));
        });
        s.comps.forEach(function (k, ki) {
          rect(xb + ki * bw, y, bw, h, 'hit cell', 'data-br="' + r.id + '" data-bk="' + k.id + '" ' + A('Nota de ' + k.name + ' em ' + r.name));
        });
      });
      s.chars.forEach(function (ch, j) {
        rect(x0 + j * w, yH, w, 30, 'hit cell', 'data-dir="' + ch.id + '" ' + A('Sentido de melhoria de C' + (j + 1)));
        rect(x0 + j * w, yR, w, hH, 'hit name', 'data-focus="char:' + ch.id + '" ' + A('Editar característica C' + (j + 1)));
        for (let q = j + 1; q < m; q++) {
          const cx = x0 + (j + q + 1) * w / 2, cy = yR - (q - j) * w / 2, h = w / 2 - 1;
          o.push('<polygon class="hit cell" points="' + cx + ',' + (cy - h) + ' ' + (cx + h) + ',' + cy + ' ' + cx + ',' + (cy + h) + ' ' + (cx - h) + ',' + cy +
            '" data-ca="' + ch.id + '" data-cb="' + s.chars[q].id + '" ' + A('Correlação C' + (j + 1) + ' × C' + (q + 1)) + '/>');
        }
      });
      s.comps.forEach(function (k, ki) {
        rect(xb + ki * bw, yR + 50, bw, hH - 50, 'hit name', 'data-focus="comp:' + k.id + '" ' + A('Editar ' + k.name));
      });
    }

    const style = opts.standalone ? '<style>' + STANDALONE_CSS + '</style><rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#ffffff"/>' : '';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + (opts.cssW || W) + '" height="' + (opts.cssH || H) +
      '" role="img" aria-label="Casa da Qualidade: ' + esc(s.meta.title) + '" class="house-svg">' + style + o.join('') + '</svg>';
    return { svg: svg, width: W, height: H };
  };
})(window.QFD);
