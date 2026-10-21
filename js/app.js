/* Casa da Qualidade (QFD) — aplicação */
(function (Q) {
  'use strict';
  const $ = function (sel) { return document.querySelector(sel); };
  const esc = Q.esc;

  const App = { s: null, c: null, hist: [], fut: [], cur: '', lastKey: '', lastTime: 0, zoom: null, open: {} };

  /* ---------- histórico ---------- */
  function record(key) {
    const next = JSON.stringify(App.s);
    if (next === App.cur) return;
    const now = Date.now();
    if (!(key && key === App.lastKey && now - App.lastTime < 1200)) {
      App.hist.push(App.cur);
      if (App.hist.length > 200) App.hist.shift();
    }
    App.fut = [];
    App.cur = next;
    App.lastKey = key || '';
    App.lastTime = now;
    updateUndo();
  }
  function updateUndo() {
    $('#btn-undo').disabled = !App.hist.length;
    $('#btn-redo').disabled = !App.fut.length;
  }
  function undo() {
    if (!App.hist.length) return;
    App.fut.push(App.cur);
    App.cur = App.hist.pop();
    App.s = Q.normalize(JSON.parse(App.cur));
    App.lastKey = '';
    Q.save(App.s); refresh(true); updateUndo();
  }
  function redo() {
    if (!App.fut.length) return;
    App.hist.push(App.cur);
    App.cur = App.fut.pop();
    App.s = Q.normalize(JSON.parse(App.cur));
    App.lastKey = '';
    Q.save(App.s); refresh(true); updateUndo();
  }

  function commit(opts) {
    opts = opts || {};
    Q.save(App.s);
    record(opts.key);
    refresh(!!opts.structural);
  }

  /* ---------- renderização ---------- */
  let outTimer = null;
  function refresh(structural) {
    App.c = Q.calc(App.s);
    if (structural) renderEditor();
    clearTimeout(outTimer);
    renderOutputs();
  }
  function refreshSoon() {
    clearTimeout(outTimer);
    outTimer = setTimeout(function () { App.c = Q.calc(App.s); renderOutputs(); }, 120);
  }

  function renderEditor() {
    document.querySelectorAll('#editor details.pane').forEach(function (d) { App.open[d.dataset.pane] = d.open; });
    const active = document.activeElement && document.activeElement.id;
    $('#editor').innerHTML = Q.renderEditor(App.s, App.open);
    autosizeAll();
    if (active) { const el = document.getElementById(active); if (el) el.focus({ preventScroll: true }); }
  }

  function autosize(el) { el.style.height = 'auto'; el.style.height = (el.scrollHeight + 2) + 'px'; }
  function autosizeAll() { document.querySelectorAll('#editor textarea.nm').forEach(autosize); }

  function renderOutputs(focusSel) {
    const s = App.s, c = App.c;
    const h = Q.renderHouse(s, c, { interactive: true });
    const box = $('#house');
    box.innerHTML = h.svg;
    box.classList.toggle('fit', App.zoom === 'fit');
    $('#analysis').innerHTML = Q.renderAnalysis(s, c);
    $('#doc-title').textContent = s.meta.title || 'Sem título';
    document.title = (s.meta.title ? s.meta.title + ' · ' : '') + 'Casa da Qualidade (QFD)';
    if (focusSel) { const el = box.querySelector(focusSel); if (el) el.focus({ preventScroll: true }); }
  }

  /* ---------- edição pelo painel ---------- */
  function listOf(kind) { return App.s[kind]; }
  function find(kind, id) { return listOf(kind).find(function (x) { return x.id === id; }); }

  function onEditorInput(e) {
    const el = e.target, s = App.s;
    if (el.classList.contains('nm')) {
      if (/\n/.test(el.value)) el.value = el.value.replace(/\s*\n\s*/g, ' ');
      autosize(el);
    }
    if (el.dataset.meta) { s.meta[el.dataset.meta] = el.value; Q.save(s); record('meta-' + el.dataset.meta); refreshSoon(); return; }
    if (el.dataset.note) { s.notes[el.dataset.note] = el.value; Q.save(s); record('note-' + el.dataset.note); refreshSoon(); return; }
    if (el.dataset.setting === 'topN') {
      if (el.value === '') return;
      s.settings.topN = Math.max(1, Math.min(20, Math.round(+el.value) || 1));
      Q.save(s); record('topn'); refreshSoon(); return;
    }
    if (el.dataset.scale) {
      if (el.value === '' || !isFinite(+el.value)) return;
      const k = el.dataset.scale;
      if (k === 'impMax' || k === 'benchMax') return; /* aplicado no change */
      s.scale[k] = Math.max(0, +el.value);
      Q.save(s); record('scale-' + k); refreshSoon(); return;
    }
    if (el.dataset.benchR) {
      const r = el.dataset.benchR, k = el.dataset.benchK;
      s.bench[r] = s.bench[r] || {};
      if (el.value === '') delete s.bench[r][k];
      else if (isFinite(+el.value)) s.bench[r][k] = Math.max(1, Math.min(s.scale.benchMax, Math.round(+el.value)));
      Q.save(s); record('bench-' + r + k); refreshSoon(); return;
    }
    if (el.dataset.field) {
      const item = find(el.dataset.kind, el.dataset.id);
      if (!item) return;
      const f = el.dataset.field;
      if (f === 'imp') {
        if (el.value === '' || !isFinite(+el.value)) return;
        item.imp = Math.max(1, Math.min(s.scale.impMax, Math.round(+el.value)));
      } else item[f] = el.value;
      Q.save(s); record(f + '-' + item.id); refreshSoon();
    }
  }

  function onEditorChange(e) {
    const el = e.target, s = App.s;
    if (el.dataset.scale === 'impMax' || el.dataset.scale === 'benchMax') {
      const k = el.dataset.scale;
      const v = Math.max(2, Math.min(10, Math.round(+el.value) || 5));
      s.scale[k] = v;
      if (k === 'impMax') s.reqs.forEach(function (r) { r.imp = Math.min(r.imp, v); });
      else Object.keys(s.bench).forEach(function (r) { Object.keys(s.bench[r]).forEach(function (kk) { s.bench[r][kk] = Math.min(s.bench[r][kk], v); }); });
      commit({ structural: true });
      return;
    }
    /* Normaliza o que foi digitado fora da faixa */
    if (el.type === 'number' || el.tagName === 'SELECT') {
      if (el.tagName === 'SELECT' && el.dataset.field === 'dir') {
        const item = find('chars', el.dataset.id);
        if (item) { item.dir = el.value; commit({}); }
        return;
      }
      renderEditor();
    }
  }

  function onEditorClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    const s = App.s;
    if (b.dataset.add) {
      const kind = b.dataset.add;
      let item;
      if (kind === 'reqs') item = { id: Q.uid('r'), name: '', imp: Math.min(3, s.scale.impMax) };
      if (kind === 'chars') item = { id: Q.uid('c'), name: '', dir: 'up' };
      if (kind === 'comps') item = { id: Q.uid('k'), name: 'Concorrente ' + String.fromCharCode(65 + (s.comps.length % 26)) };
      s[kind].push(item);
      App.open[kind] = true;
      commit({ structural: true });
      const el = document.getElementById({ reqs: 'req', chars: 'char', comps: 'comp' }[kind] + '-name-' + item.id);
      if (el) { el.focus(); if (kind === 'comps') el.select(); }
      return;
    }
    if (b.dataset.move) {
      const arr = s[b.dataset.kind];
      const i = arr.findIndex(function (x) { return x.id === b.dataset.id; });
      const j = i + Number(b.dataset.move);
      if (i < 0 || j < 0 || j >= arr.length) return;
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      commit({ structural: true });
      const again = document.querySelector('[data-move="' + b.dataset.move + '"][data-id="' + b.dataset.id + '"]');
      if (again && !again.disabled) again.focus();
      return;
    }
    if (b.dataset.del) {
      const kind = b.dataset.del, id = b.dataset.id;
      const item = find(kind, id);
      s[kind] = s[kind].filter(function (x) { return x.id !== id; });
      if (kind === 'reqs') { delete s.rel[id]; delete s.bench[id]; }
      if (kind === 'chars') {
        Object.keys(s.rel).forEach(function (r) { delete s.rel[r][id]; });
        Object.keys(s.corr).forEach(function (k) { if (k.split('|').indexOf(id) >= 0) delete s.corr[k]; });
      }
      if (kind === 'comps') Object.keys(s.bench).forEach(function (r) { delete s.bench[r][id]; });
      commit({ structural: true });
      toast('“' + ((item && item.name) || 'Item') + '” excluído.', 'Desfazer', undo);
    }
  }

  /* ---------- edição direto na casa ---------- */
  function cycle(arr, cur, back) {
    const i = arr.indexOf(cur);
    return arr[(i + (back ? arr.length - 1 : 1) + arr.length) % arr.length];
  }
  function onHouse(el, back, viaKey) {
    const s = App.s;
    let sel = null, structural = false;
    if (el.dataset.r) {
      const r = el.dataset.r, c = el.dataset.c;
      const next = cycle(Q.REL_CYCLE, Q.relLevel(s, r, c), back);
      s.rel[r] = s.rel[r] || {};
      if (next) s.rel[r][c] = next; else delete s.rel[r][c];
      sel = '[data-r="' + r + '"][data-c="' + c + '"]';
    } else if (el.dataset.imp) {
      const r = find('reqs', el.dataset.imp);
      const max = s.scale.impMax;
      r.imp = back ? (r.imp <= 1 ? max : r.imp - 1) : (r.imp >= max ? 1 : r.imp + 1);
      sel = '[data-imp="' + r.id + '"]'; structural = true;
    } else if (el.dataset.ca) {
      const k = Q.corrKey(el.dataset.ca, el.dataset.cb);
      const next = cycle(Q.CORR_CYCLE, s.corr[k] || '', back);
      if (next) s.corr[k] = next; else delete s.corr[k];
      sel = '[data-ca="' + el.dataset.ca + '"][data-cb="' + el.dataset.cb + '"]';
    } else if (el.dataset.br) {
      const r = el.dataset.br, k = el.dataset.bk, max = s.scale.benchMax;
      const v = Q.benchNote(s, r, k);
      const opts = [null]; for (let i = 1; i <= max; i++) opts.push(i);
      const next = cycle(opts, v, back);
      s.bench[r] = s.bench[r] || {};
      if (next == null) delete s.bench[r][k]; else s.bench[r][k] = next;
      sel = '[data-br="' + r + '"][data-bk="' + k + '"]'; structural = true;
    } else if (el.dataset.dir) {
      const ch = find('chars', el.dataset.dir);
      ch.dir = cycle(Q.DIR_CYCLE, ch.dir, back);
      sel = '[data-dir="' + ch.id + '"]'; structural = true;
    } else if (el.dataset.focus) {
      const p = el.dataset.focus.split(':');
      const map = { req: ['reqs', 'req-name-'], char: ['chars', 'char-name-'], comp: ['comps', 'comp-name-'] }[p[0]];
      const d = document.querySelector('details[data-pane="' + map[0] + '"]');
      if (d) d.open = true;
      const input = document.getElementById(map[1] + p[1]);
      if (input) { input.focus({ preventScroll: true }); input.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); input.select(); }
      return;
    }
    Q.save(s); record();
    App.c = Q.calc(s);
    if (structural) renderEditor();
    renderOutputs(viaKey ? sel : null);
  }

  /* ---------- arquivos ---------- */
  function slug(t) {
    return (String(t || 'qfd').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'qfd');
  }
  function download(name, text, type) {
    try {
      const blob = new Blob([text], { type: type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast('Arquivo ' + name + ' gerado.');
    } catch (e) { toast('Não foi possível gerar o arquivo neste navegador.'); }
  }
  function saveJSON() { download('qfd-' + slug(App.s.meta.title) + '.json', Q.toJSON(App.s), 'application/json'); }
  function saveSVG() {
    const h = Q.renderHouse(App.s, Q.calc(App.s), { standalone: true });
    download('casa-da-qualidade-' + slug(App.s.meta.title) + '.svg', '<?xml version="1.0" encoding="UTF-8"?>\n' + h.svg, 'image/svg+xml');
  }
  function openJSON(file) {
    const fr = new FileReader();
    fr.onload = function () {
      try {
        const raw = JSON.parse(String(fr.result));
        replaceState(Q.normalize(raw));
        toast('Modelo “' + (App.s.meta.title || 'sem título') + '” aberto.', 'Desfazer', undo);
      } catch (e) { toast('Esse arquivo não é um JSON válido da Casa da Qualidade.'); }
    };
    fr.readAsText(file);
  }
  function replaceState(next) {
    App.s = next;
    Q.save(App.s); record('replace'); App.lastKey = '';
    refresh(true);
  }

  /* ---------- modal ---------- */
  function modal(title, bodyHTML, buttons) {
    const m = $('#modal');
    m.querySelector('.modal-title').textContent = title;
    m.querySelector('.modal-body').innerHTML = bodyHTML;
    const foot = m.querySelector('.modal-foot');
    foot.innerHTML = '';
    buttons.forEach(function (b) {
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'btn' + (b.primary ? ' primary' : '');
      el.textContent = b.label;
      el.addEventListener('click', function () { if (b.onClick && b.onClick() === false) return; closeModal(); });
      foot.appendChild(el);
    });
    App.lastFocus = document.activeElement;
    m.hidden = false;
    const first = m.querySelector('.modal-body input, .modal-body select, .modal-foot .primary');
    if (first) first.focus();
  }
  function closeModal() {
    $('#modal').hidden = true;
    if (App.lastFocus && App.lastFocus.focus) App.lastFocus.focus();
  }

  function askNew() {
    modal('Começar um modelo novo', '<p>O modelo atual será substituído. Se quiser guardá-lo, salve o JSON antes. Você também pode desfazer depois.</p>' +
      '<label class="opt"><input type="radio" name="nm" id="nm-ph" value="ph" checked> Com linhas de exemplo para preencher</label>' +
      '<label class="opt"><input type="radio" name="nm" id="nm-empty" value="empty"> Totalmente vazio</label>', [
      { label: 'Salvar JSON antes', onClick: function () { saveJSON(); return false; } },
      { label: 'Cancelar' },
      { label: 'Criar modelo', primary: true, onClick: function () {
        replaceState(Q.blank($('#nm-ph').checked));
        ['projeto', 'reqs', 'chars'].forEach(function (k) { const d = document.querySelector('details[data-pane="' + k + '"]'); if (d) d.open = true; });
        autosizeAll();
        const t = $('#f-title'); if (t) { t.focus(); t.select(); }
      } }
    ]);
  }
  function askExample() {
    modal('Carregar o exercício da garrafa térmica', '<p>O modelo atual será substituído pelo exemplo do exercício. Você pode desfazer depois.</p>', [
      { label: 'Cancelar' },
      { label: 'Carregar exemplo', primary: true, onClick: function () { replaceState(Q.example()); toast('Exemplo carregado.', 'Desfazer', undo); } }
    ]);
  }

  function askPrint() {
    const p = Q.loadPrintPrefs();
    const paper = Object.keys(Q.PAPERS).map(function (k) { return '<option value="' + k + '"' + (k === p.paper ? ' selected' : '') + '>' + esc(Q.PAPERS[k].label) + '</option>'; }).join('');
    const ck = function (id, key, label) { return '<label class="opt"><input type="checkbox" id="' + id + '"' + (p[key] ? ' checked' : '') + '> ' + label + '</label>'; };
    const framed = window.self !== window.top;
    modal('Gerar PDF',
      '<div class="form-grid">' +
      '<label class="fld" for="pp-paper"><span>Papel</span><select id="pp-paper">' + paper + '</select></label>' +
      '<label class="fld" for="pp-orient"><span>Página da matriz</span><select id="pp-orient"><option value="landscape"' + (p.orient === 'landscape' ? ' selected' : '') + '>Paisagem (recomendado)</option><option value="portrait"' + (p.orient === 'portrait' ? ' selected' : '') + '>Retrato</option></select></label>' +
      '<label class="fld" for="pp-margin"><span>Margens</span><select id="pp-margin"><option value="8"' + (p.margin == 8 ? ' selected' : '') + '>Estreitas · 8 mm</option><option value="10"' + (p.margin == 10 ? ' selected' : '') + '>Normais · 10 mm</option><option value="15"' + (p.margin == 15 ? ' selected' : '') + '>Largas · 15 mm</option></select></label>' +
      '</div><fieldset class="parts"><legend>O que incluir</legend>' +
      ck('pp-house', 'house', 'Casa da Qualidade (matriz completa)') +
      ck('pp-steps', 'steps', 'Etapas 1 a 7 (percentuais, relações, cálculos e telhado)') +
      ck('pp-bench', 'bench', 'Item 8 · benchmarking') +
      ck('pp-prio', 'prio', 'Item 9 · características prioritárias') +
      '</fieldset><p class="hint">Na janela de impressão, escolha <b>Salvar como PDF</b> e deixe a escala em 100% (padrão). As páginas de texto saem em retrato.</p>' +
      (framed ? '<p class="hint warn">Nesta pré-visualização incorporada a impressão pode estar bloqueada. Se nada abrir, use a página publicada no GitHub Pages ou abra o arquivo index.html no navegador.</p>' : ''),
      [
        { label: 'Cancelar' },
        { label: 'Gerar PDF', primary: true, onClick: function () {
          const o = {
            paper: $('#pp-paper').value, orient: $('#pp-orient').value, margin: +$('#pp-margin').value,
            house: $('#pp-house').checked, steps: $('#pp-steps').checked, bench: $('#pp-bench').checked, prio: $('#pp-prio').checked
          };
          if (!o.house && !o.steps && !o.bench && !o.prio) { toast('Escolha pelo menos uma parte para o PDF.'); return false; }
          Q.savePrintPrefs(o);
          Q.buildPrint(App.s, Q.calc(App.s), o);
          setTimeout(function () { try { window.print(); } catch (e) { toast('A impressão não está disponível aqui.'); } }, 80);
        } }
      ]);
  }

  /* ---------- aviso ---------- */
  let toastTimer = null;
  function toast(msg, actionLabel, action) {
    const t = $('#toast');
    t.innerHTML = '<span>' + esc(msg) + '</span>';
    if (actionLabel) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = actionLabel;
      b.addEventListener('click', function () { action(); t.classList.remove('on'); });
      t.appendChild(b);
    }
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 5000);
  }

  /* ---------- zoom ---------- */
  function setZoom(z) {
    App.zoom = z;
    $('#house').classList.toggle('fit', z === 'fit');
    $('#z-fit').setAttribute('aria-pressed', z === 'fit');
    $('#z-100').setAttribute('aria-pressed', z !== 'fit');
    try { localStorage.setItem(Q.STORAGE_KEY + ':zoom', z); } catch (e) { /* ignora */ }
  }

  /* ---------- início ---------- */
  function init() {
    App.s = Q.load();
    App.cur = JSON.stringify(App.s);
    let z = null;
    try { z = localStorage.getItem(Q.STORAGE_KEY + ':zoom'); } catch (e) { /* ignora */ }
    App.zoom = z || (window.innerWidth >= 900 ? 'fit' : '100');
    refresh(true);
    setZoom(App.zoom);
    updateUndo();

    const ed = $('#editor');
    ed.addEventListener('input', onEditorInput);
    ed.addEventListener('change', onEditorChange);
    ed.addEventListener('click', onEditorClick);
    ed.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.classList.contains('nm')) { e.preventDefault(); e.target.blur(); } });
    ed.addEventListener('toggle', function () { autosizeAll(); }, true);
    window.addEventListener('resize', function () { clearTimeout(App.rz); App.rz = setTimeout(autosizeAll, 150); });
    ed.addEventListener('toggle', function (e) { if (e.target.dataset && e.target.dataset.pane) App.open[e.target.dataset.pane] = e.target.open; }, true);

    const SEL = '[data-r],[data-imp],[data-ca],[data-br],[data-dir],[data-focus]';
    const house = $('#house');
    house.addEventListener('click', function (e) {
      const el = e.target.closest(SEL);
      if (el) onHouse(el, e.shiftKey || e.altKey, false);
    });
    house.addEventListener('contextmenu', function (e) {
      const el = e.target.closest('[data-r],[data-imp],[data-ca],[data-br],[data-dir]');
      if (el) { e.preventDefault(); onHouse(el, true, false); }
    });
    house.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = e.target.closest(SEL);
      if (el) { e.preventDefault(); onHouse(el, e.shiftKey, true); }
    });

    $('#btn-new').addEventListener('click', askNew);
    $('#btn-example').addEventListener('click', askExample);
    $('#btn-open').addEventListener('click', function () { $('#file-json').click(); });
    $('#file-json').addEventListener('change', function (e) { const f = e.target.files[0]; if (f) openJSON(f); e.target.value = ''; });
    $('#btn-save').addEventListener('click', saveJSON);
    $('#btn-svg').addEventListener('click', saveSVG);
    $('#btn-pdf').addEventListener('click', askPrint);
    $('#btn-undo').addEventListener('click', undo);
    $('#btn-redo').addEventListener('click', redo);
    $('#z-fit').addEventListener('click', function () { setZoom('fit'); });
    $('#z-100').addEventListener('click', function () { setZoom('100'); });
    $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal') closeModal(); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('#modal').hidden) { closeModal(); return; }
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '');
      if (e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); }
      else if (e.key.toLowerCase() === 'p') { e.preventDefault(); askPrint(); }
      else if (e.key.toLowerCase() === 's') { e.preventDefault(); saveJSON(); }
    });

    /* Arrastar um .json para a página também abre o modelo */
    document.addEventListener('dragover', function (e) { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') >= 0) e.preventDefault(); });
    document.addEventListener('drop', function (e) {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && /json/i.test(f.type + f.name)) { e.preventDefault(); openJSON(f); }
    });
  }

  Q.App = App;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.QFD);
