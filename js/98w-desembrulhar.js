/* Laboratório — 98w-desembrulhar.js: 📦 DESEMBRULHAR — tira de volta os códigos HTML que um "montador"
   guardou DENTRO de um HTML só (cada um virava uma aba). Serve para recuperar ferramentas que você só tem
   nesse formato juntado (o original separado se perdeu).
   Procura em todo lugar onde um montador costuma esconder:
   - <iframe srcdoc="…">  ·  <template>  ·  <script type="text/html|text/plain|text/template">
   - textos dentro do JavaScript ('…', "…", `…`, listas tipo [{nome:'Calc', html:'<!doctype…'}])
   - base64 (data:text/html;base64,… ou texto base64 solto) · JSON (<script type="application/json">)
   E faz isso de novo DENTRO do que achou (embrulho dentro de embrulho, até 4 níveis).
   Cada código achado: 👁 ver · ⬇ baixar · todos num .zip · ➕ abrir como projeto (para o ✂️ Fatiador/🔪 Desmontar). */
(function (LB) {
  'use strict';
  const { $, esc } = LB;
  let achados = [], origemNome = '';

  const ehHTML = (s) => typeof s === 'string' && s.length > 150 && /<(!doctype html|html[\s>]|body[\s>]|head[\s>])/i.test(s) && /<\/(html|body)>|<script|<style|<div/i.test(s);
  const pareceB64 = (s) => typeof s === 'string' && s.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(s);
  function deB64(s) { try { const bin = atob(s.replace(/\s+/g, '')); const u8 = Uint8Array.from(bin, (c) => c.charCodeAt(0)); return new TextDecoder('utf-8').decode(u8); } catch (e) { return null; } }
  const tituloDe = (h) => { const m = /<title[^>]*>([^<]{1,80})<\/title>/i.exec(h) || /<h1[^>]*>([\s\S]{1,120}?)<\/h1>/i.exec(h); return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : ''; };
  const CHAVES_NOME = ['nome', 'name', 'titulo', 'title', 'label', 'rotulo', 'id', 'arquivo', 'file'];

  function procurarNoJS(js, add, nivel) {
    const op = (t) => ({ ecmaVersion: 'latest', sourceType: t, allowHashBang: true, allowReturnOutsideFunction: true });
    let ast = null; try { ast = window.acorn.parse(js, op('script')); } catch (e) { try { ast = window.acorn.parse(js, op('module')); } catch (e2) { ast = null; } }
    if (!ast) { // JS quebrado: tenta pelo menos os data: base64
      (js.match(/data:text\/html;(?:charset=[\w-]+;)?base64,[A-Za-z0-9+/=]+/g) || []).forEach((u) => { const h = deB64(u.split(',')[1]); if (ehHTML(h)) add(h, 'base64', nivel); });
      return;
    }
    (function andar(n, pai, avo) {
      if (!n || typeof n.type !== 'string') return;
      let valor = null;
      if (n.type === 'Literal' && typeof n.value === 'string') valor = n.value;
      else if (n.type === 'TemplateLiteral' && n.expressions.length === 0) valor = n.quasis.map((q) => q.value.cooked).join('');
      else if (n.type === 'TemplateLiteral' && n.quasis.map((q) => q.value.cooked || '').join('').length > 400) valor = n.quasis.map((q, i) => (q.value.cooked || '') + (i < n.expressions.length ? '${…}' : '')).join('');
      if (valor) {
        let nome = '';
        if (pai && pai.type === 'Property' && avo && avo.type === 'ObjectExpression') {
          for (const pr of avo.properties) { const k = pr.key && (pr.key.name || pr.key.value); if (CHAVES_NOME.includes(String(k).toLowerCase()) && pr.value && pr.value.type === 'Literal' && typeof pr.value.value === 'string' && pr.value.value.length < 90) { nome = pr.value.value; break; } }
        }
        let h = null, como = 'texto no JavaScript';
        if (ehHTML(valor)) h = valor;
        else if (/^data:text\/html/i.test(valor)) { const b = valor.split(',')[1] || ''; h = /;base64,/i.test(valor) ? deB64(b) : decodeURIComponent(b); como = 'data:'; }
        else if (pareceB64(valor)) { const d = deB64(valor); if (ehHTML(d)) { h = d; como = 'base64'; } }
        if (ehHTML(h)) add(h, como, nivel, nome);
      }
      for (const k of Object.keys(n)) {
        if (k === 'start' || k === 'end' || k === 'loc') continue;
        const v = n[k];
        if (Array.isArray(v)) v.forEach((x) => andar(x, n, pai)); else if (v && typeof v.type === 'string') andar(v, n, pai);
      }
    })(ast, null, null);
  }

  function procurar(html, nivel, add) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('iframe[srcdoc]').forEach((f) => { const h = f.getAttribute('srcdoc'); if (ehHTML(h)) add(h, 'iframe srcdoc', nivel, f.getAttribute('title') || f.getAttribute('name') || f.id); });
    doc.querySelectorAll('iframe[src^="data:text/html"]').forEach((f) => { const u = f.getAttribute('src'); const b = u.split(',')[1] || ''; const h = /;base64,/i.test(u) ? deB64(b) : decodeURIComponent(b); if (ehHTML(h)) add(h, 'iframe data:', nivel, f.getAttribute('title')); });
    // <template>: o navegador joga fora o <html>/<head>/<body> de dentro — então leio o texto cru
    { const re = /<template\b([^>]*)>([\s\S]*?)<\/template>/gi; let m; while ((m = re.exec(html))) { const h = m[2]; const id = (/\bid=["']?([\w-]+)/i.exec(m[1]) || [])[1]; if (ehHTML(h)) add(h, '<template>', nivel, id); } }
    doc.querySelectorAll('textarea').forEach((t) => { const h = t.value || t.textContent; if (ehHTML(h)) add(h, '<textarea>', nivel, t.id || t.name); });
    doc.querySelectorAll('script').forEach((s) => {
      const tipo = (s.getAttribute('type') || '').toLowerCase(), t = s.textContent || '';
      if (/text\/(html|plain|template|x-template)/.test(tipo)) { if (ehHTML(t)) add(t, '<script type=' + tipo + '>', nivel, s.id || s.getAttribute('data-nome')); else if (pareceB64(t.trim())) { const d = deB64(t.trim()); if (ehHTML(d)) add(d, 'base64 em <script>', nivel, s.id); } return; }
      if (/json/.test(tipo)) { try { const j = JSON.parse(t); (function rec(o, nome) { if (typeof o === 'string') { if (ehHTML(o)) add(o, 'JSON', nivel, nome); return; } if (o && typeof o === 'object') { const n = (Array.isArray(o) ? '' : CHAVES_NOME.map((k) => o[k]).find((v) => typeof v === 'string' && v.length < 90)) || nome; Object.values(o).forEach((v) => rec(v, n)); } })(j, ''); } catch (e) {} return; }
      if (!tipo || /javascript|module|babel/.test(tipo)) if (t.length > 150) procurarNoJS(t, add, nivel);
    });
  }

  function desembrulhar(html) {
    const lista = [], vistos = new Set();
    const add = (h, como, nivel, nome) => {
      const chave = h.length + ':' + h.slice(0, 200) + h.slice(-200);
      if (vistos.has(chave) || h === html) return;
      vistos.add(chave);
      const item = { nome: ((nome && String(nome).trim().length >= 3 ? nome : '') || tituloDe(h) || nome || 'codigo-' + (lista.length + 1)).trim(), como, nivel, html: h };
      lista.push(item);
      if (nivel < 4) procurar(h, nivel + 1, add); // embrulho dentro de embrulho
    };
    procurar(html, 1, add);
    // nomes de arquivo únicos
    const usados = {};
    lista.forEach((x) => { let b = x.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'codigo'; let n = b, i = 2; while (usados[n]) n = b + '-' + i++; usados[n] = 1; x.arquivo = n + '.html'; });
    return lista;
  }

  function tela() {
    const el = $('#panel-desembrulhar'); if (!el) return;
    if (el.dataset.ok) return; el.dataset.ok = '1';
    el.innerHTML = '<div class="card"><h2>📦 Desembrulhar</h2><p class="muted">Tem um HTML que <b>junta vários códigos</b> (cada um virava uma aba) e você perdeu os originais separados? Escolha ele aqui: eu acho cada código escondido lá dentro e devolvo <b>separado</b>, do jeito que era. Depois dá para mandar para o ✂️ Fatiador ou o 🔪 Desmontar.</p>' +
      '<div class="linha" style="flex-wrap:wrap"><label class="btn p">📂 Escolher o HTML juntado<input type="file" id="db-f" accept=".html,.htm,.txt,.js,text/html" multiple hidden></label><button class="btn s" data-db="projeto-atual">Usar um .html do projeto escolhido</button></div></div><div id="db-saida"></div>';
    $('#db-f').onchange = async (e) => { const fs = [...e.target.files]; e.target.value = ''; for (const f of fs) rodar(await f.text(), f.name); };
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-db]'); if (!b) return;
      const a = b.dataset.db;
      if (a === 'projeto-atual') {
        const p = LB.projeto(LB.atual); if (!p) return LB.aviso('Escolha um projeto lá em cima.', 'erro');
        const hs = Object.keys(p.arquivos).filter((k) => /\.html?$/i.test(k) && p.arquivos[k].t != null);
        if (!hs.length) return LB.aviso('Esse projeto não tem .html.', 'erro');
        const k = hs.length === 1 ? hs[0] : await LB.pedir('Qual arquivo? (' + hs.slice(0, 15).join(', ') + ')', hs.sort((x, y) => p.arquivos[y].t.length - p.arquivos[x].t.length)[0]);
        if (k && p.arquivos[k]) rodar(p.arquivos[k].t, k.split('/').pop());
      }
      const x = achados[+b.dataset.i];
      if (a === 'ver' && x) LB.modal('<h2>' + esc(x.nome) + '</h2><p class="muted">achado em: ' + esc(x.como) + ' · nível ' + x.nivel + ' · ' + Math.round(x.html.length / 1024) + ' KB</p><iframe sandbox="allow-scripts allow-forms allow-modals" style="width:100%;height:60vh;border:1px solid #2b3a5c;border-radius:8px;background:#fff"></iframe><div class="linha" style="justify-content:flex-end"><button class="btn" data-x="0">Fechar</button></div>', () => {}, (w) => { w.querySelector('iframe').srcdoc = x.html; });
      if (a === 'baixar' && x) LB.baixar(x.arquivo, x.html, 'text/html');
      if (a === 'zip') { if (!window.JSZip) return LB.aviso('Sem o JSZip.', 'erro'); const z = new JSZip(); achados.forEach((y) => z.file(y.arquivo, y.html)); LB.baixar(origemNome.replace(/\.html?$/i, '') + '-desembrulhado.zip', await z.generateAsync({ type: 'blob', compression: 'DEFLATE' }), 'application/zip'); }
      if (a === 'projeto') {
        const arquivos = {}; achados.forEach((y) => { arquivos[y.arquivo] = { t: y.html }; });
        arquivos['LEIA-DESEMBRULHADO.md'] = { t: '# 📦 Desembrulhado de ' + origemNome + '\n\n' + achados.map((y) => '- **' + y.arquivo + '** — ' + y.nome + ' (achado em: ' + y.como + ', nível ' + y.nivel + ', ' + Math.round(y.html.length / 1024) + ' KB)').join('\n') + '\n' };
        const p = { id: LB.novoId(), nome: '📦 ' + origemNome.replace(/\.html?$/i, '') + ' (separados)', criado: Date.now(), origem: 'desembrulhar', arquivos };
        await LB.banco.salvar(p); await LB.carregarProjetos(); LB.escolher(p.id);
        LB.aviso('✅ ' + achados.length + ' códigos separados no projeto "' + p.nome + '". Agora dá para usar o ✂️ Fatiador, o 🔪 Desmontar ou o 🧩 Grupos.', 'ok');
      }
    });
  }
  function rodar(html, nome) {
    origemNome = nome; const s = $('#db-saida');
    s.innerHTML = '<div class="card"><p class="muted">⏳ Procurando códigos dentro de ' + esc(nome) + '…</p></div>';
    setTimeout(() => {
      try { achados = desembrulhar(html); } catch (er) { s.innerHTML = '<div class="card"><p style="color:#ef4444">⚠ ' + esc(er.message) + '</p></div>'; return; }
      if (!achados.length) { s.innerHTML = '<div class="card"><p>🤔 Não achei código HTML escondido dentro de <b>' + esc(nome) + '</b>. Pode ser que ele <b>não</b> seja um juntado, ou que guarde os códigos de um jeito que eu ainda não conheço — me mande esse arquivo que eu ensino.</p></div>'; return; }
      s.innerHTML = '<div class="card"><h3>✅ Achei ' + achados.length + ' código(s) dentro de ' + esc(nome) + '</h3><div class="linha" style="flex-wrap:wrap"><button class="btn p" data-db="projeto">➕ Abrir todos como projeto</button><button class="btn" data-db="zip">⬇ Baixar todos (.zip)</button></div>' +
        achados.map((x, i) => '<div class="linha" style="border-bottom:1px solid var(--li);padding:5px 0;flex-wrap:wrap"><div style="flex:1;min-width:0"><b>' + esc(x.nome) + '</b><br><small class="muted">' + esc(x.arquivo) + ' · ' + Math.round(x.html.length / 1024) + ' KB · achado em: ' + esc(x.como) + (x.nivel > 1 ? ' · dentro de outro (nível ' + x.nivel + ')' : '') + '</small></div><button class="btn s" data-db="ver" data-i="' + i + '">👁 ver</button><button class="btn s" data-db="baixar" data-i="' + i + '">⬇</button></div>').join('') + '</div>';
    }, 30);
  }
  window.addEventListener('lab-aba', (e) => { if (e.detail === 'desembrulhar') tela(); });
  LB.desembrulhar = { desembrulhar, tela, rodar, _achados: () => achados };
})(window.LB);
