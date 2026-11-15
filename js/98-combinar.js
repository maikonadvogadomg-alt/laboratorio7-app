/* Laboratório — 98-combinar.js: 🧬 COMBINAR — pegar pedaços de códigos diferentes e montar um código novo.
   1) Ele lê TODOS os seus projetos do Laboratório (inclusive o que o 🔪 Desmontar e o ✂️ Fatiador separaram)
      e lista cada pedaço: funções, variáveis, classes — com o que cada um faz, o que ele USA e de quais
      elementos da tela (ids) ele precisa.
   2) Você marca os pedaços (de projetos diferentes, se quiser).
   3) Ele traz SOZINHO o que esses pedaços precisam (as funções que eles chamam), avisa o que está faltando,
      e monta um projeto novo: index.html (com os elementos da tela e os estilos) + pecas.js + FICHA.md.
   4) 🤖 "Pedir ajuda à IA" manda a FICHA completa (o que cada pedaço faz, de onde veio, o que falta) —
      assim a IA não fica com "informações precárias". */
(function (LB) {
  'use strict';
  const { $, esc } = LB;
  let pecas = [], escolhidas = new Set(), montado = false, filtro = '';

  // ---------- ler os pedaços ----------
  function parse(code) {
    const op = (t) => ({ ecmaVersion: 'latest', sourceType: t, allowHashBang: true, allowReturnOutsideFunction: t === 'script' });
    try { return window.acorn.parse(code, op('script')); } catch (e) { try { return window.acorn.parse(code, op('module')); } catch (e2) { return null; } }
  }
  function nomesDoPadrao(p, out) {
    if (!p) return;
    if (p.type === 'Identifier') out.add(p.name);
    else if (p.type === 'ObjectPattern') p.properties.forEach((x) => nomesDoPadrao(x.type === 'RestElement' ? x.argument : x.value, out));
    else if (p.type === 'ArrayPattern') p.elements.forEach((x) => nomesDoPadrao(x, out));
    else if (p.type === 'RestElement') nomesDoPadrao(p.argument, out);
    else if (p.type === 'AssignmentPattern') nomesDoPadrao(p.left, out);
  }
  // o que um pedaço USA (nomes de fora) e o que ele declara por dentro
  function usos(node) {
    const usados = new Set(), dentro = new Set();
    (function andar(n, pai, chave) {
      if (!n || typeof n.type !== 'string') return;
      if (n.type === 'Identifier') {
        const ehProp = pai && ((pai.type === 'MemberExpression' && chave === 'property' && !pai.computed) || ((pai.type === 'Property' || pai.type === 'MethodDefinition' || pai.type === 'PropertyDefinition') && chave === 'key' && !pai.computed && !pai.shorthand) || /^(LabeledStatement|BreakStatement|ContinueStatement)$/.test(pai.type));
        if (!ehProp) usados.add(n.name);
        return;
      }
      if (n.type === 'VariableDeclarator') nomesDoPadrao(n.id, dentro);
      if (/Function/.test(n.type)) { if (n.id && n !== node) dentro.add(n.id.name); n.params.forEach((p) => nomesDoPadrao(p, dentro)); }
      if (n.type === 'ClassDeclaration' && n.id && n !== node) dentro.add(n.id.name);
      if (n.type === 'CatchClause') nomesDoPadrao(n.param, dentro);
      for (const k of Object.keys(n)) {
        if (k === 'loc' || k === 'start' || k === 'end') continue;
        const v = n[k];
        if (Array.isArray(v)) v.forEach((x) => andar(x, n, k)); else if (v && typeof v.type === 'string') andar(v, n, k);
      }
    })(node, null, null);
    dentro.forEach((d) => usados.delete(d));
    return usados;
  }
  const PISTAS = [[/fetch\(|XMLHttpRequest/, 'busca na internet/servidor'], [/localStorage|indexedDB/, 'guarda dados no aparelho'], [/speechSynthesis|SpeechRecognition/, 'voz / microfone'], [/addEventListener\(['"]click|\.onclick/, 'responde a cliques'], [/innerHTML|createElement|appendChild/, 'desenha na tela'], [/FileReader|showOpenFilePicker|type=.?file/, 'abre arquivos'], [/Blob\(|download/, 'baixa/gera arquivos'], [/JSZip/, 'mexe com .zip'], [/pdf/i, 'mexe com PDF'], [/canvas|getContext\(/, 'desenha (canvas)'], [/Date\(|toLocaleDate/, 'mexe com datas'], [/\.toFixed\(|Math\./, 'faz contas'], [/RegExp|\.replace\(|\.match\(/, 'mexe com texto']];
  const explicar = (c) => PISTAS.filter(([r]) => r.test(c)).map(([, t]) => t).slice(0, 3).join(' · ') || 'parte da lógica';
  function idsUsados(c) {
    const s = new Set(); let m;
    const r = /getElementById\(\s*['"]([\w-]+)['"]|querySelector(?:All)?\(\s*['"]#([\w-]+)|\$\(\s*['"]#([\w-]+)/g;
    while ((m = r.exec(c))) s.add(m[1] || m[2] || m[3]);
    return s;
  }
  function scriptsDe(texto, nome) {
    if (!/\.html?$/i.test(nome)) return [texto];
    const out = []; const r = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi; let m;
    while ((m = r.exec(texto))) if (!/\bsrc=/i.test(m[1]) && !/type=["']?(text\/(template|plain|x-)|application\/json)/i.test(m[1]) && m[2].trim()) out.push(m[2]);
    return out;
  }
  function lerTudo() {
    const lista = [];
    for (const p of LB.projetos || []) {
      for (const [arq, v] of Object.entries(p.arquivos || {})) {
        if (!v || v.t == null || !/\.(m?js|html?)$/i.test(arq) || /(^|\/)(lib|node_modules|vendor)\//i.test(arq) || /\.min\.js$/i.test(arq) || v.t.length > 3e6) continue;
        scriptsDe(v.t, arq).forEach((js, si) => {
          if (js.length > 15000 && js.length / Math.max(1, js.split('\n').length) > 300) return; // biblioteca espremida
          const ast = parse(js); if (!ast) return;
          ast.body.forEach((st, i) => {
            const nomes = new Set(); let tipo = 'comando';
            if (st.type === 'FunctionDeclaration' && st.id) { nomes.add(st.id.name); tipo = 'função'; }
            else if (st.type === 'ClassDeclaration' && st.id) { nomes.add(st.id.name); tipo = 'classe'; }
            else if (st.type === 'VariableDeclaration') { st.declarations.forEach((d) => nomesDoPadrao(d.id, nomes)); tipo = st.declarations.some((d) => d.init && /Function/.test(d.init.type)) ? 'função' : (st.kind === 'const' ? 'constante' : 'variável'); }
            else if (/^Export/.test(st.type) && st.declaration) { const d = st.declaration; if (d.id) nomes.add(d.id.name); else if (d.declarations) d.declarations.forEach((x) => nomesDoPadrao(x.id, nomes)); tipo = 'exportado'; }
            else if (st.type === 'ImportDeclaration') return;
            let ini = st.start; const antes = js.slice(0, ini); const com = /(\/\*[\s\S]*?\*\/\s*|(?:\/\/[^\n]*\n\s*)+)$/.exec(antes); if (com) ini -= com[0].length;
            const codigo = js.slice(ini, st.end);
            const nome = [...nomes].join(', ') || (codigo.split('\n')[0].trim().slice(0, 50) + '…');
            lista.push({ k: p.id + '|' + arq + '|' + si + '|' + i, proj: p.id, projNome: p.nome, arq, ordem: si * 1e6 + i, nome, nomes: [...nomes], tipo, codigo, linhas: codigo.split('\n').length, usa: [...usos(st)].filter((n) => !nomes.has(n)), ids: [...idsUsados(codigo)], faz: explicar(codigo) });
          });
        });
      }
    }
    return lista;
  }

  // ---------- montar ----------
  const NAVEGADOR = (n) => n in window || /^(undefined|NaN|Infinity|arguments|require|module|exports|process|globalThis)$/.test(n);
  function resolver() {
    const sel = pecas.filter((x) => escolhidas.has(x.k));
    const trazidas = [], vistos = new Set(sel.map((x) => x.k));
    const fila = sel.slice();
    while (fila.length) {
      const x = fila.shift();
      for (const n of x.usa) {
        if (sel.concat(trazidas).some((y) => y.nomes.includes(n))) continue;
        const dep = pecas.find((y) => y.proj === x.proj && y.arq === x.arq && y.nomes.includes(n)) || pecas.find((y) => y.proj === x.proj && y.nomes.includes(n));
        if (dep && !vistos.has(dep.k)) { vistos.add(dep.k); trazidas.push(dep); fila.push(dep); }
      }
    }
    const todas = sel.concat(trazidas);
    const decl = new Set(todas.flatMap((x) => x.nomes));
    const faltam = [...new Set(todas.flatMap((x) => x.usa))].filter((n) => !decl.has(n) && !NAVEGADOR(n)).sort();
    const dobrados = {}; todas.forEach((x) => x.nomes.forEach((n) => { (dobrados[n] = dobrados[n] || new Set()).add(x.projNome + ' › ' + x.arq); }));
    const conflitos = Object.entries(dobrados).filter(([, s]) => s.size > 1).map(([n, s]) => n + ' (' + [...s].join(' e ') + ')');
    return { sel, trazidas, todas, faltam, conflitos, ids: [...new Set(todas.flatMap((x) => x.ids))] };
  }
  function fichaMD(r, nomeNovo) {
    const linha = (x, extra) => '- **' + x.nome + '** (' + x.tipo + ', ' + x.linhas + ' linhas) — de *' + x.projNome + ' › ' + x.arq + '*' + extra + '\n  - o que parece fazer: ' + x.faz + (x.ids.length ? '\n  - precisa destes elementos na tela: #' + x.ids.join(', #') : '') + (x.usa.length ? '\n  - usa: ' + x.usa.slice(0, 25).join(', ') : '');
    return '# 🧬 Ficha do código combinado' + (nomeNovo ? ' "' + nomeNovo + '"' : '') + '\n\n' +
      '## Pedaços que eu escolhi (' + r.sel.length + ')\n' + r.sel.map((x) => linha(x, '')).join('\n') + '\n\n' +
      (r.trazidas.length ? '## Trazidos sozinhos porque os de cima precisam (' + r.trazidas.length + ')\n' + r.trazidas.map((x) => linha(x, '')).join('\n') + '\n\n' : '') +
      '## ⚠ O que está faltando\n' + (r.faltam.length ? r.faltam.map((n) => '- `' + n + '` é usado mas não existe em nenhum pedaço escolhido (pode vir de uma biblioteca, de outro arquivo, ou ter outro nome)').join('\n') : '- nada: tudo que os pedaços usam está aqui ✅') + '\n\n' +
      (r.conflitos.length ? '## ⚠ Nomes repetidos (vêm de dois lugares)\n' + r.conflitos.map((c) => '- ' + c).join('\n') + '\n\n' : '') +
      '## Elementos da tela que o código procura\n' + (r.ids.length ? r.ids.map((i) => '- #' + i).join('\n') : '- nenhum') + '\n';
  }
  function htmlDosProjetos(r) {
    const projs = [...new Set(r.todas.map((x) => x.proj))].map((id) => LB.projeto(id)).filter(Boolean);
    const estilos = [], elementos = [], pegos = new Set();
    for (const p of projs) {
      for (const [arq, v] of Object.entries(p.arquivos)) {
        if (!v || v.t == null) continue;
        if (/\.css$/i.test(arq)) estilos.push('/* ===== de ' + p.nome + ' › ' + arq + ' ===== */\n' + v.t);
        if (/\.html?$/i.test(arq)) {
          const doc = new DOMParser().parseFromString(v.t, 'text/html');
          doc.querySelectorAll('style').forEach((s) => estilos.push('/* ===== de ' + p.nome + ' › ' + arq + ' ===== */\n' + s.textContent));
          for (const id of r.ids) {
            if (pegos.has(id)) continue;
            const el = doc.getElementById(id); if (!el) continue;
            let topo = el; while (topo.parentElement && topo.parentElement !== doc.body && topo.parentElement.id && r.ids.includes(topo.parentElement.id)) topo = topo.parentElement;
            if (elementos.some((e) => e.contains(topo))) { pegos.add(id); continue; }
            topo.querySelectorAll('script').forEach((s) => s.remove());
            elementos.push(topo); topo.querySelectorAll('[id]').forEach((d) => pegos.add(d.id)); pegos.add(id);
          }
        }
      }
    }
    const semTela = r.ids.filter((i) => !pegos.has(i));
    return { css: estilos.join('\n\n'), corpo: elementos.map((e) => e.outerHTML).join('\n'), semTela };
  }
  async function montar() {
    const r = resolver();
    if (!r.sel.length) throw new Error('Marque pelo menos um pedaço.');
    const nome = await LB.pedir('Nome do código novo:', '🧬 Combinado ' + new Date().toLocaleDateString('pt-BR'));
    if (!nome || !nome.trim()) return;
    const h = htmlDosProjetos(r);
    const ordem = r.todas.slice().sort((a, b) => (a.proj + a.arq).localeCompare(b.proj + b.arq) || a.ordem - b.ordem);
    let js = '/* Código combinado no 🧬 Combinar do Laboratório (' + new Date().toLocaleString('pt-BR') + '). Cada pedaço diz de onde veio. */\n';
    let ult = '';
    for (const x of ordem) { const de = x.projNome + ' › ' + x.arq; if (de !== ult) { js += '\n// ===================== de: ' + de + ' =====================\n'; ult = de; } js += '\n' + x.codigo + '\n'; }
    const corpo = (h.corpo || '<main><h1>' + esc(nome) + '</h1></main>') + (h.semTela.length ? '\n<!-- ⚠ o código procura estes elementos, mas não achei nos projetos: ' + h.semTela.map((i) => '#' + i).join(' ') + ' -->\n' + h.semTela.map((i) => '<div id="' + esc(i) + '"></div>').join('\n') : '');
    const html = '<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(nome) + '</title>\n<link rel="stylesheet" href="estilos.css"></head>\n<body>\n' + corpo + '\n<script src="pecas.js"></script>\n</body></html>\n';
    const arquivos = { 'index.html': { t: html }, 'pecas.js': { t: js }, 'estilos.css': { t: h.css || '/* sem estilos */\n' }, 'FICHA.md': { t: fichaMD(r, nome.trim()) + (h.semTela.length ? '\n## Elementos criados vazios (não achei nos projetos)\n' + h.semTela.map((i) => '- #' + i).join('\n') + '\n' : '') } };
    const p = { id: LB.novoId(), nome: nome.trim(), criado: Date.now(), origem: '🧬 Combinar', arquivos };
    await LB.banco.salvar(p); await LB.carregarProjetos(); LB.escolher(p.id);
    LB.aviso('🧬 Pronto: projeto "' + p.nome + '" com ' + r.todas.length + ' pedaços. ' + (r.faltam.length ? '⚠ Faltam ' + r.faltam.length + ' nomes — veja a FICHA.md ou peça ajuda à IA.' : 'Nada faltando ✅'), r.faltam.length ? 'erro' : 'ok');
    pintar(); return p;
  }

  // ---------- tela ----------
  function tela() {
    const el = $('#panel-combinar'); if (!el) return;
    if (!montado) {
      montado = true;
      el.innerHTML = '<div class="card"><h2>🧬 Combinar pedaços</h2><p class="muted">Pegue funções de códigos <b>diferentes</b> e monte um código novo. Ele lê todos os seus projetos do Laboratório (inclusive o que o 🔪 Desmontar e o ✂️ Fatiador separaram), traz sozinho o que cada pedaço precisa e avisa o que falta.</p>' +
        '<div class="linha"><input type="text" id="cb-busca" placeholder="🔎 procurar pedaço (nome, projeto, o que faz)…" style="flex:1"><button class="btn s" id="cb-ler">🔄 Ler os projetos de novo</button></div></div>' +
        '<div class="card" id="cb-cesta"></div><div class="card"><div id="cb-lista"></div></div>';
      el.addEventListener('input', (e) => { if (e.target.id === 'cb-busca') { filtro = e.target.value.toLowerCase(); pintarLista(); } });
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cb]'); if (!b) return;
        const a = b.dataset.cb;
        if (a === 'ler') ler();
        if (a === 'ver') { const x = pecas.find((y) => y.k === b.dataset.k); if (x) LB.modal('<h2>' + esc(x.nome) + '</h2><p class="muted">' + esc(x.projNome + ' › ' + x.arq) + ' · ' + esc(x.faz) + '</p><pre style="max-height:60vh;overflow:auto;white-space:pre-wrap">' + esc(x.codigo) + '</pre><div class="linha" style="justify-content:flex-end"><button class="btn" data-x="0">Fechar</button></div>', () => {}); }
        if (a === 'montar') montar().catch((er) => LB.aviso('⚠ ' + er.message, 'erro'));
        if (a === 'ia') { const r = resolver(); if (!r.sel.length) return LB.aviso('Marque pelo menos um pedaço.', 'erro'); const cod = r.todas.map((x) => '// ----- ' + x.nome + ' (de ' + x.projNome + ' › ' + x.arq + ')\n' + x.codigo).join('\n\n'); LB.irAba('ia'); setTimeout(() => LB.ia.colar('🧬 Quero juntar estes pedaços num código só', fichaMD(r) + '\n## O código dos pedaços\n```js\n' + cod.slice(0, 120000) + '\n```\n\nPor favor: 1) me explique em português simples o que cada pedaço faz; 2) junte num código que funcione, me devolvendo os ARQUIVOS COMPLETOS (index.html, pecas.js, estilos.css); 3) para o que está faltando, diga o que é e de onde provavelmente vem — não invente função que não existe; 4) termine com 📋 Situação (✅ feito, ❌ não feito, ➡️ próximo passo).'), 80); }
        if (a === 'limpar') { escolhidas.clear(); pintar(); }
        if (a === 'previa') LB.irAba('previa');
      });
      el.addEventListener('change', (e) => { const c = e.target.closest('[data-k]'); if (c && c.type === 'checkbox') { if (c.checked) escolhidas.add(c.dataset.k); else escolhidas.delete(c.dataset.k); pintarCesta(); } });
      $('#cb-ler').dataset.cb = 'ler';
    }
    if (!pecas.length) ler(); else pintar();
  }
  async function ler() {
    const l = $('#cb-lista'); if (l) l.innerHTML = '<p class="muted">⏳ Lendo os projetos…</p>';
    await LB.carregarProjetos(); await new Promise((r) => setTimeout(r, 20));
    pecas = lerTudo(); const ks = new Set(pecas.map((x) => x.k)); escolhidas = new Set([...escolhidas].filter((k) => ks.has(k)));
    pintar();
  }
  function pintar() { pintarCesta(); pintarLista(); }
  function pintarCesta() {
    const c = $('#cb-cesta'); if (!c) return;
    const r = resolver();
    c.innerHTML = '<h3>🧺 Escolhidos: ' + r.sel.length + (r.trazidas.length ? ' <span class="muted">(+ ' + r.trazidas.length + ' que eles precisam, trago sozinho)</span>' : '') + '</h3>' +
      (r.sel.length ? '<p>' + r.sel.map((x) => '<span class="chip">' + esc(x.nome) + ' <small class="muted">' + esc(x.projNome) + '</small></span>').join(' ') + '</p>' +
        (r.faltam.length ? '<p style="color:#f59e0b">⚠ Faltando: ' + r.faltam.map(esc).join(', ') + '</p>' : '<p style="color:#22c55e">✅ Nada faltando</p>') +
        (r.conflitos.length ? '<p style="color:#f59e0b">⚠ Nome repetido: ' + r.conflitos.map(esc).join('; ') + '</p>' : '') +
        '<div class="linha"><button class="btn p" data-cb="montar">🧬 Montar o código novo</button><button class="btn" data-cb="ia">🤖 Pedir ajuda à IA</button><button class="btn s" data-cb="previa">🧪 Abrir a Prévia</button><button class="btn s" data-cb="limpar">Desmarcar tudo</button></div>'
        : '<p class="muted">Marque os pedaços na lista de baixo.</p>');
  }
  function pintarLista() {
    const l = $('#cb-lista'); if (!l) return;
    const vis = pecas.filter((x) => !filtro || (x.nome + ' ' + x.projNome + ' ' + x.arq + ' ' + x.faz).toLowerCase().includes(filtro));
    if (!pecas.length) { l.innerHTML = '<p class="muted">Nenhum pedaço de código nos seus projetos ainda. Importe um projeto (aba 📁) ou desmonte um HTML no 🔪 Desmontar e abra como projeto.</p>'; return; }
    const grupos = {}; vis.slice(0, 1500).forEach((x) => { const g = x.projNome + ' › ' + x.arq; (grupos[g] = grupos[g] || []).push(x); });
    l.innerHTML = '<p class="muted">' + vis.length + ' pedaços' + (vis.length > 1500 ? ' (mostrando 1500 — use a busca)' : '') + '</p>' +
      Object.entries(grupos).map(([g, xs]) => '<details' + (Object.keys(grupos).length < 4 || filtro ? ' open' : '') + '><summary><b>' + esc(g) + '</b> <span class="muted">(' + xs.length + ')</span></summary>' +
        xs.map((x) => '<label style="display:block;margin:4px 0"><input type="checkbox" data-k="' + esc(x.k) + '"' + (escolhidas.has(x.k) ? ' checked' : '') + '> <b>' + esc(x.nome) + '</b> <span class="muted">· ' + esc(x.tipo) + ' · ' + x.linhas + ' linhas · ' + esc(x.faz) + (x.ids.length ? ' · tela: #' + esc(x.ids.slice(0, 4).join(' #')) : '') + '</span> <a href="#" data-cb="ver" data-k="' + esc(x.k) + '" onclick="return false">ver</a></label>').join('') + '</details>').join('');
  }

  window.addEventListener('lab-aba', (e) => { if (e.detail === 'combinar') tela(); });
  LB.combinar = { lerTudo, resolver, montar, tela, _pecas: () => pecas, _escolher: (ks) => { escolhidas = new Set(ks); pintar(); } };
})(window.LB);
