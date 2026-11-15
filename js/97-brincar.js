/* Laboratório — 97-brincar.js: 🧸 BRINCAR (o laboratório de brinquedo, para APRENDER)
   📥 Caixa: joga todos os seus códigos (arquivos, .zip, backups .json/.csv, o projeto escolhido) num lugar só.
   🔁 Repetidos: acha os iguais e os QUASE iguais (versão 1, versão 2…) e marca ⭐ a mais completa.
      "Ficar só com a ⭐" manda as outras para a pasta lixeira/ da caixa — nada é apagado.
   🧩 Montar: escolhe 2 a 4 brinquedos e eles abrem lado a lado na MESA, cada um na sua caixinha (sandbox).
      📤 Pegar texto de um → 🖐️ Mão → 📥 Colar no outro: é assim que códigos antigos "conversam" sem mexer neles.
      Para códigos novos existe a TOMADA: Brinquedo.enviar('nome', dados) e Brinquedo.receber(fn).
   🎓 Aprender: a IA explica o brinquedo como para iniciante, com experimentos para você fazer;
      e os botões levam direto para 🔪 Desmontar, ✂️ Fatiador e 🧪 Prévia. */
(function (LB) {
  'use strict';
  const CAIXA = 'caixa-brinquedos';
  const el = () => LB.$('#panel-brincar');
  const $ = (s) => LB.$(s, el());
  let sub = 'caixa', escolhidos = [];

  // ── a caixa é um projeto do Laboratório (aparece no 📂 Projetos e funciona com as outras abas) ──
  async function caixa() {
    let p = LB.projeto(CAIXA);
    if (!p) { p = { id: CAIXA, nome: '🧸 Caixa de brinquedos', criado: Date.now(), origem: 'Brincar', arquivos: {} }; await LB.banco.salvar(p); await LB.carregarProjetos(); }
    return p;
  }
  const brinquedos = (p) => Object.keys(p.arquivos).filter((k) => k.startsWith('brinquedos/') && p.arquivos[k].t != null).sort((a, b) => a.localeCompare(b));
  const nomeCurto = (k) => k.replace(/^brinquedos\//, '');
  const limpo = (s) => String(s || 'brinquedo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'brinquedo';
  const ICONE = (k) => /\.html?$/i.test(k) ? '🌐' : /\.css$/i.test(k) ? '🎨' : /\.(tsx|jsx)$/i.test(k) ? '⚛️' : /\.(m?js|ts|cjs)$/i.test(k) ? '📜' : /\.py$/i.test(k) ? '🐍' : /\.md$/i.test(k) ? '📝' : '📄';
  const normal = (t) => t.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim().toLowerCase();

  async function guardar(lista) { // lista: [{nome, texto}]
    const p = await caixa(); let novos = 0, iguais = 0;
    const jaTem = new Set(brinquedos(p).map((k) => normal(p.arquivos[k].t)));
    for (const x of lista) {
      if (!x.texto || !x.texto.trim()) continue;
      const n = normal(x.texto); if (jaTem.has(n)) { iguais++; continue; }
      let nome = 'brinquedos/' + limpo(x.nome.split('/').pop()); const base = nome; let k = 2;
      while (p.arquivos[nome]) { nome = base.replace(/(\.[^.]+)?$/, '-' + k + '$1'); k++; }
      p.arquivos[nome] = { t: x.texto }; jaTem.add(n); novos++;
    }
    await LB.banco.salvar(p); await LB.carregarProjetos();
    LB.aviso('🧸 ' + novos + ' brinquedo(s) novo(s)' + (iguais ? ' · ' + iguais + ' iguaizinho(s) que já estavam na caixa (não dupliquei)' : ''), 'ok');
  }

  // ── 🔁 repetidos: iguais (texto igual) e quase iguais (≥ 70% das linhas iguais) ──
  function familias(p) {
    const ks = brinquedos(p);
    const info = ks.map((k) => { const t = p.arquivos[k].t; const linhas = new Set(t.split('\n').map((l) => l.trim()).filter((l) => l.length > 3)); return { k, t, n: normal(t), linhas, tam: t.split('\n').length }; });
    const pai = ks.map((_, i) => i); const raiz = (i) => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
    const tri = (x) => { if (!x.tri) { x.tri = new Set(); for (let i = 0; i < x.n.length - 2; i++) x.tri.add(x.n.substr(i, 3)); } return x.tri; };
    const simCurto = (a, b) => { const A = tri(a), B = tri(b); let c = 0; A.forEach((g) => { if (B.has(g)) c++; }); return c / Math.max(A.size, B.size, 1); };
    const sim = (a, b) => { if (Math.min(a.tam, b.tam) < 30 && Math.max(a.n.length, b.n.length) < 20000) return simCurto(a, b); if (!a.linhas.size || !b.linhas.size) return a.n === b.n ? 1 : 0; let c = 0; const [m, M] = a.linhas.size < b.linhas.size ? [a.linhas, b.linhas] : [b.linhas, a.linhas]; m.forEach((l) => { if (M.has(l)) c++; }); return c / Math.max(a.linhas.size, b.linhas.size); };
    for (let i = 0; i < info.length; i++) for (let j = i + 1; j < info.length; j++) {
      const ext = (x) => x.k.split('.').pop().toLowerCase();
      if (ext(info[i]) !== ext(info[j]) && !(/html?/.test(ext(info[i])) && /html?/.test(ext(info[j])))) continue;
      if (info[i].n === info[j].n || sim(info[i], info[j]) >= 0.7) pai[raiz(j)] = raiz(i);
    }
    const g = {}; info.forEach((x, i) => { (g[raiz(i)] = g[raiz(i)] || []).push(x); });
    return Object.values(g).filter((f) => f.length > 1).map((f) => { f.sort((a, b) => b.tam - a.tam); f.forEach((x) => { x.pct = Math.round(sim(f[0], x) * 100); }); return f; });
  }

  // ── 🧩 a MESA: cada brinquedo numa caixinha (sandbox), com a tomada e a mão ──
  function comoPagina(k, t) {
    if (/\.html?$/i.test(k) || /^\s*<(!doctype|html|head|body)/i.test(t)) return t;
    const esc = (s) => s.replace(/<\/script/gi, '<\\/script');
    if (/\.css$/i.test(k)) return '<!doctype html><meta charset="utf-8"><style>' + t + '</style><body><h1>Título</h1><h2>Subtítulo</h2><p>Um parágrafo de teste com <a href="#">um link</a>.</p><button>Botão</button> <input placeholder="campo"><ul><li>item 1</li><li>item 2</li></ul><div class="card container box">div com classes comuns</div></body>';
    if (/\.(m?js|cjs)$/i.test(k)) return '<!doctype html><meta charset="utf-8"><body style="font:14px system-ui;background:#0f172a;color:#e6edf8"><b>📜 ' + k + '</b><pre id="__log" style="white-space:pre-wrap"></pre><textarea style="width:100%;min-height:80px" placeholder="campo de entrada (o 📥 Colar põe texto aqui)"></textarea><script>(function(){var L=document.getElementById("__log");["log","warn","error","info"].forEach(function(m){var o=console[m];console[m]=function(){L.textContent+=(m==="log"?"":m.toUpperCase()+": ")+[].map.call(arguments,function(a){try{return typeof a==="object"?JSON.stringify(a):String(a)}catch(e){return String(a)}}).join(" ")+"\\n";o.apply(console,arguments)}});window.onerror=function(m,s,l){L.textContent+="❌ "+m+" (linha "+l+")\\n"}})();<\/script><script>' + esc(t) + '<\/script></body>';
    return '<!doctype html><meta charset="utf-8"><body style="font:14px system-ui;background:#0f172a;color:#e6edf8"><b>' + ICONE(k) + ' ' + LB.esc(k) + '</b> <small>(este tipo não roda no navegador; só dá para ver o texto)</small><pre style="white-space:pre-wrap">' + LB.esc(t) + '</pre></body>';
  }
  // o que vai DENTRO de cada caixinha: a tomada (Brinquedo), o pegar/colar e uma memória própria (localStorage de mentira)
  function tomada(nome, dados) {
    return '<script>(function(){var ME=' + JSON.stringify(nome) + ';var D=' + JSON.stringify(dados || {}).replace(/</g, '\\u003c') + ';' +
      'var S={getItem:function(k){return Object.prototype.hasOwnProperty.call(D,k)?D[k]:null},setItem:function(k,v){D[k]=String(v);parent.postMessage({brqLS:D,de:ME},"*")},removeItem:function(k){delete D[k];parent.postMessage({brqLS:D,de:ME},"*")},clear:function(){D={};parent.postMessage({brqLS:D,de:ME},"*")},key:function(i){return Object.keys(D)[i]||null},get length(){return Object.keys(D).length}};' +
      'try{window.localStorage.getItem("x")}catch(e){try{Object.defineProperty(window,"localStorage",{value:S,configurable:true})}catch(e2){}}' +
      'window.Brinquedo={nome:ME,enviar:function(para,dados){parent.postMessage({brq:1,de:ME,para:para||"*",dados:dados},"*")},receber:function(fn){window.addEventListener("message",function(e){var d=e.data;if(d&&d.brq&&d.de!==ME)fn(d.dados,d.de)})}};' +
      'window.addEventListener("message",function(e){var d=e.data;if(!d||!d.brqCmd)return;' +
      'if(d.brqCmd==="pegar"){var s=String(window.getSelection()||"");if(!s.trim()){var c=document.querySelectorAll("textarea,output,pre,#resultado,.resultado,#saida,.saida,#output,.output");for(var i=c.length-1;i>=0&&!s.trim();i--){s=c[i].value!=null&&c[i].tagName!=="OUTPUT"?c[i].value:c[i].innerText}}if(!s.trim())s=document.body.innerText;parent.postMessage({brqTexto:s,de:ME},"*")}' +
      'if(d.brqCmd==="colar"){var a=document.activeElement&&/^(TEXTAREA|INPUT)$/.test(document.activeElement.tagName)?document.activeElement:document.querySelector("textarea,input[type=text],input[type=search],input:not([type]),[contenteditable=true]");if(a){if("value" in a){a.value=d.texto;a.dispatchEvent(new Event("input",{bubbles:true}));a.dispatchEvent(new Event("change",{bubbles:true}))}else a.innerText=d.texto;a.focus&&a.focus()}parent.postMessage({brqColou:!!a,de:ME},"*")}});})();<\/script>';
  }
  function injetar(html, nome, dados) {
    const t = tomada(nome, dados);
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + t);
    if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + t);
    return t + html;
  }
  const memoriaDe = (nome) => { try { return JSON.parse(localStorage.getItem('brq-ls-' + nome) || '{}'); } catch (e) { return {}; } };
  const guardarMemoria = (nome, d) => { try { localStorage.setItem('brq-ls-' + nome, JSON.stringify(d)); } catch (e) {} };

  // ── Tela ──
  async function tela() {
    const e = el(); if (!e) return;
    const p = await caixa(); const ks = brinquedos(p);
    e.innerHTML = '<div class="lab-topo"><h2>🧸 Brincar</h2><p class="lab-mut">O seu laboratório de brinquedo, para <b>aprender</b>: jogue os seus códigos aqui, ache os repetidos, ponha um para conversar com o outro e peça para a IA explicar.</p></div>' +
      '<div class="lab-chips">' + [['caixa', '📥 Caixa (' + ks.length + ')'], ['repetidos', '🔁 Repetidos'], ['montar', '🧩 Montar'], ['aprender', '🎓 Aprender'], ['tomada', '🔌 Como funciona']].map(([k, t]) => '<button class="lab-chip' + (sub === k ? ' on' : '') + '" data-sub="' + k + '">' + t + '</button>').join('') + '</div><div id="bq-corpo" style="margin-top:12px"></div>';
    LB.$('.lab-chips', e).onclick = (ev) => { const b = ev.target.closest('[data-sub]'); if (b) { sub = b.dataset.sub; tela(); } };
    ({ caixa: telaCaixa, repetidos: telaRepetidos, montar: telaMontar, aprender: telaAprender, tomada: telaTomada })[sub](p, ks);
  }
  const corpo = (h) => { $('#bq-corpo').innerHTML = h; };

  function telaCaixa(p, ks) {
    const atual = LB.projeto(LB.atual);
    corpo('<div class="card"><div class="card-title">📥 Pôr brinquedos na caixa</div>' +
      '<div class="lab-linha"><button class="btn btn-primary" id="bq-arq">📂 Arquivos ou .zip</button><button class="btn" id="bq-bk">♻️ Backup .json / .csv</button>' + (atual && atual.id !== CAIXA ? '<button class="btn" id="bq-proj">📂 Do projeto "' + LB.esc(atual.nome) + '"</button>' : '') + '</div>' +
      '<input type="file" id="bq-farq" hidden multiple accept=".html,.htm,.js,.mjs,.cjs,.ts,.tsx,.jsx,.css,.md,.txt,.py,.json,.zip"><input type="file" id="bq-fbk" hidden multiple accept=".json,.csv">' +
      '<details class="lab-det"><summary>✍️ Colar um código</summary><input id="bq-nome" class="lab-busca" placeholder="nome com extensão (ex.: calculadora.html)" style="margin:8px 0"><textarea id="bq-txt" class="lab-area" placeholder="Cole aqui…"></textarea><button class="btn" id="bq-colar">🧸 Guardar</button></details>' +
      '<p class="lab-mut">Pode jogar tudo, até repetido: o que for <b>iguaizinho</b> eu nem guardo de novo; os <b>quase iguais</b> aparecem em 🔁 Repetidos.</p></div>' +
      (ks.length ? '<div class="card"><div class="card-title">🧸 Na caixa (' + ks.length + ')</div><input id="bq-q" class="lab-busca" placeholder="🔎 Procurar…"><div id="bq-lista" style="margin-top:8px"></div></div>' : '<div class="card"><p class="lab-mut">A caixa está vazia. Comece pondo uns códigos aí em cima.</p></div>'));
    $('#bq-arq').onclick = () => $('#bq-farq').click(); $('#bq-bk').onclick = () => $('#bq-fbk').click();
    $('#bq-farq').onchange = async (ev) => {
      const fs = [...ev.target.files]; ev.target.value = ''; const lista = [];
      for (const f of fs) {
        if (/\.zip$/i.test(f.name)) { const z = await JSZip.loadAsync(await f.arrayBuffer()); for (const k of Object.keys(z.files)) { if (z.files[k].dir || /(^|\/)(node_modules|\.git)\//.test(k) || !/\.(html?|m?jsx?|cjs|tsx?|css|md|txt|py|json)$/i.test(k)) continue; lista.push({ nome: k.replace(/\//g, '-'), texto: await z.file(k).async('string') }); } }
        else lista.push({ nome: f.name, texto: await f.text() });
      }
      await guardar(lista); tela();
    };
    $('#bq-fbk').onchange = async (ev) => {
      const fs = [...ev.target.files]; ev.target.value = ''; const lista = [];
      for (const f of fs) { try { LB.recuperar.recuperar(f.name, await f.text()).forEach((a) => { if (a.tipo !== 'conversa' && a.tipo !== 'lista') lista.push({ nome: a.caminho.split('/').slice(-2).join('-'), texto: a.texto }); }); } catch (er) { LB.aviso(f.name + ': ' + er.message, 'erro'); } }
      if (!lista.length) return LB.aviso('Não achei código nesses backups (conversas e ementas ficam no ♻️ Recuperar).', 'erro');
      await guardar(lista); tela();
    };
    if ($('#bq-proj')) $('#bq-proj').onclick = async () => { const a = LB.projeto(LB.atual); await guardar(Object.keys(a.arquivos).filter((k) => a.arquivos[k].t != null && /\.(html?|m?jsx?|cjs|tsx?|css|md|py)$/i.test(k)).map((k) => ({ nome: k.replace(/\//g, '-'), texto: a.arquivos[k].t }))); tela(); };
    $('#bq-colar').onclick = async () => { const t = $('#bq-txt').value; if (!t.trim()) return LB.aviso('Cole um código primeiro', 'erro'); await guardar([{ nome: $('#bq-nome').value.trim() || 'colado.html', texto: t }]); tela(); };
    if (!ks.length) return;
    const pintar = (q) => {
      q = (q || '').toLowerCase();
      $('#bq-lista').innerHTML = ks.filter((k) => !q || (k + ' ' + p.arquivos[k].t.slice(0, 4000)).toLowerCase().includes(q)).map((k) => '<div class="lab-linha" style="margin:4px 0;justify-content:space-between;border-bottom:1px solid var(--li);padding-bottom:6px"><span style="overflow-wrap:anywhere">' + ICONE(k) + ' <b>' + LB.esc(nomeCurto(k)) + '</b> <small class="lab-mut">· ' + p.arquivos[k].t.split('\n').length + ' linhas</small></span><span><button class="btn s" data-k="' + LB.esc(k) + '" data-a="ver">👁</button><button class="btn s" data-k="' + LB.esc(k) + '" data-a="aprender">🎓</button><button class="btn s" data-k="' + LB.esc(k) + '" data-a="nome">✏️</button><button class="btn s" data-k="' + LB.esc(k) + '" data-a="fora">🗑</button></span></div>').join('');
    };
    pintar(''); $('#bq-q').oninput = (ev) => pintar(ev.target.value);
    $('#bq-lista').onclick = async (ev) => {
      const b = ev.target.closest('[data-a]'); if (!b) return; const k = b.dataset.k; const pp = await caixa();
      if (b.dataset.a === 'ver') { escolhidos = [k]; sub = 'montar'; tela(); }
      if (b.dataset.a === 'aprender') { alvo = k; sub = 'aprender'; tela(); }
      if (b.dataset.a === 'nome') { const n = await LB.pedir('Novo nome:', nomeCurto(k)); if (n && n.trim()) { const nk = 'brinquedos/' + limpo(n.trim()); if (!pp.arquivos[nk]) { pp.arquivos[nk] = pp.arquivos[k]; delete pp.arquivos[k]; await LB.banco.salvar(pp); await LB.carregarProjetos(); tela(); } else LB.aviso('Já existe um com esse nome', 'erro'); } }
      if (b.dataset.a === 'fora') { pp.arquivos['lixeira/' + nomeCurto(k)] = pp.arquivos[k]; delete pp.arquivos[k]; await LB.banco.salvar(pp); await LB.carregarProjetos(); LB.aviso('🗑 Foi para a pasta lixeira/ da caixa (não apaguei).', 'ok'); tela(); }
    };
  }

  function telaRepetidos(p) {
    const fams = familias(p);
    if (!fams.length) return corpo('<div class="card"><p class="lab-ok">✅ Nenhum repetido na caixa.</p><p class="lab-mut">Os iguaizinhos eu já barro na entrada. Aqui aparecem os <b>quase iguais</b> (70% ou mais iguais).</p></div>');
    corpo('<div class="card"><p class="lab-mut">Achei <b>' + fams.length + ' família(s)</b> de códigos parecidos. A ⭐ é a <b>mais completa</b> (mais linhas). Confira antes: às vezes a menor é a que funciona.</p></div>' +
      fams.map((f, i) => '<div class="card"><div class="card-title">👨‍👩‍👧 Família ' + (i + 1) + ' — ' + f.length + ' versões</div>' +
        f.map((x, j) => '<div class="lab-linha" style="justify-content:space-between;margin:4px 0"><span style="overflow-wrap:anywhere">' + (j === 0 ? '⭐ ' : '') + ICONE(x.k) + ' <b>' + LB.esc(nomeCurto(x.k)) + '</b> <small class="lab-mut">· ' + x.tam + ' linhas' + (j ? ' · ' + x.pct + '% igual à ⭐' : '') + '</small></span><span><button class="btn s" data-ver="' + LB.esc(x.k) + '">👁</button>' + (j ? '<button class="btn s" data-dif="' + i + ':' + j + '">⚖️ Diferença</button>' : '') + '</span></div>').join('') +
        '<div class="lab-linha"><button class="btn" data-ficar="' + i + '">⭐ Ficar só com a ⭐ (as outras vão para lixeira/)</button></div></div>').join(''));
    $('#bq-corpo').onclick = async (ev) => {
      const v = ev.target.closest('[data-ver]'), d = ev.target.closest('[data-dif]'), fc = ev.target.closest('[data-ficar]');
      if (v) { escolhidos = [v.dataset.ver]; sub = 'montar'; tela(); }
      if (d) {
        const [i, j] = d.dataset.dif.split(':').map(Number); const A = fams[i][0], B = fams[i][j];
        const la = new Set(A.t.split('\n').map((l) => l.trim()).filter(Boolean)), lb = new Set(B.t.split('\n').map((l) => l.trim()).filter(Boolean));
        const soA = [...la].filter((l) => !lb.has(l)), soB = [...lb].filter((l) => !la.has(l));
        LB.modal('<h2>⚖️ ' + LB.esc(nomeCurto(A.k)) + ' × ' + LB.esc(nomeCurto(B.k)) + '</h2><p class="lab-mut">Linhas que só a ⭐ tem: <b>' + soA.length + '</b> · que só a outra tem: <b>' + soB.length + '</b></p><details class="lab-det" open><summary>Só na ⭐ ' + LB.esc(nomeCurto(A.k)) + '</summary><pre class="lab-pre">' + LB.esc(soA.slice(0, 200).join('\n') || '(nada)') + '</pre></details><details class="lab-det"><summary>Só na ' + LB.esc(nomeCurto(B.k)) + '</summary><pre class="lab-pre">' + LB.esc(soB.slice(0, 200).join('\n') || '(nada)') + '</pre></details><div class="linha" style="justify-content:flex-end"><button class="btn" data-x="0">Fechar</button></div>', () => {});
      }
      if (fc) {
        const f = fams[+fc.dataset.ficar]; if (!(await LB.confirmar('Ficar só com "' + nomeCurto(f[0].k) + '"? As outras ' + (f.length - 1) + ' vão para a pasta lixeira/ da caixa (dá para trazer de volta; nada é apagado).', 'Ficar com a ⭐'))) return;
        const pp = await caixa(); f.slice(1).forEach((x) => { pp.arquivos['lixeira/' + nomeCurto(x.k)] = pp.arquivos[x.k]; delete pp.arquivos[x.k]; });
        await LB.banco.salvar(pp); await LB.carregarProjetos(); LB.aviso('⭐ Pronto. As cópias estão em lixeira/.', 'ok'); tela();
      }
    };
  }

  function telaMontar(p, ks) {
    if (!ks.length) return corpo('<div class="card"><p class="lab-mut">Ponha brinquedos na 📥 Caixa primeiro.</p></div>');
    escolhidos = escolhidos.filter((k) => ks.includes(k)).slice(0, 4);
    corpo('<div class="card"><div class="card-title">🧩 Escolha de 1 a 4 brinquedos para a mesa</div><input id="bq-q" class="lab-busca" placeholder="🔎 Procurar…"><div id="bq-esc" style="max-height:30vh;overflow:auto;margin-top:6px"></div>' +
      '<div class="lab-linha"><button class="btn btn-primary" id="bq-mesa">🧩 Pôr na mesa</button><button class="btn" id="bq-baixar">⤓ Baixar a mesa (.html)</button></div></div><div id="bq-mesa-area"></div>');
    const pintar = (q) => { q = (q || '').toLowerCase(); $('#bq-esc').innerHTML = ks.filter((k) => !q || k.toLowerCase().includes(q) || escolhidos.includes(k)).map((k) => '<label class="lab-op" style="display:flex;margin:4px 0"><input type="checkbox" data-k="' + LB.esc(k) + '"' + (escolhidos.includes(k) ? ' checked' : '') + '> ' + ICONE(k) + ' ' + LB.esc(nomeCurto(k)) + '</label>').join(''); };
    pintar(''); $('#bq-q').oninput = (ev) => pintar(ev.target.value);
    $('#bq-esc').onchange = (ev) => { const c = ev.target.closest('[data-k]'); if (!c) return; if (c.checked) { if (escolhidos.length >= 4) { c.checked = false; return LB.aviso('No máximo 4 na mesa', 'erro'); } escolhidos.push(c.dataset.k); } else escolhidos = escolhidos.filter((k) => k !== c.dataset.k); };
    $('#bq-mesa').onclick = () => mesa(p);
    $('#bq-baixar').onclick = () => { if (!escolhidos.length) return LB.aviso('Escolha pelo menos 1', 'erro'); LB.baixar('mesa-' + escolhidos.map((k) => limpo(nomeCurto(k)).replace(/\.\w+$/, '')).join('+').slice(0, 60) + '.html', mesaHTML(p)); };
    if (escolhidos.length) mesa(p);
  }
  // a mesa como página sozinha (para baixar e abrir em qualquer lugar)
  function mesaHTML(p) {
    const pecas = escolhidos.map((k) => ({ nome: nomeCurto(k), src: injetar(comoPagina(k, p.arquivos[k].t), nomeCurto(k), {}) }));
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mesa: ' + LB.esc(pecas.map((x) => x.nome).join(' + ')) + '</title><style>body{margin:0;background:#0f172a;color:#e6edf8;font:14px system-ui}header{padding:8px 10px;background:#16213a;position:sticky;top:0;z-index:2}textarea{width:100%;box-sizing:border-box;min-height:54px;background:#0b0f18;color:inherit;border:1px solid #2b3a5c;border-radius:8px}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:8px;padding:8px}section{border:1px solid #2b3a5c;border-radius:10px;overflow:hidden;background:#16213a}section b{display:block;padding:6px 8px}iframe{width:100%;height:65vh;border:0;background:#fff}button{background:#1e2b48;color:#fff;border:1px solid #2b3a5c;border-radius:8px;padding:6px 10px;margin:0 4px 6px 8px;font:inherit}</style></head><body>' +
      '<header>🖐️ <b>Mão</b> (o texto que você pegou):<textarea id="mao"></textarea></header><div class="g">' + pecas.map((x, i) => '<section><b>' + LB.esc(x.nome) + '</b><button data-p="' + i + '">📤 Pegar texto</button><button data-c="' + i + '">📥 Colar aqui</button><iframe id="f' + i + '" sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"></iframe></section>').join('') + '</div>' +
      '<script>var P=' + JSON.stringify(pecas).replace(/</g, '\\u003c') + ';P.forEach(function(x,i){document.getElementById("f"+i).srcdoc=x.src});var mao=document.getElementById("mao");' +
      'document.onclick=function(e){var b=e.target.closest("[data-p],[data-c]");if(!b)return;var i=+(b.dataset.p||b.dataset.c);var f=document.getElementById("f"+i).contentWindow;if(b.dataset.p!=null)f.postMessage({brqCmd:"pegar"},"*");else f.postMessage({brqCmd:"colar",texto:mao.value},"*")};' +
      'window.onmessage=function(e){var d=e.data||{};if(d.brqTexto!=null)mao.value=d.brqTexto;if(d.brq)P.forEach(function(x,i){if(d.para==="*"||d.para===x.nome)document.getElementById("f"+i).contentWindow.postMessage(d,"*")})};<\/script></body></html>';
  }
  function mesa(p) {
    const area = $('#bq-mesa-area'); if (!area) return;
    if (!escolhidos.length) { area.innerHTML = ''; return LB.aviso('Escolha pelo menos 1', 'erro'); }
    area.innerHTML = '<div class="card"><div class="card-title">🧩 Mesa</div><p class="lab-mut">Cada brinquedo roda na sua <b>caixinha</b> (sandbox): se um quebrar, não estraga os outros nem o Laboratório. Para um conversar com o outro: <b>📤 Pegar texto</b> num → aparece na 🖐️ Mão → <b>📥 Colar aqui</b> no outro (vai para o primeiro campo de texto dele).</p>' +
      '<label class="lab-mut">🖐️ Mão:</label><textarea id="bq-mao" class="lab-area" style="min-height:60px" placeholder="O texto que você pegar aparece aqui (dá para editar antes de colar)"></textarea><p class="lab-mut" id="bq-msg"></p></div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:8px">' + escolhidos.map((k, i) => '<div class="card" style="padding:0;overflow:hidden"><div style="padding:6px 8px"><b>' + ICONE(k) + ' ' + LB.esc(nomeCurto(k)) + '</b><div class="lab-linha" style="margin:4px 0"><button class="btn s" data-p="' + i + '">📤 Pegar texto</button><button class="btn s" data-c="' + i + '">📥 Colar aqui</button><button class="btn s" data-r="' + i + '">🔄</button><button class="btn s" data-t="' + i + '">↗ Tela cheia</button></div></div><iframe id="bq-f' + i + '" sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads" style="width:100%;height:60vh;border:0;background:#fff;display:block"></iframe></div>').join('') + '</div>';
    const carregar = (i) => { const k = escolhidos[i]; LB.$('#bq-f' + i).srcdoc = injetar(comoPagina(k, p.arquivos[k].t), nomeCurto(k), memoriaDe(nomeCurto(k))); };
    escolhidos.forEach((_, i) => carregar(i));
    area.onclick = (ev) => {
      const b = ev.target.closest('[data-p],[data-c],[data-r],[data-t]'); if (!b) return;
      const i = +(b.dataset.p || b.dataset.c || b.dataset.r || b.dataset.t); const f = LB.$('#bq-f' + i);
      if (b.dataset.p != null) f.contentWindow.postMessage({ brqCmd: 'pegar' }, '*');
      if (b.dataset.c != null) f.contentWindow.postMessage({ brqCmd: 'colar', texto: LB.$('#bq-mao').value }, '*');
      if (b.dataset.r != null) carregar(i);
      if (b.dataset.t != null) { const u = URL.createObjectURL(new Blob([comoPagina(escolhidos[i], p.arquivos[escolhidos[i]].t)], { type: 'text/html' })); window.open(u, '_blank'); }
    };
  }
  window.addEventListener('message', (e) => {
    const d = e.data; if (!d || typeof d !== 'object') return;
    const frames = LB.$$('iframe[id^="bq-f"]'); if (!frames.some((f) => f.contentWindow === e.source)) return;
    if (d.brqTexto != null) { const m = LB.$('#bq-mao'); if (m) m.value = d.brqTexto; const s = LB.$('#bq-msg'); if (s) s.textContent = '📤 Peguei ' + d.brqTexto.length + ' letras de "' + d.de + '".'; }
    if (d.brqColou != null) { const s = LB.$('#bq-msg'); if (s) s.textContent = d.brqColou ? '📥 Colei no "' + d.de + '".' : '⚠ "' + d.de + '" não tem campo de texto para colar.'; }
    if (d.brqLS) guardarMemoria(d.de, d.brqLS);
    if (d.brq) frames.forEach((f, i) => { const nm = nomeCurto(escolhidos[i] || ''); if (f.contentWindow !== e.source && (d.para === '*' || d.para === nm)) f.contentWindow.postMessage(d, '*'); });
  });

  let alvo = '';
  function telaAprender(p, ks) {
    if (!ks.length) return corpo('<div class="card"><p class="lab-mut">Ponha brinquedos na 📥 Caixa primeiro.</p></div>');
    if (!ks.includes(alvo)) alvo = ks[0];
    const t = p.arquivos[alvo].t;
    const conta = { linhas: t.split('\n').length, funcoes: (t.match(/\bfunction\s+[\w$]+|\b(const|let)\s+[\w$]+\s*=\s*(async\s*)?\(/g) || []).length, botoes: (t.match(/<button\b/gi) || []).length, campos: (t.match(/<(input|textarea|select)\b/gi) || []).length, estilos: (t.match(/<style\b/gi) || []).length, scripts: (t.match(/<script\b/gi) || []).length, fora: (t.match(/https?:\/\/[^\s"'<>)]+/g) || []).filter((u) => !/w3\.org/.test(u)).length };
    corpo('<div class="card"><div class="card-title">🎓 Aprender com um brinquedo</div><select id="bq-alvo" class="lab-busca">' + ks.map((k) => '<option value="' + LB.esc(k) + '"' + (k === alvo ? ' selected' : '') + '>' + ICONE(k) + ' ' + LB.esc(nomeCurto(k)) + '</option>').join('') + '</select>' +
      '<div class="lab-cards"><div class="lab-num"><b>' + conta.linhas + '</b><span>linhas</span></div><div class="lab-num"><b>' + conta.funcoes + '</b><span>funções (o "cérebro")</span></div><div class="lab-num"><b>' + conta.botoes + '</b><span>botões</span></div><div class="lab-num"><b>' + conta.campos + '</b><span>campos (entrada)</span></div><div class="lab-num"><b>' + conta.fora + '</b><span>endereços de fora (internet)</span></div></div>' +
      '<p class="lab-mut">📖 Lembrete: <b>HTML</b> = o esqueleto (o que aparece) · <b>CSS</b> = a roupa (cores e tamanhos) · <b>JS</b> = o cérebro (o que acontece quando você toca).</p>' +
      '<div class="lab-linha"><button class="btn btn-primary" data-x="explica">🎓 IA, me explica este código</button><button class="btn" data-x="experimentos">🧪 IA, me dá 3 experimentos</button><button class="btn" data-x="conversar">🔌 IA, como ele conversaria com outro?</button></div>' +
      '<div class="lab-linha"><button class="btn" data-x="desmontar">🔪 Desmontar</button><button class="btn" data-x="fatiar">✂️ Fatiar</button><button class="btn" data-x="mesa">🧩 Pôr na mesa</button></div></div>');
    $('#bq-alvo').onchange = (ev) => { alvo = ev.target.value; tela(); };
    $('#bq-corpo').onclick = (ev) => {
      const b = ev.target.closest('[data-x]'); if (!b) return; const x = b.dataset.x; const nm = nomeCurto(alvo);
      const cod = '```\n' + (t.length > 60000 ? t.slice(0, 60000) + '\n…(cortado: o código é grande — use o ✂️ Fatiador e me mande por partes)' : t) + '\n```';
      const pedidos = {
        explica: 'Sou iniciante e não sei programar. Me explique este código ("' + nm + '") como se eu tivesse 12 anos, em português simples, sem palavras difíceis (se usar uma, explique):\n1) O que ele faz, em 2 frases.\n2) As partes: onde está o esqueleto (HTML), a roupa (CSS) e o cérebro (JS).\n3) As funções principais, uma linha cada: o que cada uma faz.\n4) O que ele RECEBE (campos, arquivos, internet) e o que ele ENTREGA (texto, arquivo, tela).\n5) Se tiver algo perigoso ou quebrado (chave escrita no código, endereço que não existe mais), avise.',
        experimentos: 'Sou iniciante. Me dê 3 experimentos BEM pequenos para eu aprender com este código ("' + nm + '"): para cada um, diga a linha exata que eu troco, pelo quê, e o que eu vou ver mudar. Comece pelo mais fácil (uma cor ou um texto). Depois me mande o arquivo INTEIRO já com o experimento 1 feito, para eu comparar.',
        conversar: 'Eu quero que este código ("' + nm + '") converse com outros códigos meus. No meu Laboratório existe a "tomada": Brinquedo.enviar(\'nome-do-outro\', dados) manda dados para outro código aberto na mesa, e Brinquedo.receber(function(dados, de){ … }) recebe. Explique em português simples: o que este código poderia ENVIAR e o que poderia RECEBER. Depois me mande o arquivo INTEIRO com a tomada já ligada (sem tirar nada do que já funciona), dizendo onde você mexeu.',
      };
      if (pedidos[x]) { if (!LB.ia) return LB.copiar(pedidos[x] + '\n\n' + cod); LB.irAba('ia'); setTimeout(() => LB.ia.colar('🧸 ' + nm, pedidos[x] + '\n\n' + cod), 80); }
      if (x === 'desmontar') { LB.irAba('desmontar'); setTimeout(() => { if (window.LabDesmontar) LabDesmontar.carregar(nm, /\.html?$/i.test(nm) ? t : comoPagina(alvo, t)); }, 120); }
      if (x === 'fatiar') { if (LB.fatiador && LB.fatiador.abrir) LB.fatiador.abrir(nm, t); else LB.irAba('fatiador'); }
      if (x === 'mesa') { escolhidos = [alvo]; sub = 'montar'; tela(); }
    };
  }

  function telaTomada() {
    corpo('<div class="card"><div class="card-title">🔌 Como os códigos conversam</div>' +
      '<p>Cada brinquedo na mesa roda numa <b>caixinha fechada</b> (sandbox). Ele não enxerga os outros — por isso um não estraga o outro. Para conversar, existem 2 jeitos:</p>' +
      '<p><b>1) Pegar e colar (funciona com QUALQUER código antigo, sem mexer nele):</b><br>📤 <b>Pegar texto</b> pega o que você selecionou dentro do brinquedo (ou o último campo de resultado dele) e põe na 🖐️ <b>Mão</b>. 📥 <b>Colar aqui</b> põe o texto da Mão no primeiro campo de texto do outro brinquedo. Exemplo: pega a intimação das Comunicações → cola na minuta.</p>' +
      '<p><b>2) A tomada (para códigos que você pedir para a IA adaptar):</b> dentro de cada caixinha existe o <code>Brinquedo</code>:</p>' +
      '<pre class="lab-pre">// mandar para outro brinquedo da mesa (pelo nome do arquivo, ou "*" para todos)\nBrinquedo.enviar(\'minuta.html\', { texto: \'…\' });\n\n// receber o que os outros mandam\nBrinquedo.receber(function (dados, de) {\n  document.querySelector(\'textarea\').value = dados.texto;\n});</pre>' +
      '<p>No 🎓 Aprender, o botão <b>"🔌 IA, como ele conversaria com outro?"</b> pede para a IA ligar a tomada no seu código e devolver o arquivo inteiro.</p>' +
      '<p class="lab-mut">💾 Memória: cada brinquedo ganha a sua própria "gaveta" (o que ele salvar com localStorage fica guardado só para ele e não mexe nas suas chaves do Laboratório). O que usa IndexedDB ou login de site pode não funcionar dentro da caixinha — aí use o ↗ Tela cheia.</p></div>');
  }

  window.addEventListener('lab-aba', (e) => { if (e.detail === 'brincar') tela(); });
  LB.brincar = { tela, guardar, familias, injetar, comoPagina, mesaHTML: (p, ks) => { escolhidos = ks; return mesaHTML(p); } };
})(window.LB);
