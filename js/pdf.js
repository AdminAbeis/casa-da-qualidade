/* Casa da Qualidade (QFD) — montagem das páginas e geração do PDF
   As páginas são montadas no próprio navegador, com tamanho e orientação exatos.
   "Baixar PDF" fotografa cada página (html2canvas) e monta o arquivo com jsPDF, então
   a casa sai em paisagem e o texto em retrato em qualquer navegador. */
(function (Q) {
  'use strict';
  const esc = Q.esc;

  Q.LIBS = Q.LIBS || { jspdf: 'vendor/jspdf.umd.min.js', html2canvas: 'vendor/html2canvas.min.js' };

  Q.PDF_DEFAULTS = {
    mode: 'full',
    paper: 'A4', orient: 'landscape', margin: 10,
    full: { statement: false, house: true, steps: true, bench: true, prio: true },
    blank: { statement: true, house: true, sheets: true, given: false }
  };

  Q.loadPdfPrefs = function () {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(Q.STORAGE_KEY + ':pdf') || '{}') || {}; } catch (e) { /* ignora */ }
    const d = Q.PDF_DEFAULTS;
    return {
      mode: raw.mode === 'blank' ? 'blank' : 'full',
      paper: Q.PAPERS[raw.paper] ? raw.paper : d.paper,
      orient: raw.orient === 'portrait' ? 'portrait' : 'landscape',
      margin: [8, 10, 15].indexOf(+raw.margin) >= 0 ? +raw.margin : d.margin,
      full: Object.assign({}, d.full, raw.full || {}),
      blank: Object.assign({}, d.blank, raw.blank || {})
    };
  };
  Q.savePdfPrefs = function (o) {
    try { localStorage.setItem(Q.STORAGE_KEY + ':pdf', JSON.stringify(o)); } catch (e) { /* ignora */ }
  };

  function loadScript(src) {
    return new Promise(function (ok, fail) {
      const el = document.createElement('script');
      el.src = src; el.async = true;
      el.onload = ok;
      el.onerror = function () { fail(new Error('Não foi possível carregar ' + src)); };
      document.head.appendChild(el);
    });
  }
  Q.loadLibs = function () {
    const jobs = [];
    if (!(window.jspdf && window.jspdf.jsPDF)) jobs.push(loadScript(Q.LIBS.jspdf));
    if (!window.html2canvas) jobs.push(loadScript(Q.LIBS.html2canvas));
    return Promise.all(jobs);
  };

  function today() {
    const d = new Date();
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  function slug(t) {
    return (String(t || 'qfd').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'qfd');
  }
  Q.slug = slug;

  /* ---------- páginas ---------- */
  function Paginator(root, s, o) {
    this.root = root; this.s = s; this.o = o; this.pages = []; this.cur = null; this.sub = '';
  }
  Paginator.prototype.page = function (orient, sub) {
    const P = Q.PAPERS[this.o.paper] || Q.PAPERS.A4;
    const land = orient === 'landscape';
    const w = land ? P.h : P.w, h = land ? P.w : P.h, m = this.o.margin;
    const s = this.s, blank = this.o.mode === 'blank';
    const el = document.createElement('div');
    el.className = 'pg ' + (land ? 'landscape' : 'portrait');
    el.style.width = w + 'mm'; el.style.height = h + 'mm'; el.style.padding = m + 'mm';
    const title = blank ? (s.statement.title || s.meta.title || 'Casa da Qualidade (QFD)') : 'Casa da Qualidade · ' + (s.meta.title || 'Sem título');
    const right = blank
      ? '<div class="ph-fields"><span>Nome</span><i></i><span>Turma</span><i class="sm"></i><span>Data</span><i class="sm"></i></div>'
      : '<div class="ph-meta">' + (s.meta.author ? esc(s.meta.author) + ' · ' : '') + today() + '</div>';
    el.innerHTML = '<header class="ph"><div class="ph-eyebrow">' + esc(s.meta.subtitle || 'Desdobramento da Função Qualidade (QFD)') + '</div>' +
      '<div class="ph-title">' + esc(title) + (sub ? '<span class="ph-sub"> · ' + esc(sub) + '</span>' : '') + '</div>' + right + '</header>' +
      '<div class="pb analysis"></div><footer class="pf"><span class="pf-l"></span><span class="pf-n"></span></footer>';
    this.root.appendChild(el);
    const pg = { el: el, body: el.querySelector('.pb'), orient: orient, w: w, h: h };
    this.pages.push(pg);
    this.cur = pg;
    return pg;
  };

  function fits(body) { return body.scrollHeight <= body.clientHeight + 1; }
  function hasContent(body) { return Array.prototype.some.call(body.children, function (e) { return !e.dataset.keep; }); }

  /* Divide um bloco em partes que cabem; devolve a parte que sobrou ou null */
  function itemsOf(block) {
    if (block.matches('.tbl')) return { list: block.querySelector('tbody'), inner: 'tbody', sel: 'tr', min: 2 };
    if (block.matches('ul, ol')) return { list: block, sel: 'li', min: 2 };
    if (block.matches('.notes')) {
      const kids = Array.prototype.filter.call(block.children, function (e) { return !e.matches('.notes-h'); });
      if (kids.length === 1 && kids[0].tagName === 'UL') return { list: kids[0], inner: 'ul', sel: 'li', min: 2 };
      return { list: block, sel: ':not(.notes-h)', min: 1 };
    }
    if (block.matches('.cards, .ws-cards')) return { list: block, sel: '.card', min: 1 };
    return null;
  }
  function front(info, el) {
    const ref = Array.prototype.find.call(info.list.children, function (e) { return e.matches(info.sel); });
    info.list.insertBefore(el, ref || null);
  }
  function splitInto(block, body) {
    const info = itemsOf(block);
    if (!info) return null;
    const items = Array.prototype.filter.call(info.list.children, function (e) { return e.matches(info.sel); });
    if (items.length < 2) return null;
    /* tabelas curtas não se dividem quando ainda podem ir inteiras para a próxima página */
    if (block.matches('.tbl') && items.length <= 10 && hasContent(body)) return null;
    const shell = block.cloneNode(true);
    const shellList = info.list === block ? shell : shell.querySelector(info.inner);
    Array.prototype.slice.call(shellList.children).forEach(function (e) { if (e.matches(info.sel)) e.remove(); });
    body.appendChild(shell);
    let n = 0;
    for (let i = 0; i < items.length; i++) {
      shellList.appendChild(items[i]);
      if (!fits(body)) { front(info, items[i]); break; }
      n++;
    }
    /* evita deixar um único item sozinho na página seguinte */
    if (items.length - n === 1 && n >= 3) { n--; front(info, shellList.lastElementChild); }
    const minHead = items.length >= 3 ? info.min : 1;
    if (n < minHead || n === items.length) {
      /* desfaz */
      const moved = Array.prototype.slice.call(shellList.children).filter(function (e) { return e.matches(info.sel); });
      moved.reverse().forEach(function (e) { front(info, e); });
      shell.remove();
      if (n === items.length) { body.appendChild(block); return { placed: true, tail: null }; }
      return null;
    }
    if (block.tagName === 'OL') block.start = (shell.start || 1) + n;
    block.classList.add('cont');
    if (block.matches('.notes')) { const h = block.querySelector('.notes-h'); if (h) h.textContent = 'Comentários (continuação)'; }
    return { placed: true, tail: block };
  }

  Paginator.prototype.place = function (block) {
    if (!this.cur) this.page('portrait', this.sub);
    const body = this.cur.body;
    body.appendChild(block);
    if (fits(body)) return;
    body.removeChild(block);
    const res = splitInto(block, body);
    if (res && res.placed) {
      if (res.tail) { this.page('portrait', this.sub); this.place(res.tail); }
      return;
    }
    if (!hasContent(body)) {
      body.appendChild(block); block.classList.add('oversize');
      this.cur = null;
      return;
    }
    const carry = [];
    while (body.lastElementChild && body.lastElementChild.dataset.keep) carry.unshift(body.removeChild(body.lastElementChild));
    const pg = this.page('portrait', this.sub);
    carry.forEach(function (e) { pg.body.appendChild(e); });
    this.place(block);
  };

  /* Achata as seções em blocos; títulos e legendas ficam presos ao bloco seguinte */
  function blocksOf(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const out = [];
    Array.prototype.forEach.call(tmp.querySelectorAll(':scope > section'), function (sec) {
      const kids = Array.prototype.slice.call(sec.children);
      kids.forEach(function (k, i) {
        if (k.tagName === 'H2' || k.tagName === 'H3') k.dataset.keep = '1';
        if (i === 1 && k.tagName === 'P' && kids[0].tagName === 'H2' && kids[2]) k.dataset.keep = '1';
        out.push(k);
      });
    });
    return out;
  }

  Paginator.prototype.flow = function (html, sub) {
    this.sub = sub;
    this.page('portrait', sub);
    const self = this;
    blocksOf(html).forEach(function (b) { self.place(b); });
    this.cur = null;
  };

  /* Desenha a casa como imagem nítida (≈300 dpi) usando as fontes embutidas */
  function rasterHouse(svg, wPx, hPx, scale) {
    return new Promise(function (ok, fail) {
      const img = new Image();
      img.onload = function () {
        try {
          const cv = document.createElement('canvas');
          cv.width = Math.round(wPx * scale); cv.height = Math.round(hPx * scale);
          const ctx = cv.getContext('2d');
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height);
          ctx.drawImage(img, 0, 0, cv.width, cv.height);
          ok(cv.toDataURL('image/png'));
        } catch (e) { fail(e); }
      };
      img.onerror = function () { fail(new Error('Falha ao desenhar a casa.')); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  Paginator.prototype.house = async function (raster) {
    const s = this.s, o = this.o, blank = o.mode === 'blank';
    const c = Q.calc(s);
    const pg = this.page(o.orient, blank ? 'Casa da Qualidade para preencher' : '');
    const body = pg.body;
    body.classList.add('house-page');
    const probe = Q.renderHouse(s, c, { blank: blank, given: blank && o.blank.given });
    const note = document.createElement('p');
    note.className = 'pf-note';
    note.textContent = blank
      ? 'Relacionamentos: ◎ forte = ' + Q.fmt(s.scale.s) + ' · ○ média = ' + Q.fmt(s.scale.m) + ' · △ fraca = ' + Q.fmt(s.scale.w) + ' · Telhado: ++ + − −− · Sentido de melhoria: ▲ maximizar ▼ minimizar'
      : 'Escala: forte = ' + Q.fmt(s.scale.s) + ' · média = ' + Q.fmt(s.scale.m) + ' · fraca = ' + Q.fmt(s.scale.w) + ' · Prioridades destacadas: ' + s.settings.topN;
    const box = document.createElement('div');
    box.className = 'p-house';
    body.appendChild(box);
    body.appendChild(note);
    const availW = box.clientWidth, availH = body.clientHeight - note.offsetHeight - 6;
    const k = Math.min(availW / probe.width, availH / probe.height);
    const wPx = probe.width * k, hPx = probe.height * k;
    const opts = { standalone: true, embedFonts: true, blank: blank, given: blank && o.blank.given };
    if (raster) {
      const svg = Q.renderHouse(s, c, Object.assign({ cssW: probe.width * 3.2 * k, cssH: probe.height * 3.2 * k }, opts)).svg;
      const url = await rasterHouse(svg, wPx, hPx, 3.2);
      const img = new Image();
      img.src = url; img.alt = 'Casa da Qualidade';
      img.style.width = wPx + 'px'; img.style.height = hPx + 'px';
      box.appendChild(img);
      if (img.decode) { try { await img.decode(); } catch (e) { /* segue */ } }
    } else {
      box.innerHTML = Q.renderHouse(s, c, Object.assign({ cssW: wPx + 'px', cssH: hPx + 'px' }, opts)).svg;
    }
    this.cur = null;
  };

  /* Monta todas as páginas no palco. raster = true para o PDF baixado */
  Q.composePages = async function (s, o, raster) {
    const root = document.getElementById('pdf-stage');
    root.innerHTML = '';
    const pg = new Paginator(root, s, o);
    const c = Q.calc(s);
    const blank = o.mode === 'blank';
    const parts = blank ? o.blank : o.full;

    if (parts.statement && Q.hasStatement(s)) pg.flow(Q.secEnunciado(s, true), 'Enunciado');
    if (parts.house) await pg.house(raster);
    if (blank) {
      if (parts.sheets) pg.flow(Q.renderWorksheet(s), 'Folha de respostas');
    } else {
      const which = [];
      if (parts.steps) which.push('steps');
      if (parts.bench) which.push('bench');
      if (parts.prio) which.push('prio');
      if (which.length) pg.flow(Q.renderAnalysis(s, c, which), 'Etapas e análise');
    }
    const pages = pg.pages.filter(function (p) {
      if (p.body.children.length) return true;
      p.el.remove(); return false;
    });
    const label = blank ? 'Exercício para preencher' : 'Resolução';
    pages.forEach(function (p, i) {
      p.el.querySelector('.pf-l').textContent = 'Casa da Qualidade (QFD) · ' + label;
      p.el.querySelector('.pf-n').textContent = 'Página ' + (i + 1) + ' de ' + pages.length;
    });
    return pages;
  };

  Q.pdfFileName = function (s, o) {
    return (o.mode === 'blank' ? 'exercicio-qfd-' : 'casa-da-qualidade-') + slug(s.meta.title) + (o.paper !== 'A4' ? '-' + o.paper.toLowerCase() : '') + '.pdf';
  };

  /* Gera o arquivo PDF e devolve um Blob */
  Q.buildPdf = async function (s, o, onProgress) {
    await Q.loadLibs();
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* segue */ } }
    const stage = document.getElementById('pdf-stage');
    stage.classList.add('on');
    const sx = window.scrollX, sy = window.scrollY;
    window.scrollTo(0, 0);
    try {
      const pages = await Q.composePages(s, o, true);
      if (!pages.length) throw new Error('Nenhuma parte foi escolhida para o PDF.');
      const jsPDF = window.jspdf.jsPDF;
      let doc = null;
      for (let i = 0; i < pages.length; i++) {
        if (onProgress) onProgress(i + 1, pages.length);
        const p = pages[i];
        const canvas = await window.html2canvas(p.el, {
          scale: 2.2, backgroundColor: '#ffffff', logging: false, useCORS: true,
          scrollX: 0, scrollY: 0, windowWidth: Math.max(document.documentElement.clientWidth, p.el.offsetWidth + 40),
          onclone: function (d) { const st = d.getElementById('pdf-stage'); if (st) st.style.opacity = '1'; }
        });
        const fmt = [Math.min(p.w, p.h), Math.max(p.w, p.h)];
        if (!doc) doc = new jsPDF({ orientation: p.orient, unit: 'mm', format: fmt, compress: true });
        else doc.addPage(fmt, p.orient);
        doc.addImage(canvas.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, p.w, p.h, undefined, 'FAST');
      }
      doc.setProperties({
        title: (o.mode === 'blank' ? 'Exercício · ' : 'Casa da Qualidade · ') + (s.meta.title || ''),
        subject: 'Casa da Qualidade (QFD)', author: s.meta.author || '', creator: 'Casa da Qualidade (QFD)'
      });
      return doc.output('blob');
    } finally {
      stage.innerHTML = '';
      stage.classList.remove('on');
      window.scrollTo(sx, sy);
    }
  };

  /* Impressão pelo navegador: mesmas páginas, com @page por orientação */
  Q.printPages = async function (s, o) {
    const stage = document.getElementById('pdf-stage');
    stage.classList.add('on');
    let pages;
    try { pages = await Q.composePages(s, o, false); }
    finally { stage.classList.remove('on'); }
    const root = document.getElementById('print-root');
    root.innerHTML = '';
    pages.forEach(function (p) { root.appendChild(p.el); });
    stage.innerHTML = '';
    const P = Q.PAPERS[o.paper] || Q.PAPERS.A4;
    document.getElementById('page-style').textContent =
      '@page { size: ' + P.w + 'mm ' + P.h + 'mm; margin: 0; }' +
      '@page port { size: ' + P.w + 'mm ' + P.h + 'mm; margin: 0; }' +
      '@page land { size: ' + P.h + 'mm ' + P.w + 'mm; margin: 0; }';
    return pages.length;
  };
})(window.QFD);
