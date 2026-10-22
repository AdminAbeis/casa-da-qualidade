/* Casa da Qualidade (QFD) — textos e tabelas das etapas 1 a 9 */
(function (Q) {
  'use strict';
  const esc = Q.esc, f = Q.fmt;

  function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }

  /* Comentários livres: linhas com "- " viram lista, **texto** vira negrito */
  Q.richText = function (text) {
    const t = String(text || '').trim();
    if (!t) return '';
    let out = '', list = [], para = [];
    function flush() {
      if (list.length) { out += '<ul>' + list.map(function (l) { return '<li>' + inline(l) + '</li>'; }).join('') + '</ul>'; list = []; }
      if (para.length) { out += '<p>' + para.map(inline).join('<br>') + '</p>'; para = []; }
    }
    t.split('\n').forEach(function (raw) {
      const l = raw.trim();
      if (!l) { flush(); return; }
      const b = l.match(/^[-•*]\s+(.*)$/);
      if (b) { if (para.length) flush(); list.push(b[1]); }
      else { if (list.length) flush(); para.push(l); }
    });
    flush();
    return out;
  };
  Q.notesHTML = function (text) {
    const out = Q.richText(text);
    return out ? '<div class="notes"><div class="notes-h">Comentários</div>' + out + '</div>' : '';
  };

  function sec(id, eyebrow, title, body) {
    return '<section class="sec" id="' + id + '"><h2><small>' + esc(eyebrow) + '</small>' + esc(title) + '</h2>' + body + '</section>';
  }
  function code(j) { return 'C' + (j + 1); }
  function charName(s, j) { return code(j) + ' ' + (s.chars[j].name || 'Sem nome'); }
  function joinPt(arr) {
    if (arr.length <= 1) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1];
  }
  function empty(msg) { return '<p class="muted">' + esc(msg) + '</p>'; }

  Q.secRequisitos = function (s, c) {
    if (!s.reqs.length) return sec('etapa-1-2', 'Etapas 1 e 2', 'Percentual de importância dos requisitos', empty('Nenhum requisito cadastrado.'));
    const rows = s.reqs.map(function (r, i) {
      return '<tr><td class="k">R' + (i + 1) + '</td><td>' + esc(r.name || 'Sem nome') + '</td><td class="n">' + r.imp + '</td><td class="n f">' +
        r.imp + ' ÷ ' + c.impSum + ' × 100</td><td class="n">' + f(c.reqPct[i], 2) + '%</td></tr>';
    }).join('');
    const body = '<p>Soma das importâncias: ' + esc(c.imp.join(' + ')) + ' = <b>' + c.impSum + '</b>. Cada percentual é a importância dividida por ' + c.impSum + '.</p>' +
      '<div class="tbl"><table><thead><tr><th></th><th>Requisito do cliente</th><th class="n">Imp.</th><th class="n">Cálculo</th><th class="n">%</th></tr></thead><tbody>' + rows +
      '<tr class="total"><td></td><td>Total</td><td class="n">' + c.impSum + '</td><td></td><td class="n">100%</td></tr></tbody></table></div>';
    return sec('etapa-1-2', 'Etapas 1 e 2', 'Percentual de importância dos requisitos', body);
  };

  Q.secRelacoes = function (s, c) {
    if (!s.reqs.length || !s.chars.length) return sec('etapa-3-4', 'Etapas 3 e 4', 'Matriz de relacionamentos', empty('Cadastre requisitos e características para preencher a matriz.'));
    const items = s.reqs.map(function (r) {
      const parts = [];
      s.chars.forEach(function (ch, j) {
        const lv = Q.relLevel(s, r.id, ch.id);
        if (lv) parts.push({ lv: lv, html: '<span class="pill">' + code(j) + ' · ' + Q.REL[lv] + ' = ' + f(Q.weight(s, lv)) + '</span> ' + esc(ch.name || 'Sem nome') });
      });
      const ord = { s: 0, m: 1, w: 2 };
      parts.sort(function (a, b) { return ord[a.lv] - ord[b.lv]; });
      return '<li><b>' + esc(r.name || 'Sem nome') + '</b><span>' + (parts.length ? parts.map(function (p) { return p.html; }).join(' · ') : '<i>sem relação com nenhuma característica</i>') + '</span></li>';
    }).join('');
    const body = '<p>Características técnicas: ' + s.chars.map(function (ch, j) { return '<b>' + code(j) + '</b> ' + esc(ch.name || 'Sem nome') + ' (' + Q.DIRS[ch.dir].label.toLowerCase() + ')'; }).join('; ') +
      '. Escala: forte = ' + f(s.scale.s) + ', média = ' + f(s.scale.m) + ', fraca = ' + f(s.scale.w) + ', inexistente = 0.</p><ul class="rel">' + items + '</ul>' + Q.notesHTML(s.notes.rel);
    return sec('etapa-3-4', 'Etapas 3 e 4', 'Matriz de relacionamentos', body);
  };

  Q.secCalculo = function (s, c) {
    if (!s.chars.length) return sec('etapa-5-6', 'Etapas 5 e 6', 'Importância das características técnicas', empty('Nenhuma característica cadastrada.'));
    const rows = s.chars.map(function (ch, j) {
      const parts = [];
      s.reqs.forEach(function (r, i) {
        const lv = Q.relLevel(s, r.id, ch.id);
        if (lv) parts.push(c.imp[i] + '×' + f(Q.weight(s, lv)));
      });
      return '<tr' + (c.isTop[j] ? ' class="top"' : '') + '><td class="k">' + code(j) + '</td><td>' + esc(ch.name || 'Sem nome') + '</td><td class="f">' + (parts.join(' + ') || '0') +
        '</td><td class="n">' + f(c.charTotal[j]) + '</td><td class="n">' + f(c.charPct[j], 2) + '%</td><td class="n">' + (c.charTotal[j] > 0 ? c.charRank[j] + 'º' : '–') + '</td></tr>';
    }).join('');
    const body = '<p>Para cada característica, soma de (importância do requisito × intensidade do relacionamento). O percentual divide cada total pela soma de todas as características, <b>' + f(c.charSum) + '</b>.</p>' +
      '<div class="tbl"><table><thead><tr><th></th><th>Característica</th><th>Cálculo</th><th class="n">Total</th><th class="n">%</th><th class="n">Ordem</th></tr></thead><tbody>' + rows +
      '<tr class="total"><td></td><td>Total</td><td></td><td class="n">' + f(c.charSum) + '</td><td class="n">100%</td><td></td></tr></tbody></table></div>' +
      '<p class="hint">Percentuais arredondados em duas casas.</p>';
    return sec('etapa-5-6', 'Etapas 5 e 6', 'Importância das características técnicas', body);
  };

  Q.secTelhado = function (s, c) {
    const m = s.chars.length;
    if (m < 2) return sec('etapa-7', 'Etapa 7', 'Telhado: correlações entre as características', empty('São necessárias pelo menos duas características.'));
    const pos = [], neg = [];
    let none = 0;
    for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) {
      const v = Q.corrOf(s, s.chars[i].id, s.chars[j].id);
      if (!v) { none++; continue; }
      const li = '<li><span class="pill ' + (v.indexOf('+') >= 0 ? '' : 'n') + '">' + Q.CORR_SYM[v] + '</span> ' + esc(charName(s, i)) + ' × ' + esc(charName(s, j)) + ' <span class="muted">(' + Q.CORR_LABEL[v] + ')</span></li>';
      (v.indexOf('+') >= 0 ? pos : neg).push({ v: v, li: li });
    }
    pos.sort(function (a, b) { return b.v.length - a.v.length; });
    neg.sort(function (a, b) { return b.v.length - a.v.length; });
    let body = '<div class="cols2">' +
      '<div><h3>Correlações positivas</h3>' + (pos.length ? '<ul class="plain">' + pos.map(function (x) { return x.li; }).join('') + '</ul>' : empty('Nenhuma.')) + '</div>' +
      '<div><h3>Correlações negativas (conflitos)</h3>' + (neg.length ? '<ul class="plain">' + neg.map(function (x) { return x.li; }).join('') + '</ul>' : empty('Nenhuma.')) + '</div></div>';
    if (none) body += '<p class="hint">As outras ' + none + ' combinações ficam sem correlação.</p>';
    body += Q.notesHTML(s.notes.corr);
    return sec('etapa-7', 'Etapa 7', 'Telhado: correlações entre as características', body);
  };

  Q.secBenchmarking = function (s, c) {
    const K = s.comps.length;
    if (!K || !s.reqs.length) return sec('item-8', 'Item 8', 'Benchmarking competitivo', empty('Cadastre concorrentes e requisitos para comparar.'));
    const bm = s.scale.benchMax, im = s.scale.impMax;
    const order = s.comps.map(function (_, k) { return k; }).sort(function (a, b) { return c.benchWeighted[b] - c.benchWeighted[a] || a - b; });
    const rank = order.map(function (k) { return '<b>' + esc(s.comps[k].name) + '</b> (' + f(c.benchWeighted[k]) + ')'; });
    let body = '<p>Na pontuação ponderada (importância × nota), a ordem é: ' + rank.join(', ') + '.</p>';

    body += '<div class="cards">' + s.comps.map(function (k, ki) {
      const strong = [], weak = [];
      s.reqs.forEach(function (r, i) {
        const v = Q.benchNote(s, r.id, k.id);
        if (v == null) return;
        const tag = esc(r.name || 'Sem nome') + ' (' + v + ')';
        const isLeader = c.leaders[i].who.indexOf(ki) >= 0 && c.leaders[i].who.length < K;
        if (v >= bm - 1) strong.push({ t: tag + (isLeader ? ' <span class="pill">melhor</span>' : ''), p: r.imp * 10 + v });
        else if (v <= Math.floor(bm * 0.4) || (v <= Math.round(bm * 0.6) && r.imp >= im - 1)) weak.push({ t: tag, p: r.imp * 10 - v });
      });
      strong.sort(function (a, b) { return b.p - a.p; });
      weak.sort(function (a, b) { return b.p - a.p; });
      const ul = function (arr) { return arr.length ? '<ul>' + arr.map(function (x) { return '<li>' + x.t + '</li>'; }).join('') + '</ul>' : '<p class="muted">Nenhum destaque.</p>'; };
      return '<div class="card"><h3>' + esc(k.name || 'Sem nome') + ' <em>ponderado ' + f(c.benchWeighted[ki]) + ' · ' + c.benchRank[ki] + 'º</em></h3>' +
        '<div class="dt">Pontos fortes</div>' + ul(strong) + '<div class="dt w">Pontos fracos</div>' + ul(weak) + '</div>';
    }).join('') + '</div>';

    const rows = s.reqs.map(function (r, i) {
      const L = c.leaders[i];
      const who = L.best == null ? '–' : (L.who.length === K && K > 1 ? 'Empate entre todos' : L.who.map(function (k) { return esc(s.comps[k].name); }).join(', '));
      return '<tr><td>' + esc(r.name || 'Sem nome') + '</td><td class="n">' + r.imp + '</td><td>' + who + '</td><td class="n">' + (L.best == null ? '–' : L.best) + '</td></tr>';
    }).join('');
    body += '<h3 class="sub">Melhor concorrente em cada requisito</h3><div class="tbl"><table><thead><tr><th>Requisito</th><th class="n">Imp.</th><th>Melhor</th><th class="n">Nota</th></tr></thead><tbody>' + rows + '</tbody></table></div>';

    const gaps = s.reqs.filter(function (r, i) { return r.imp >= im - 1 && c.leaders[i].best != null && c.leaders[i].best < bm; });
    if (gaps.length) body += '<p class="callout">Lacuna de mercado: nenhum concorrente atinge nota ' + bm + ' em ' + joinPt(gaps.map(function (r) { return '<b>' + esc(r.name) + '</b>'; })) + '.</p>';
    else {
      const leadersTop = {};
      s.reqs.forEach(function (r, i) { if (r.imp >= im - 1) c.leaders[i].who.forEach(function (k) { leadersTop[k] = (leadersTop[k] || 0) + 1; }); });
      const nTop = s.reqs.filter(function (r) { return r.imp >= im - 1; }).length;
      const all = Object.keys(leadersTop).some(function (k) { return leadersTop[k] === nTop; });
      if (nTop && !all) body += '<p class="callout">Nenhum concorrente lidera em todos os requisitos de importância ' + (im - 1) + ' ou ' + im + ': há espaço para um produto que reúna esses pontos fortes.</p>';
    }
    body += Q.notesHTML(s.notes.bench);
    return sec('item-8', 'Item 8', 'Benchmarking competitivo: pontos fortes e fracos', body);
  };

  Q.secPrioridades = function (s, c) {
    const N = s.settings.topN;
    const top = c.order.filter(function (j) { return c.isTop[j]; });
    const title = (N === 1 ? 'A característica técnica prioritária' : 'As ' + N + ' características técnicas prioritárias');
    if (!top.length) return sec('item-9', 'Item 9', title, empty('Preencha a matriz de relacionamentos para calcular as prioridades.'));
    const items = top.map(function (j) {
      const ch = s.chars[j];
      const strong = [], other = [];
      let best = null;
      s.reqs.forEach(function (r, i) {
        const lv = Q.relLevel(s, r.id, ch.id);
        if (!lv) return;
        const pts = c.imp[i] * Q.weight(s, lv);
        if (!best || pts > best.pts) best = { r: r, pts: pts };
        if (lv === 's') strong.push({ r: r, i: i });
        else other.push(esc(r.name) + ' (' + Q.REL[lv] + ')');
      });
      strong.sort(function (a, b) { return b.r.imp - a.r.imp; });
      const txt = [];
      if (strong.length) txt.push('Tem relação forte com ' + joinPt(strong.map(function (x) { return esc(x.r.name) + ' (importância ' + x.r.imp + ')'; })) + '.');
      if (other.length) txt.push('Também atende ' + joinPt(other) + '.');
      if (best) txt.push('O requisito que mais pesa é ' + esc(best.r.name) + ', com ' + f(best.pts) + ' dos ' + f(c.charTotal[j]) + ' pontos.');
      const syn = [], con = [];
      s.chars.forEach(function (o, q) {
        if (q === j) return;
        const v = Q.corrOf(s, ch.id, o.id);
        if (!v) return;
        const lab = code(q) + ' ' + esc(o.name) + ' (' + Q.CORR_SYM[v] + ')';
        (v.indexOf('+') >= 0 ? syn : con).push(lab);
      });
      if (syn.length) txt.push('No telhado, tem sinergia com ' + joinPt(syn) + '.');
      if (con.length) txt.push('Entra em conflito com ' + joinPt(con) + '.');
      if (s.comps.length && strong.length) {
        const b = strong.map(function (x) {
          const L = c.leaders[x.i];
          if (L.best == null) return null;
          return esc(x.r.name) + ': ' + (L.who.length === s.comps.length && s.comps.length > 1 ? 'todos empatados' : L.who.map(function (k) { return esc(s.comps[k].name); }).join(', ')) + ' (' + L.best + ')';
        }).filter(Boolean);
        if (b.length) txt.push('Melhor concorrente nesses requisitos: ' + b.join('; ') + '.');
      }
      return '<li><b>' + code(j) + ' · ' + esc(ch.name || 'Sem nome') + '</b> <span class="pill">' + f(c.charTotal[j]) + ' pontos · ' + f(c.charPct[j], 2) + '%</span><p>' + txt.join(' ') + '</p></li>';
    }).join('');

    const conflicts = [];
    top.forEach(function (j, a) {
      s.chars.forEach(function (o, q) {
        if (q === j) return;
        const v = Q.corrOf(s, s.chars[j].id, o.id);
        if (!v || v.indexOf('-') < 0) return;
        if (c.isTop[q] && top.indexOf(q) < a) return;
        conflicts.push(code(j) + ' × ' + code(q) + ' (' + Q.CORR_SYM[v] + ')');
      });
    });
    let body = '<p>Ordenadas pela importância calculada na etapa 5.</p><ol class="prio">' + items + '</ol>';
    if (conflicts.length) body += '<p class="callout">Atenção de projeto: as prioridades têm correlação negativa em ' + joinPt(conflicts) + '. Esses pontos exigem uma solução de compromisso.</p>';
    body += Q.notesHTML(s.notes.prio);
    return sec('item-9', 'Item 9', title, body);
  };

  /* ---------- enunciado ---------- */
  Q.secEnunciado = function (s, paper) {
    const st = s.statement, sc = s.scale;
    let h = '';
    if (st.context.trim()) h += '<h3>Situação-problema</h3>' + Q.richText(st.context);
    if (s.reqs.length) {
      h += '<p class="cap" data-keep="1">Tabela 1 – Necessidades dos clientes</p><div class="tbl"><table class="stmt-t"><thead><tr><th>Requisitos dos clientes</th><th class="n">Importância (1 a ' + sc.impMax + ')</th></tr></thead><tbody>' +
        s.reqs.map(function (r) { return '<tr><td>' + esc(r.name || 'Sem nome') + '</td><td class="n">' + r.imp + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    if (st.charIntro.trim()) h += Q.richText(st.charIntro).replace('<p>', '<p data-keep="1">');
    if (s.chars.length) {
      h += '<p class="cap" data-keep="1">Tabela 2 – Características técnicas do produto</p><div class="tbl"><table class="stmt-t"><thead><tr><th>Código</th><th>Característica técnica</th></tr></thead><tbody>' +
        s.chars.map(function (ch, j) { return '<tr><td class="k">' + code(j) + '</td><td>' + esc(ch.name || 'Sem nome') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    if (s.comps.length && s.reqs.length) {
      if (st.benchIntro.trim()) h += Q.richText(st.benchIntro).replace('<p>', '<p data-keep="1">');
      h += '<p class="cap" data-keep="1">Tabela 3 – Benchmarking competitivo (notas de 1 a ' + sc.benchMax + ')</p><div class="tbl"><table class="stmt-t"><thead><tr><th>Requisito</th>' +
        s.comps.map(function (k) { return '<th class="n">' + esc(k.name || 'Sem nome') + '</th>'; }).join('') + '</tr></thead><tbody>' +
        s.reqs.map(function (r) {
          return '<tr><td>' + esc(r.name || 'Sem nome') + '</td>' + s.comps.map(function (k) { const v = Q.benchNote(s, r.id, k.id); return '<td class="n">' + (v == null ? '' : v) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
    }
    if (st.task.trim() || st.steps.length) {
      h += '<h3>Atividade proposta</h3>' + Q.richText(st.task);
      if (st.steps.length) h += '<ol class="steps">' + st.steps.map(function (e) { return '<li>' + esc(e.text) + '</li>'; }).join('') + '</ol>';
    }
    if (paper) return '<section class="sec stmt">' + h + '</section>';
    return '<section class="sec stmt" id="enunciado"><h2><small>Enunciado</small>' + esc(st.title || s.meta.title || 'Exercício') + '</h2>' + h + '</section>';
  };

  /* ---------- folhas de resposta em branco ---------- */
  function lines(n) { let h = '<div class="lines">'; for (let i = 0; i < n; i++) h += '<div class="ln"></div>'; return h + '</div>'; }
  Q.renderWorksheet = function (s) {
    let h = '';
    if (s.reqs.length) {
      h += sec('ws-1', 'Etapas 1 e 2', 'Percentual de importância dos requisitos',
        '<div class="tbl"><table class="ws"><thead><tr><th></th><th>Requisito do cliente</th><th class="n w-imp">Importância</th><th class="w-calc">Cálculo</th><th class="n w-pct">%</th></tr></thead><tbody>' +
        s.reqs.map(function (r, i) { return '<tr><td class="k">R' + (i + 1) + '</td><td>' + esc(r.name || 'Sem nome') + '</td><td></td><td></td><td></td></tr>'; }).join('') +
        '<tr class="total"><td></td><td>Total</td><td></td><td></td><td></td></tr></tbody></table></div>');
    }
    if (s.chars.length) {
      h += sec('ws-2', 'Etapas 5 e 6', 'Importância das características técnicas',
        '<div class="tbl"><table class="ws"><thead><tr><th></th><th>Característica técnica</th><th class="w-calc2">Cálculo</th><th class="n w-tot">Total</th><th class="n w-pct">%</th><th class="n w-ord">Ordem</th></tr></thead><tbody>' +
        s.chars.map(function (ch, j) { return '<tr><td class="k">' + code(j) + '</td><td>' + esc(ch.name || 'Sem nome') + '</td><td></td><td></td><td></td><td></td></tr>'; }).join('') +
        '<tr class="total"><td></td><td>Total</td><td></td><td></td><td></td><td></td></tr></tbody></table></div>');
    }
    if (s.chars.length >= 2) {
      h += sec('ws-3', 'Etapa 7', 'Telhado: correlações entre as características',
        '<div class="cols2"><div><h3>Correlações positivas</h3>' + lines(5) + '</div><div><h3>Correlações negativas (conflitos)</h3>' + lines(5) + '</div></div>');
    }
    if (s.comps.length) {
      h += sec('ws-4', 'Item 8', 'Benchmarking competitivo: pontos fortes e fracos',
        '<div class="ws-cards">' + s.comps.map(function (k) {
          return '<div class="card"><h3>' + esc(k.name || 'Sem nome') + '</h3><div class="dt">Pontos fortes</div>' + lines(3) + '<div class="dt w">Pontos fracos</div>' + lines(3) + '</div>';
        }).join('') + '</div><h3 class="sub">Conclusão</h3>' + lines(3));
    }
    const N = s.settings.topN;
    let items = '';
    for (let i = 0; i < N; i++) items += '<li><div class="ws-field"><span>Característica:</span><div class="ln"></div></div><div class="ws-lab">Justificativa</div>' + lines(3) + '</li>';
    h += sec('ws-5', 'Item 9', N === 1 ? 'A característica técnica prioritária' : 'As ' + N + ' características técnicas prioritárias', '<ol class="prio ws-prio">' + items + '</ol>');
    return h;
  };

  Q.renderAnalysis = function (s, c, which) {
    const all = {
      steps: [Q.secRequisitos, Q.secRelacoes, Q.secCalculo, Q.secTelhado],
      bench: [Q.secBenchmarking],
      prio: [Q.secPrioridades]
    };
    const keys = which || ['steps', 'bench', 'prio'];
    return keys.map(function (k) { return all[k].map(function (fn) { return fn(s, c); }).join(''); }).join('');
  };
})(window.QFD);
