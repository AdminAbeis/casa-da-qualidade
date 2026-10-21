/* Casa da Qualidade (QFD) — montagem das páginas para impressão / PDF */
(function (Q) {
  'use strict';
  const esc = Q.esc;

  Q.PRINT_DEFAULTS = { paper: 'A4', orient: 'landscape', margin: 10, house: true, steps: true, bench: true, prio: true };

  function today() {
    const d = new Date();
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  function head(s, sub) {
    return '<header class="ph"><div class="ph-eyebrow">' + esc(s.meta.subtitle || 'Desdobramento da Função Qualidade (QFD)') + '</div>' +
      '<div class="ph-title">' + esc(sub ? sub + ' · ' : 'Casa da Qualidade · ') + esc(s.meta.title || 'Sem título') + '</div>' +
      '<div class="ph-meta">' + (s.meta.author ? esc(s.meta.author) + ' · ' : '') + today() + '</div></header>';
  }

  /* Monta #print-root e as regras @page. Devolve o tamanho usado. */
  Q.buildPrint = function (s, c, o) {
    o = Object.assign({}, Q.PRINT_DEFAULTS, o || {});
    const P = Q.PAPERS[o.paper] || Q.PAPERS.A4;
    const land = o.orient === 'landscape';
    const pw = land ? P.h : P.w, ph = land ? P.w : P.h, m = Number(o.margin) || 10;
    const root = document.getElementById('print-root');
    let html = '';

    if (o.house) {
      const probe = Q.renderHouse(s, c, {});
      const availW = pw - 2 * m, availH = ph - 2 * m - 26;
      const k = Math.min(availW / probe.width, availH / probe.height);
      const house = Q.renderHouse(s, c, { cssW: (probe.width * k).toFixed(2) + 'mm', cssH: (probe.height * k).toFixed(2) + 'mm' });
      html += '<section class="pg pg-matriz">' + head(s) + '<div class="p-house">' + house.svg + '</div>' +
        '<footer class="pf">Escala: forte = ' + Q.fmt(s.scale.s) + ' · média = ' + Q.fmt(s.scale.m) + ' · fraca = ' + Q.fmt(s.scale.w) +
        ' · Prioridades destacadas: ' + s.settings.topN + '</footer></section>';
    }
    const which = [];
    if (o.steps) which.push('steps');
    if (o.bench) which.push('bench');
    if (o.prio) which.push('prio');
    if (which.length) {
      html += '<section class="pg pg-itens' + (o.house ? ' brk' : '') + '">' + head(s, 'Etapas e análise') + '<div class="analysis print">' + Q.renderAnalysis(s, c, which) + '</div></section>';
    }
    root.innerHTML = html;

    const style = document.getElementById('page-style');
    style.textContent =
      '@page { size: ' + P.w + 'mm ' + P.h + 'mm; margin: ' + m + 'mm; }' +
      '@page matriz { size: ' + pw + 'mm ' + ph + 'mm; margin: ' + m + 'mm; }' +
      '@page itens { size: ' + P.w + 'mm ' + P.h + 'mm; margin: ' + m + 'mm; }';
    return { pw: pw, ph: ph };
  };

  Q.loadPrintPrefs = function () {
    try { return Object.assign({}, Q.PRINT_DEFAULTS, JSON.parse(localStorage.getItem(Q.STORAGE_KEY + ':print') || '{}')); }
    catch (e) { return Object.assign({}, Q.PRINT_DEFAULTS); }
  };
  Q.savePrintPrefs = function (o) {
    try { localStorage.setItem(Q.STORAGE_KEY + ':print', JSON.stringify(o)); } catch (e) { /* ignora */ }
  };
})(window.QFD);
