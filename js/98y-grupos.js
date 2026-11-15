/* Laboratório — 98y-grupos.js: 🧩 GRUPOS — seus códigos HTML trabalhando JUNTOS (a ideia do Caça-Bug, sem montar.py).
   - Crie um grupo (ex.: 🧹 Limpeza, 💾 Backup, ⚖️ Comparação) e ponha nele os seus códigos .html.
   - Cada grupo tem uma 🧺 MESA: os arquivos que circulam entre os códigos.
   - 📤 ENTREGAR: pega um arquivo da mesa e coloca DENTRO do código, como se você tivesse tocado em
     "abrir arquivo" nele (ou cola na caixa de texto dele).
   - 📥 GUARDAR SOZINHO: tudo que um código "baixa" (relatório, código limpo, backup, comparação) ou "copia"
     cai na mesa em vez de se perder nos downloads — aí o próximo código pega dali.
   - 📋 Relatório para o Claude: junta tudo que está na mesa num .md só.
   O código original NÃO é mexido: o grupo guarda uma cópia e coloca a "tomada" por fora. */
(function (LB) {
  'use strict';
  const { $, esc } = LB;
  const PREFIXO = '🧩 Grupo: ';
  let grupoId = null, ferrAtual = null, montado = false;

  const grupos = () => (LB.projetos || []).filter((p) => p.origem === 'grupo');
  const grupo = () => (grupoId ? LB.projeto(grupoId) : null);
  const ferramentas = (g) => Object.keys(g.arquivos).filter((k) => /^ferramentas\/[^/]+\.html?$/i.test(k)).sort();
  const mesa = (g) => Object.keys(g.arquivos).filter((k) => k.startsWith('mesa/')).sort((a, b) => (g.arquivos[b].quando || 0) - (g.arquivos[a].quando || 0));
  const nomeLimpo = (n) => String(n || 'arquivo').split(/[\\/]/).pop().replace(/[^\wÀ-ÿ.\- ()]+/g, '_').slice(0, 80) || 'arquivo';
  const ehTexto = (nome, tipo) => /^text\/|json|javascript|xml|csv|markdown/.test(tipo || '') || /\.(txt|md|json|csv|html?|js|css|xml|log|ts|tsx|jsx|py|sql|ya?ml|ini|env\.exemplo)$/i.test(nome);
  const salvar = async (g) => { await LB.banco.salvar(g); };

  // "tomada" colocada por fora em cada código: tudo que ele baixa/copia/compartilha vai para a mesa
  const TOMADA = '<script>(function(){var P=window.parent,id=(window.frameElement&&window.frameElement.dataset.ferr)||"?";' +
    'function cap(n,b){try{P.__labMesa(n,b,id)}catch(e){}}' +
    'function pega(a){var h=a.href||"";if(a.hasAttribute&&a.hasAttribute("download")&&/^(blob:|data:)/.test(h)){fetch(h).then(function(r){return r.blob()}).then(function(b){cap(a.getAttribute("download")||"arquivo",b)});return true}return false}' +
    'var ck=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(pega(this))return;return ck.apply(this,arguments)};' +
    'var de=HTMLAnchorElement.prototype.dispatchEvent;HTMLAnchorElement.prototype.dispatchEvent=function(ev){if(ev&&ev.type==="click"&&pega(this))return true;return de.apply(this,arguments)};' +
    'document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("a[download]");if(a&&pega(a))e.preventDefault()},true);' +
    'try{if(navigator.clipboard&&navigator.clipboard.writeText){var wt=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=function(t){cap("copiado.txt",new Blob([String(t)],{type:"text/plain"}));return wt(t).catch(function(){})}}}catch(e){}' +
    'try{if(navigator.share){var sh=navigator.share.bind(navigator);navigator.share=function(d){if(d&&d.files&&d.files.length){for(var i=0;i<d.files.length;i++)cap(d.files[i].name,d.files[i]);return Promise.resolve()}return sh(d)}}}catch(e){}' +
    '})();<\/script>';
  function comTomada(html) {
    const m = /<head[^>]*>/i.exec(html);
    if (m) return html.slice(0, m.index + m[0].length) + TOMADA + html.slice(m.index + m[0].length);
    return TOMADA + html;
  }

  // ---------- mesa ----------
  window.__labMesa = async (nome, blob, deQuem) => {
    const g = grupo(); if (!g) return;
    let n = nomeLimpo(nome); const base = n.replace(/(\.[^.]+)?$/, ''), ext = (/\.[^.]+$/.exec(n) || [''])[0];
    let i = 2; while (g.arquivos['mesa/' + n]) n = base + ' (' + i++ + ')' + ext;
    const reg = { quando: Date.now(), de: deQuem, tipo: blob.type || '' };
    if (ehTexto(n, blob.type)) reg.t = await blob.text();
    else { const u8 = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let k = 0; k < u8.length; k += 32768) s += String.fromCharCode.apply(null, u8.subarray(k, k + 32768)); reg.b64 = btoa(s); reg.b = u8.length; }
    g.arquivos['mesa/' + n] = reg; await salvar(g);
    LB.aviso('📥 Guardei "' + n + '" na 🧺 mesa (de ' + String(deQuem).replace(/^ferramentas\//, '') + ')', 'ok');
    pintarMesa();
  };
  function arquivoDaMesa(g, k) {
    const r = g.arquivos[k], nome = k.slice(5);
    if (r.t != null) return new File([r.t], nome, { type: r.tipo || (/\.html?$/i.test(nome) ? 'text/html' : /\.json$/i.test(nome) ? 'application/json' : 'text/plain') });
    const bin = atob(r.b64 || ''); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new File([u8], nome, { type: r.tipo || 'application/octet-stream' });
  }

  // ---------- entregar ----------
  function quadro() { return $('#gr-quadro'); }
  function entregar(arquivos) {
    const f = quadro(); if (!f) return;
    let doc; try { doc = f.contentDocument; } catch (e) { doc = null; }
    if (!doc) { LB.aviso('⚠ Não consegui entrar nesta ferramenta.', 'erro'); return; }
    const dt = new DataTransfer(); arquivos.forEach((a) => dt.items.add(a));
    const inputs = [...doc.querySelectorAll('input[type=file]')];
    if (inputs.length) {
      const inp = inputs.find((i) => i.multiple && arquivos.length > 1) || inputs[0];
      inp.files = dt.files; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
      LB.aviso('📤 Entreguei ' + arquivos.length + ' arquivo(s) para a ferramenta.', 'ok'); return;
    }
    const alvo = doc.querySelector('[class*=drop i],[id*=drop i],[class*=arrast i],[id*=arrast i]') || doc.body;
    try { ['dragenter', 'dragover', 'drop'].forEach((t) => alvo.dispatchEvent(new DragEvent(t, { dataTransfer: dt, bubbles: true, cancelable: true }))); LB.aviso('📤 Soltei o arquivo na ferramenta (ela não tem botão de abrir arquivo).', 'ok'); }
    catch (e) { LB.aviso('⚠ Esta ferramenta não tem onde receber arquivo. Use 📋 Colar texto.', 'erro'); }
  }
  async function colarTexto(k) {
    const g = grupo(), f = quadro(); if (!g || !f) return;
    const r = g.arquivos[k]; if (!r || r.t == null) return LB.aviso('Esse arquivo não é texto.', 'erro');
    const doc = f.contentDocument; const caixa = doc && [...doc.querySelectorAll('textarea, [contenteditable=true]')].find((x) => x.offsetParent !== null) || (doc && doc.querySelector('textarea'));
    if (!caixa) return LB.aviso('⚠ Não achei caixa de texto nesta ferramenta.', 'erro');
    if (caixa.tagName === 'TEXTAREA') { caixa.value = r.t; caixa.dispatchEvent(new Event('input', { bubbles: true })); caixa.dispatchEvent(new Event('change', { bubbles: true })); } else caixa.textContent = r.t;
    caixa.focus(); LB.aviso('📋 Colei "' + k.slice(5) + '" na caixa de texto da ferramenta.', 'ok');
  }

  // ---------- relatório ----------
  function relatorio(g) {
    const ks = mesa(g);
    return '# 🧩 ' + g.nome.replace(PREFIXO, '') + ' — o que está na mesa (' + new Date().toLocaleString('pt-BR') + ')\n\n' +
      'Ferramentas do grupo: ' + ferramentas(g).map((k) => k.slice(12)).join(', ') + '\n\n' +
      ks.map((k) => { const r = g.arquivos[k]; return '## ' + k.slice(5) + (r.de ? ' (veio de ' + String(r.de).replace(/^ferramentas\//, '') + ')' : '') + '\n\n' + (r.t != null ? '```\n' + r.t.slice(0, 60000) + (r.t.length > 60000 ? '\n…(cortei, era grande)' : '') + '\n```' : '_(arquivo binário, ' + Math.round((r.b || 0) / 1024) + ' KB)_'); }).join('\n\n') + '\n';
  }

  // ---------- tela ----------
  function tela() {
    const el = $('#panel-grupos'); if (!el) return;
    if (!montado) {
      montado = true;
      el.innerHTML = '<div class="card"><h2>🧩 Grupos — códigos que trabalham juntos</h2><p class="muted">Ponha seus códigos .html num grupo (ex.: Limpeza, Backup, Comparação). Tudo que um código <b>baixa ou copia</b> cai na <b>🧺 mesa</b> do grupo, e com <b>📤 Entregar</b> o próximo código recebe. Seus originais não são mexidos.</p>' +
        '<div class="linha" id="gr-lista"></div></div><div id="gr-corpo"></div>' +
        '<input type="file" id="gr-f-ferr" accept=".html,.htm,text/html" multiple hidden><input type="file" id="gr-f-mesa" multiple hidden>';
      el.addEventListener('click', clique);
      $('#gr-f-ferr').onchange = async (e) => { const g = grupo(); const fs = [...e.target.files]; e.target.value = ''; if (!g) return; for (const f of fs) g.arquivos['ferramentas/' + nomeLimpo(f.name).replace(/\.htm$/i, '.html')] = { t: await f.text() }; await salvar(g); LB.aviso('✅ ' + fs.length + ' código(s) no grupo.', 'ok'); pintar(); };
      $('#gr-f-mesa').onchange = async (e) => { const fs = [...e.target.files]; e.target.value = ''; for (const f of fs) await window.__labMesa(f.name, f, 'você'); };
    }
    pintar();
  }
  async function clique(e) {
    const b = e.target.closest('[data-g]'); if (!b) return;
    const a = b.dataset.g, g = grupo();
    if (a === 'novo') { const n = await LB.pedir('Nome do grupo (ex.: Limpeza, Backup, Comparação):', ''); if (!n || !n.trim()) return; const p = { id: LB.novoId(), nome: PREFIXO + n.trim(), criado: Date.now(), origem: 'grupo', arquivos: {} }; await salvar(p); await LB.carregarProjetos(); grupoId = p.id; ferrAtual = null; pintar(); }
    if (a === 'abrir') { grupoId = b.dataset.id; ferrAtual = null; pintar(); }
    if (!g) return;
    if (a === 'por') $('#gr-f-ferr').click();
    if (a === 'por-projeto') { const opc = (LB.projetos || []).filter((p) => p.origem !== 'grupo').flatMap((p) => Object.keys(p.arquivos).filter((k) => /\.html?$/i.test(k) && p.arquivos[k].t != null).map((k) => ({ p, k }))); if (!opc.length) return LB.aviso('Nenhum .html nos seus projetos do Laboratório.', 'erro'); LB.modal('<h2>Pôr código de um projeto</h2><div style="max-height:60vh;overflow:auto">' + opc.slice(0, 400).map((o, i) => '<label style="display:block;margin:4px 0"><input type="checkbox" value="' + i + '"> ' + esc(o.p.nome) + ' › <b>' + esc(o.k) + '</b></label>').join('') + '</div><div class="linha" style="justify-content:flex-end"><button class="btn" data-x="0">Cancelar</button><button class="btn p" data-x="1">Pôr no grupo</button></div>', async (w, x) => { if (x !== '1') return; const sel = [...w.querySelectorAll('input:checked')].map((c) => opc[+c.value]); for (const o of sel) g.arquivos['ferramentas/' + nomeLimpo((o.k.split('/').length > 1 && /^index\.html?$/i.test(o.k.split('/').pop()) ? o.k.split('/').slice(-2, -1)[0] + '.html' : o.k.split('/').pop()))] = { t: o.p.arquivos[o.k].t }; await salvar(g); LB.aviso('✅ ' + sel.length + ' código(s) no grupo.', 'ok'); pintar(); }); }
    if (a === 'ferr') { ferrAtual = b.dataset.k; pintar(); }
    if (a === 'tirar-ferr') { if (!(await LB.confirmar('Tirar "' + ferrAtual.slice(12) + '" do grupo? (o seu original não é apagado)', 'Tirar'))) return; delete g.arquivos[ferrAtual]; ferrAtual = null; await salvar(g); pintar(); }
    if (a === 'entregar') { const ks = [...document.querySelectorAll('#gr-mesa input:checked')].map((c) => c.value); if (!ks.length) return LB.aviso('Marque na 🧺 mesa o(s) arquivo(s) para entregar.', 'erro'); entregar(ks.map((k) => arquivoDaMesa(g, k))); }
    if (a === 'colar') { const k = (document.querySelector('#gr-mesa input:checked') || {}).value; if (!k) return LB.aviso('Marque na 🧺 mesa o arquivo de texto para colar.', 'erro'); colarTexto(k); }
    if (a === 'mesa-por') $('#gr-f-mesa').click();
    if (a === 'mesa-projeto') { const p = LB.atual && LB.atual(); if (!p || p.origem === 'grupo') return LB.aviso('Escolha lá em cima um projeto (que não seja grupo).', 'erro'); if (!window.JSZip) return LB.aviso('Sem o JSZip.', 'erro'); const z = new JSZip(); Object.entries(p.arquivos).forEach(([k, v]) => { if (v && v.t != null) z.file(k, v.t); }); await window.__labMesa(p.nome + '.zip', await z.generateAsync({ type: 'blob' }), 'projeto'); }
    if (a === 'ver') { const r = g.arquivos[b.dataset.k]; LB.modal('<h2>' + esc(b.dataset.k.slice(5)) + '</h2>' + (r.t != null ? '<pre style="max-height:60vh;overflow:auto;white-space:pre-wrap">' + esc(r.t.slice(0, 200000)) + '</pre>' : '<p class="muted">Arquivo binário (' + Math.round((r.b || 0) / 1024) + ' KB).</p>') + '<div class="linha" style="justify-content:flex-end"><button class="btn" data-x="0">Fechar</button></div>', () => {}); }
    if (a === 'baixar') { const f = arquivoDaMesa(g, b.dataset.k); LB.baixar(f.name, f, f.type); }
    if (a === 'apagar') { delete g.arquivos[b.dataset.k]; await salvar(g); pintarMesa(); }
    if (a === 'limpar-mesa') { if (!(await LB.confirmar('Tirar TODOS os arquivos da mesa deste grupo?', 'Tirar tudo'))) return; mesa(g).forEach((k) => delete g.arquivos[k]); await salvar(g); pintarMesa(); }
    if (a === 'relatorio') { const t = relatorio(g); LB.modal('<h2>📋 Relatório para o Claude</h2><p class="muted">Copie e cole na conversa, ou baixe o .md.</p><textarea rows="14" style="width:100%" readonly>' + esc(t) + '</textarea><div class="linha" style="justify-content:flex-end"><button class="btn" data-x="c">📋 Copiar</button><button class="btn" data-x="b">⬇ Baixar .md</button><button class="btn p" data-x="0">Fechar</button></div>', (w, x) => { if (x === 'c') LB.copiar(t); if (x === 'b') LB.baixar('grupo-' + g.nome.replace(PREFIXO, '').replace(/\W+/g, '-') + '.md', t, 'text/markdown'); }); }
    if (a === 'apagar-grupo') { if (!(await LB.confirmar('Apagar o grupo "' + g.nome.replace(PREFIXO, '') + '"? (os seus códigos originais não são apagados)', 'Apagar grupo'))) return; await LB.banco.apagar(g.id); await LB.carregarProjetos(); grupoId = null; ferrAtual = null; pintar(); }
  }
  function pintar() {
    const l = $('#gr-lista'), c = $('#gr-corpo'); if (!l || !c) return;
    if (grupoId && !grupo()) grupoId = null;
    if (!grupoId && grupos().length) grupoId = grupos()[0].id;
    l.innerHTML = grupos().map((g) => '<button class="btn' + (g.id === grupoId ? ' p' : '') + '" data-g="abrir" data-id="' + esc(g.id) + '">🧩 ' + esc(g.nome.replace(PREFIXO, '')) + ' <small>(' + ferramentas(g).length + ')</small></button>').join('') + '<button class="btn s" data-g="novo">➕ Novo grupo</button>';
    const g = grupo();
    if (!g) { c.innerHTML = '<div class="card"><p class="muted">Crie o primeiro grupo em <b>➕ Novo grupo</b>.</p></div>'; return; }
    const fs = ferramentas(g); if (ferrAtual && !g.arquivos[ferrAtual]) ferrAtual = null; if (!ferrAtual && fs.length) ferrAtual = fs[0];
    c.innerHTML = '<div class="card"><div class="linha" style="flex-wrap:wrap">' + fs.map((k) => '<button class="btn' + (k === ferrAtual ? ' p' : ' s') + '" data-g="ferr" data-k="' + esc(k) + '">' + esc(k.slice(12).replace(/\.html?$/i, '')) + '</button>').join('') +
      '<button class="btn s" data-g="por">➕ Pôr código (.html)</button><button class="btn s" data-g="por-projeto">➕ De um projeto</button></div>' +
      (ferrAtual ? '<div class="linha" style="flex-wrap:wrap;margin-top:6px"><button class="btn p" data-g="entregar">📤 Entregar o marcado na mesa</button><button class="btn" data-g="colar">📋 Colar texto na caixa</button><button class="btn s" data-g="tirar-ferr">✖ Tirar do grupo</button></div>' +
        '<iframe id="gr-quadro" class="ferr-quadro" data-ferr="' + esc(ferrAtual) + '" title="' + esc(ferrAtual) + '" allow="microphone; camera; clipboard-read; clipboard-write; fullscreen; autoplay; web-share"></iframe>' : '<p class="muted">Ponha os códigos deste grupo em <b>➕ Pôr código</b>.</p>') + '</div>' +
      '<div class="card"><h3>🧺 Mesa do grupo <small class="muted">— o que circula entre os códigos</small></h3><div class="linha" style="flex-wrap:wrap"><button class="btn s" data-g="mesa-por">➕ Pôr arquivo</button><button class="btn s" data-g="mesa-projeto">➕ O projeto escolhido (zip)</button><button class="btn" data-g="relatorio">📋 Relatório para o Claude</button><button class="btn s" data-g="limpar-mesa">🧽 Limpar mesa</button><button class="btn s" data-g="apagar-grupo">🗑 Apagar grupo</button></div><div id="gr-mesa"></div></div>';
    if (ferrAtual) { const f = quadro(); f.srcdoc = comTomada(g.arquivos[ferrAtual].t || ''); }
    pintarMesa();
  }
  function pintarMesa() {
    const m = $('#gr-mesa'), g = grupo(); if (!m || !g) return;
    const ks = mesa(g);
    m.innerHTML = ks.length ? ks.map((k) => { const r = g.arquivos[k]; return '<div class="linha" style="border-bottom:1px solid var(--li);padding:4px 0"><label style="flex:1;min-width:0;overflow-wrap:anywhere"><input type="checkbox" value="' + esc(k) + '"> <b>' + esc(k.slice(5)) + '</b> <small class="muted">' + (r.t != null ? Math.ceil(r.t.length / 1024) + ' KB texto' : Math.round((r.b || 0) / 1024) + ' KB') + (r.de ? ' · de ' + esc(String(r.de).replace(/^ferramentas\//, '')) : '') + '</small></label><button class="btn s" data-g="ver" data-k="' + esc(k) + '">👁</button><button class="btn s" data-g="baixar" data-k="' + esc(k) + '">⬇</button><button class="btn s" data-g="apagar" data-k="' + esc(k) + '">✖</button></div>'; }).join('')
      : '<p class="muted">Vazia. Quando um código do grupo baixar ou copiar alguma coisa, aparece aqui sozinho.</p>';
  }

  window.addEventListener('lab-aba', (e) => { if (e.detail === 'grupos') tela(); });
  LB.grupos = { tela, entregar, relatorio, _grupo: grupo, _abrir: (id) => { grupoId = id; pintar(); } };
})(window.LB);
