/* Casa da Qualidade (QFD) — modelo de dados, exemplo e persistência */
window.QFD = window.QFD || {};
(function (Q) {
  'use strict';

  Q.VERSION = 1;
  Q.STORAGE_KEY = 'qfd-casa-da-qualidade:v1';

  Q.uid = function (prefix) {
    return (prefix || 'x') + Math.random().toString(36).slice(2, 9);
  };

  Q.esc = function (v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* Números no padrão brasileiro */
  Q.fmt = function (v, dec) {
    if (v == null || isNaN(v)) return '–';
    if (dec == null) dec = Number.isInteger(v) ? 0 : 2;
    return Number(v).toFixed(dec).replace('.', ',');
  };

  Q.DIRS = {
    up: { sym: '▲', label: 'Maximizar' },
    down: { sym: '▼', label: 'Minimizar' },
    target: { sym: '◆', label: 'Valor-alvo' },
    none: { sym: '', label: 'Sem sentido definido' }
  };
  Q.DIR_CYCLE = ['up', 'down', 'target', 'none'];

  Q.REL = { s: 'forte', m: 'média', w: 'fraca' };
  Q.REL_CYCLE = ['', 's', 'm', 'w'];

  Q.CORR_LABEL = { '++': 'positiva forte', '+': 'positiva', '-': 'negativa', '--': 'negativa forte' };
  Q.CORR_SYM = { '++': '++', '+': '+', '-': '−', '--': '−−' };
  Q.CORR_CYCLE = ['', '++', '+', '-', '--'];

  Q.PAPERS = {
    A4: { w: 210, h: 297, label: 'A4 · 210 × 297 mm' },
    A3: { w: 297, h: 420, label: 'A3 · 297 × 420 mm' },
    LETTER: { w: 215.9, h: 279.4, label: 'Carta · 216 × 279 mm' },
    LEGAL: { w: 215.9, h: 355.6, label: 'Ofício · 216 × 356 mm' }
  };

  /* Chave do telhado independente da ordem das colunas */
  Q.corrKey = function (a, b) { return a < b ? a + '|' + b : b + '|' + a; };

  Q.blank = function (withPlaceholders) {
    const s = {
      version: Q.VERSION,
      meta: { title: 'Novo produto', subtitle: '', author: '' },
      scale: { s: 9, m: 3, w: 1, impMax: 5, benchMax: 5 },
      settings: { topN: 3 },
      reqs: [], chars: [], comps: [],
      rel: {}, corr: {}, bench: {},
      notes: { rel: '', corr: '', bench: '', prio: '' }
    };
    if (withPlaceholders) {
      for (let i = 1; i <= 3; i++) s.reqs.push({ id: Q.uid('r'), name: 'Requisito do cliente ' + i, imp: 3 });
      for (let i = 1; i <= 3; i++) s.chars.push({ id: Q.uid('c'), name: 'Característica técnica ' + i, dir: 'up' });
      for (let i = 0; i < 2; i++) s.comps.push({ id: Q.uid('k'), name: 'Concorrente ' + 'AB'[i] });
    }
    return s;
  };

  Q.example = function () {
    const s = Q.blank(false);
    s.meta = {
      title: 'Nova garrafa térmica reutilizável',
      subtitle: 'Administração da Produção · Desdobramento da Função Qualidade (QFD)',
      author: ''
    };
    s.reqs = [
      ['r1', 'Manter a bebida quente por várias horas', 5],
      ['r2', 'Ter preço acessível', 4],
      ['r3', 'Ser leve para transportar', 4],
      ['r4', 'Ser resistente a quedas', 5],
      ['r5', 'Ser fácil de limpar', 3],
      ['r6', 'Não apresentar vazamentos', 5]
    ].map(function (a) { return { id: a[0], name: a[1], imp: a[2] }; });
    s.chars = [
      ['c1', 'Capacidade de isolamento térmico', 'up'],
      ['c2', 'Custo de produção', 'down'],
      ['c3', 'Peso da garrafa', 'down'],
      ['c4', 'Resistência do material', 'up'],
      ['c5', 'Diâmetro da abertura', 'up'],
      ['c6', 'Sistema de vedação', 'up']
    ].map(function (a) { return { id: a[0], name: a[1], dir: a[2] }; });
    s.comps = [['pa', 'Produto A'], ['pb', 'Produto B'], ['pc', 'Produto C']]
      .map(function (a) { return { id: a[0], name: a[1] }; });

    const M = [
      [9, 0, 0, 0, 3, 9],
      [3, 9, 1, 3, 0, 1],
      [3, 0, 9, 3, 0, 0],
      [0, 0, 1, 9, 0, 1],
      [0, 0, 0, 0, 9, 3],
      [0, 0, 0, 1, 3, 9]
    ];
    const lv = { 9: 's', 3: 'm', 1: 'w' };
    s.reqs.forEach(function (r, i) {
      s.rel[r.id] = {};
      s.chars.forEach(function (c, j) { if (M[i][j]) s.rel[r.id][c.id] = lv[M[i][j]]; });
    });

    const B = { pa: [5, 2, 3, 4, 3, 5], pb: [3, 5, 4, 3, 5, 3], pc: [4, 3, 3, 5, 4, 4] };
    s.reqs.forEach(function (r, i) {
      s.bench[r.id] = {};
      s.comps.forEach(function (k) { s.bench[r.id][k.id] = B[k.id][i]; });
    });

    [['c1', 'c2', '-'], ['c1', 'c3', '-'], ['c1', 'c4', '+'], ['c1', 'c5', '--'], ['c1', 'c6', '++'],
     ['c2', 'c3', '-'], ['c2', 'c4', '-'], ['c2', 'c6', '-'], ['c3', 'c4', '-'], ['c4', 'c6', '+'], ['c5', 'c6', '-']]
      .forEach(function (a) { s.corr[Q.corrKey(a[0], a[1])] = a[2]; });

    s.notes = {
      rel: [
        '- **Manter a bebida quente:** o isolamento (C1) é o que segura a temperatura e a tampa (C6) é por onde mais se perde calor; abertura larga (C5) troca mais calor com o ar.',
        '- **Preço acessível:** o custo (C2) define o preço; parede dupla a vácuo (C1) e material resistente (C4) encarecem.',
        '- **Leve para transportar:** o peso (C3) é a própria medida; camadas isolantes (C1) e paredes grossas (C4) somam massa.',
        '- **Resistente a quedas:** o material (C4) absorve o impacto; garrafa pesada cai com mais força (C3) e a tampa pode se soltar (C6).',
        '- **Fácil de limpar:** boca larga (C5) permite usar escova; vedação desmontável (C6) facilita tirar resíduos.',
        '- **Sem vazamentos:** é a função da vedação (C6); quanto maior a boca (C5), mais difícil vedar; trincas no corpo (C4) podem vazar.'
      ].join('\n'),
      corr: [
        '- C1 × C6 (++): sem tampa bem vedada, o isolamento do corpo perde efeito.',
        '- C1 × C4 (+): a parede dupla de aço que isola também deixa o corpo mais rígido.',
        '- C4 × C6 (+): corpo resistente não deforma na queda e a vedação continua encaixada.',
        '- C1 × C5 (−−): aumentar a abertura reduz a capacidade de isolamento; é o maior conflito do projeto.',
        '- C2 × C1, C4, C6 (−): mais isolamento, material mais resistente e vedação melhor aumentam o custo.',
        '- C3 × C1, C4 (−): mais isolamento e paredes mais grossas deixam a garrafa mais pesada.',
        '- C5 × C6 (−): boca larga exige uma vedação maior e mais difícil de garantir.'
      ].join('\n'),
      bench: 'Oportunidade: nenhum concorrente une a conservação e a vedação do Produto A à resistência do Produto C com preço competitivo. A nova garrafa deve mirar nota 5 nesses requisitos sem chegar ao preço do Produto A.',
      prio: 'A equipe precisa definir uma abertura que permita a limpeza sem perder calor e escolher materiais que mantenham o preço acessível.'
    };
    return s;
  };

  function num(v, d, min, max) {
    v = Number(v);
    if (!isFinite(v)) v = d;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    return v;
  }

  /* Valida e completa qualquer JSON importado */
  Q.normalize = function (raw) {
    const d = Q.blank(false);
    if (!raw || typeof raw !== 'object') return d;
    const s = d;
    const m = raw.meta || {};
    s.meta = { title: String(m.title || d.meta.title), subtitle: String(m.subtitle || ''), author: String(m.author || '') };
    const sc = raw.scale || {};
    s.scale = {
      s: num(sc.s, 9, 0, 999), m: num(sc.m, 3, 0, 999), w: num(sc.w, 1, 0, 999),
      impMax: Math.round(num(sc.impMax, 5, 2, 10)), benchMax: Math.round(num(sc.benchMax, 5, 2, 10))
    };
    s.settings = { topN: Math.round(num((raw.settings || {}).topN, 3, 1, 20)) };
    const seen = {};
    function list(arr, prefix, map) {
      return (Array.isArray(arr) ? arr : []).filter(function (x) { return x && typeof x === 'object'; }).map(function (x) {
        let id = String(x.id || '');
        if (!id || seen[id]) id = Q.uid(prefix);
        seen[id] = true;
        return map(x, id);
      });
    }
    s.reqs = list(raw.reqs, 'r', function (x, id) {
      return { id: id, name: String(x.name || ''), imp: Math.round(num(x.imp, 3, 1, s.scale.impMax)) };
    });
    s.chars = list(raw.chars, 'c', function (x, id) {
      return { id: id, name: String(x.name || ''), dir: Q.DIRS[x.dir] ? x.dir : 'up' };
    });
    s.comps = list(raw.comps, 'k', function (x, id) { return { id: id, name: String(x.name || '') }; });

    const rIds = {}, cIds = {}, kIds = {};
    s.reqs.forEach(function (r) { rIds[r.id] = 1; });
    s.chars.forEach(function (c) { cIds[c.id] = 1; });
    s.comps.forEach(function (k) { kIds[k.id] = 1; });

    const rel = raw.rel || {};
    Object.keys(rel).forEach(function (r) {
      if (!rIds[r] || !rel[r]) return;
      Object.keys(rel[r]).forEach(function (c) {
        const v = rel[r][c];
        if (cIds[c] && Q.REL[v]) { s.rel[r] = s.rel[r] || {}; s.rel[r][c] = v; }
      });
    });
    const corr = raw.corr || {};
    Object.keys(corr).forEach(function (k) {
      const p = k.split('|');
      if (p.length === 2 && cIds[p[0]] && cIds[p[1]] && p[0] !== p[1] && Q.CORR_LABEL[corr[k]]) s.corr[Q.corrKey(p[0], p[1])] = corr[k];
    });
    const bench = raw.bench || {};
    Object.keys(bench).forEach(function (r) {
      if (!rIds[r] || !bench[r]) return;
      Object.keys(bench[r]).forEach(function (k) {
        const v = bench[r][k];
        if (kIds[k] && v !== '' && v != null && isFinite(Number(v))) {
          s.bench[r] = s.bench[r] || {};
          s.bench[r][k] = Math.round(num(v, 1, 1, s.scale.benchMax));
        }
      });
    });
    const n = raw.notes || {};
    s.notes = { rel: String(n.rel || ''), corr: String(n.corr || ''), bench: String(n.bench || ''), prio: String(n.prio || '') };
    return s;
  };

  Q.load = function () {
    try {
      const raw = localStorage.getItem(Q.STORAGE_KEY);
      if (raw) return Q.normalize(JSON.parse(raw));
    } catch (e) { /* armazenamento indisponível */ }
    return Q.example();
  };

  Q.save = function (s) {
    try { localStorage.setItem(Q.STORAGE_KEY, JSON.stringify(s)); } catch (e) { /* ignora */ }
  };

  Q.toJSON = function (s) {
    return JSON.stringify(Object.assign({ app: 'casa-da-qualidade-qfd' }, s), null, 2);
  };
})(window.QFD);
