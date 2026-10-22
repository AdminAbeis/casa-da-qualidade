/* Casa da Qualidade (QFD) — painel de edição */
(function (Q) {
  'use strict';
  const esc = Q.esc;

  const ICON = {
    up: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.5 3.5 8.5h9z"/></svg>',
    down: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 12.5 3.5 7.5h9z"/></svg>',
    del: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>'
  };

  function actions(kind, id, i, len, label) {
    return '<div class="row-actions">' +
      '<button type="button" class="ib" data-move="-1" data-kind="' + kind + '" data-id="' + id + '" aria-label="Mover ' + esc(label) + ' para cima"' + (i === 0 ? ' disabled' : '') + '>' + ICON.up + '</button>' +
      '<button type="button" class="ib" data-move="1" data-kind="' + kind + '" data-id="' + id + '" aria-label="Mover ' + esc(label) + ' para baixo"' + (i === len - 1 ? ' disabled' : '') + '>' + ICON.down + '</button>' +
      '<button type="button" class="ib del" data-del="' + kind + '" data-id="' + id + '" aria-label="Excluir ' + esc(label) + '">' + ICON.del + '</button></div>';
  }

  function pane(key, title, count, body, open) {
    return '<details class="pane" data-pane="' + key + '"' + (open ? ' open' : '') + '><summary><span>' + esc(title) + '</span>' +
      (count != null ? '<span class="count">' + count + '</span>' : '') + '</summary><div class="pane-body">' + body + '</div></details>';
  }

  Q.renderEditor = function (s, openState) {
    const isOpen = function (k, d) { return openState && k in openState ? openState[k] : d; };
    const sc = s.scale;

    const proj =
      '<label class="fld" for="f-title"><span>Produto ou título</span><input id="f-title" data-meta="title" value="' + esc(s.meta.title) + '"></label>' +
      '<label class="fld" for="f-subtitle"><span>Disciplina ou subtítulo</span><input id="f-subtitle" data-meta="subtitle" value="' + esc(s.meta.subtitle) + '" placeholder="Ex.: Administração da Produção"></label>' +
      '<label class="fld" for="f-author"><span>Autor(es)</span><input id="f-author" data-meta="author" value="' + esc(s.meta.author) + '" placeholder="Nome de quem entrega"></label>' +
      '<label class="fld inline" for="f-topn"><span>Quantas características prioritárias destacar</span><input id="f-topn" type="number" min="1" max="20" class="numin" data-setting="topN" value="' + s.settings.topN + '"></label>';

    const reqs = '<div class="rows">' + s.reqs.map(function (r, i) {
      return '<div class="row"><span class="tag">R' + (i + 1) + '</span>' +
        '<textarea class="nm" rows="1" id="req-name-' + r.id + '" data-kind="reqs" data-id="' + r.id + '" data-field="name" placeholder="O que o cliente deseja" aria-label="Requisito R' + (i + 1) + '">' + esc(r.name) + '</textarea>' +
        '<input type="number" class="numin" id="req-imp-' + r.id + '" data-kind="reqs" data-id="' + r.id + '" data-field="imp" min="1" max="' + sc.impMax + '" value="' + r.imp + '" aria-label="Importância de R' + (i + 1) + '" title="Importância (1 a ' + sc.impMax + ')">' +
        actions('reqs', r.id, i, s.reqs.length, 'R' + (i + 1)) + '</div>';
    }).join('') + '</div>' +
      (s.reqs.length ? '<p class="cols-hint">Nome · importância (1 a ' + sc.impMax + ')</p>' : '<p class="muted">Nenhum requisito ainda.</p>') +
      '<button type="button" class="add" data-add="reqs">+ Adicionar requisito</button>';

    const dirOpts = function (sel) {
      return Object.keys(Q.DIRS).map(function (k) {
        return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + (Q.DIRS[k].sym ? Q.DIRS[k].sym + ' ' : '') + Q.DIRS[k].label + '</option>';
      }).join('');
    };
    const chars = '<div class="rows">' + s.chars.map(function (ch, i) {
      return '<div class="row"><span class="tag">C' + (i + 1) + '</span>' +
        '<textarea class="nm" rows="1" id="char-name-' + ch.id + '" data-kind="chars" data-id="' + ch.id + '" data-field="name" placeholder="Como atender (medida técnica)" aria-label="Característica C' + (i + 1) + '">' + esc(ch.name) + '</textarea>' +
        actions('chars', ch.id, i, s.chars.length, 'C' + (i + 1)).replace('<div class="row-actions">', '<div class="row-actions span2">') +
        '<select class="dirsel" id="char-dir-' + ch.id + '" data-kind="chars" data-id="' + ch.id + '" data-field="dir" aria-label="Sentido de melhoria de C' + (i + 1) + '">' + dirOpts(ch.dir) + '</select></div>';
    }).join('') + '</div>' +
      (s.chars.length ? '' : '<p class="muted">Nenhuma característica ainda.</p>') +
      '<button type="button" class="add" data-add="chars">+ Adicionar característica</button>';

    const comps = '<div class="rows">' + s.comps.map(function (k, i) {
      return '<div class="row"><span class="tag">' + String.fromCharCode(65 + (i % 26)) + '</span>' +
        '<input id="comp-name-' + k.id + '" data-kind="comps" data-id="' + k.id + '" data-field="name" value="' + esc(k.name) + '" placeholder="Produto concorrente" aria-label="Concorrente ' + (i + 1) + '">' +
        actions('comps', k.id, i, s.comps.length, k.name || 'concorrente').replace('<div class="row-actions">', '<div class="row-actions span2">') + '</div>';
    }).join('') + '</div>' +
      (s.comps.length ? '' : '<p class="muted">Sem concorrentes, o benchmarking fica de fora.</p>') +
      '<button type="button" class="add" data-add="comps">+ Adicionar concorrente</button>';

    let bench;
    if (!s.comps.length || !s.reqs.length) bench = '<p class="muted">Cadastre requisitos e concorrentes para dar as notas.</p>';
    else {
      bench = '<div class="tbl"><table class="grid"><thead><tr><th>Requisito</th>' + s.comps.map(function (k, i) {
        return '<th class="n" title="' + esc(k.name) + '">' + String.fromCharCode(65 + (i % 26)) + '</th>';
      }).join('') + '</tr></thead><tbody>' + s.reqs.map(function (r, i) {
        return '<tr><td title="' + esc(r.name) + '"><span class="tag">R' + (i + 1) + '</span> <span class="clip">' + esc(r.name || 'Sem nome') + '</span></td>' + s.comps.map(function (k) {
          const v = Q.benchNote(s, r.id, k.id);
          return '<td class="n"><input type="number" class="numin sm" id="bench-' + r.id + '-' + k.id + '" data-bench-r="' + r.id + '" data-bench-k="' + k.id + '" min="1" max="' + sc.benchMax + '" value="' + (v == null ? '' : v) + '" aria-label="Nota de ' + esc(k.name) + ' em R' + (i + 1) + '"></td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div><p class="cols-hint">Notas de 1 a ' + sc.benchMax + '. Também dá para tocar nas notas direto na casa.</p>';
    }

    const scale =
      '<div class="scale-grid">' +
      '<label class="fld" for="sc-s"><span>◎ Forte</span><input id="sc-s" type="number" min="0" step="any" class="numin" data-scale="s" value="' + sc.s + '"></label>' +
      '<label class="fld" for="sc-m"><span>○ Média</span><input id="sc-m" type="number" min="0" step="any" class="numin" data-scale="m" value="' + sc.m + '"></label>' +
      '<label class="fld" for="sc-w"><span>△ Fraca</span><input id="sc-w" type="number" min="0" step="any" class="numin" data-scale="w" value="' + sc.w + '"></label>' +
      '</div><div class="scale-grid two">' +
      '<label class="fld" for="sc-imp"><span>Importância máxima</span><input id="sc-imp" type="number" min="2" max="10" class="numin" data-scale="impMax" value="' + sc.impMax + '"></label>' +
      '<label class="fld" for="sc-bench"><span>Nota máxima (benchmarking)</span><input id="sc-bench" type="number" min="2" max="10" class="numin" data-scale="benchMax" value="' + sc.benchMax + '"></label>' +
      '</div><p class="cols-hint">Padrão do QFD: 9, 3 e 1. Outra escala comum é 5, 3 e 1.</p>';

    const notes = [
      ['rel', 'Etapas 3 e 4 · justificativa dos relacionamentos'],
      ['corr', 'Etapa 7 · justificativa do telhado'],
      ['bench', 'Item 8 · conclusões do benchmarking'],
      ['prio', 'Item 9 · recomendações']
    ].map(function (a) {
      return '<label class="fld" for="note-' + a[0] + '"><span>' + esc(a[1]) + '</span><textarea id="note-' + a[0] + '" data-note="' + a[0] + '" rows="4">' + esc(s.notes[a[0]]) + '</textarea></label>';
    }).join('') + '<p class="cols-hint">Linhas que começam com “- ” viram lista; **texto** fica em negrito. Os comentários entram no PDF.</p>';

    const st = s.statement;
    const stf = function (key, label, rows, ph) {
      return '<label class="fld" for="st-' + key + '"><span>' + esc(label) + '</span><textarea id="st-' + key + '" data-stmt="' + key + '" rows="' + rows + '" placeholder="' + esc(ph || '') + '">' + esc(st[key]) + '</textarea></label>';
    };
    const stmt =
      '<label class="fld" for="st-title"><span>Título do exercício</span><input id="st-title" data-stmt="title" value="' + esc(st.title) + '" placeholder="Ex.: Construção da Casa da Qualidade (QFD)"></label>' +
      stf('context', 'Situação-problema (aparece antes da Tabela 1)', 6, 'Descreva o produto, o público e a pesquisa feita.') +
      stf('charIntro', 'Texto antes da Tabela 2 (características)', 2) +
      stf('benchIntro', 'Texto antes da Tabela 3 (benchmarking)', 2) +
      stf('task', 'Atividade proposta', 3, 'Com base nas informações apresentadas…') +
      '<div class="fld"><span>Etapas e regras do exercício</span></div>' +
      '<div class="rows">' + st.steps.map(function (e, i) {
        return '<div class="row"><span class="tag">' + (i + 1) + '.</span>' +
          '<textarea class="nm" rows="1" id="step-text-' + e.id + '" data-step="' + e.id + '" placeholder="Descreva a etapa" aria-label="Etapa ' + (i + 1) + '">' + esc(e.text) + '</textarea>' +
          actions('steps', e.id, i, st.steps.length, 'etapa ' + (i + 1)).replace('<div class="row-actions">', '<div class="row-actions span2">') + '</div>';
      }).join('') + '</div>' +
      '<button type="button" class="add" data-add="steps">+ Adicionar etapa</button>' +
      '<p class="cols-hint">As Tabelas 1, 2 e 3 são montadas com os requisitos, as características e as notas cadastrados. O enunciado entra no PDF do exercício em branco e, se você quiser, no da resolução.</p>';

    return pane('projeto', 'Projeto', null, proj, isOpen('projeto', false)) +
      pane('stmt', 'Enunciado do exercício', st.steps.length || null, stmt, isOpen('stmt', false)) +
      pane('reqs', 'Requisitos do cliente', s.reqs.length, reqs, isOpen('reqs', true)) +
      pane('chars', 'Características técnicas', s.chars.length, chars, isOpen('chars', true)) +
      pane('comps', 'Concorrentes', s.comps.length, comps, isOpen('comps', false)) +
      pane('bench', 'Notas do benchmarking', null, bench, isOpen('bench', false)) +
      pane('scale', 'Escalas e pesos', null, scale, isOpen('scale', false)) +
      pane('notes', 'Comentários e justificativas', null, notes, isOpen('notes', false));
  };
})(window.QFD);
