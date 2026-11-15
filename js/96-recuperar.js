/* Laboratório — 96-recuperar.js: ♻️ RECUPERADOR DE BACKUP
   Abre os backups .json dos seus apps antigos (Exportar Backup, LocalStorage, playground, Iara, SK Editor,
   AI Code Studio…) e o snippets.csv da Replit, ACHA os códigos, páginas e conversas guardados lá dentro
   e transforma em ARQUIVOS de verdade: vira projeto do Laboratório, .zip ou .md.
   - Entende JSON dentro de JSON (o LocalStorage guarda tudo como texto).
   - Conversas (mensagens) viram .md legível; listas (ementas, histórico) viram .md.
   - Chaves e senhas que aparecerem NÃO são copiadas (ficam de fora e o aviso diz quantas).
   Regra: nada é apagado. Confira os arquivos aqui ANTES de apagar o app antigo do celular. */
(function (LB) {
  'use strict';
  const el = () => LB.$('#panel-recuperar');
  const $ = (s) => LB.$(s, el());
  let achados = [], origem = '', segredos = 0;

  const CHAVE_SEGREDO = /(api[_-]?key|apikey|token|senha|password|secret|segredo|authorization|bearer|cofre|credential|_key_|^key$|chave)/i;
  const VALOR_SEGREDO = /\b(AIza[0-9A-Za-z_\-]{20,}|sk-(?:ant-|proj-|or-v1-)?[0-9A-Za-z_\-]{16,}|gsk_[0-9A-Za-z]{20,}|ghp_[0-9A-Za-z]{20,}|github_pat_[0-9A-Za-z_]{20,}|xai-[0-9A-Za-z]{20,}|pplx-[0-9A-Za-z]{20,}|eyJ[0-9A-Za-z_\-]{30,}\.[0-9A-Za-z_\-]{20,}\.[0-9A-Za-z_\-]{10,})/g;
  const tirarSegredos = (t) => t.replace(VALOR_SEGREDO, () => { segredos++; return '••• (chave tirada pelo Recuperador)'; }).replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+@/gi, (m, a) => { segredos++; return a + '•••@'; });

  const EXT = /\.(html?|css|m?jsx?|cjs|tsx?|json|md|txt|py|sh|bat|xml|svg|ya?ml|java|kt|gradle|properties|csv|vue|svelte|env\.example)$/i;
  const pareceCodigo = (s) => /<!doctype|<html|<div|<script|<style|<body|<\/\w+>/i.test(s) || /\b(function|const|let|var|import|export|return|class|def)\b[\s\S]{0,200}[{(:]/.test(s) || /^\s*[.#@:]?[\w-]+\s*\{[^}]*:[^}]*\}/m.test(s);
  const tipoDe = (s) => /<!doctype|<html|<body|<head/i.test(s) ? 'html' : /^\s*(import|export)\b|=>|\bfunction\b/m.test(s) ? (/<[A-Z]\w*[\s/>]/.test(s) ? 'tsx' : 'js') : /^\s*[.#@:]?[\w-][^{]*\{[^}]*:[^}]*\}/m.test(s) ? 'css' : /^\s*#{1,3}\s/m.test(s) ? 'md' : 'txt';
  const limpo = (s) => String(s || 'item').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-/ ]+/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^[-/.]+|[-/]+$/g, '').slice(0, 80) || 'item';
  const ehB64 = (s) => s.length > 16 && s.length % 4 === 0 && /^[A-Za-z0-9+/\r\n]+={0,2}$/.test(s);
  function deB64(s) { try { const b = atob(s.replace(/\s/g, '')); const u = Uint8Array.from(b, (c) => c.charCodeAt(0)); const t = new TextDecoder('utf-8', { fatal: true }).decode(u); return /[\x00-\x08\x0e-\x1f]/.test(t.slice(0, 500)) ? null : t; } catch (e) { return null; } }
  function talvezJSON(v) { if (typeof v !== 'string') return v; const t = v.trim(); if (!/^[[{]/.test(t) || t.length < 2) return v; try { return JSON.parse(t); } catch (e) { return v; } }

  function add(caminho, texto, tipo, de) {
    texto = tirarSegredos(String(texto));
    if (!texto.trim()) return;
    if (achados.some((a) => a.texto === texto)) return; // repetido
    let c = caminho.split('/').map(limpo).join('/'); let k = 2; const base = c;
    while (achados.some((a) => a.caminho === c)) { c = base.replace(/(\.[^./]+)?$/, '-' + k + '$1'); k++; }
    achados.push({ caminho: c, texto, tipo, de, ok: true });
  }
  function conversaMD(titulo, msgs) {
    const L = ['# 💬 ' + (titulo || 'Conversa'), ''];
    msgs.forEach((m) => { if (!m || typeof m !== 'object') return; const quem = m.role || m.autor || m.from || m.sender || m.tipo || '?'; const txt = m.content != null ? m.content : m.text != null ? m.text : m.texto != null ? m.texto : m.message || m.msg || ''; const t = Array.isArray(txt) ? txt.map((p) => (p && (p.text || p.content)) || '').join('\n') : String(txt); L.push('**' + (/user|usu|eu|human/i.test(quem) ? '🙋 Eu' : /assist|ai|bot|model|ia/i.test(quem) ? '🤖 IA' : quem) + ':**', '', t, ''); });
    return L.join('\n');
  }
  const nomeDe = (o) => o && (o.name || o.nome || o.title || o.titulo || o.filename || o.fileName || o.path || o.caminho || o.id);
  const textoDe = (o) => { for (const k of ['content', 'code', 'codigo', 'html', 'source', 'texto', 'text', 'body', 'conteudo', 'ementa', 'output', 'resposta', 'resultado', 'minuta', 'data', 'value']) if (typeof o[k] === 'string' && o[k].length) return [k, o[k]]; return null; };
  const linhaSecreta = (o) => { const n = String(o.key || o.chave || o.nome || o.name || ''); return CHAVE_SEGREDO.test(n) && !/template|modelo|header/i.test(n); };

  function andar(v, rota, prof) {
    if (prof > 14) return;
    v = talvezJSON(v);
    if (typeof v === 'string') {
      const ult = rota[rota.length - 1] || '';
      if (CHAVE_SEGREDO.test(ult) && v.length < 400) { segredos++; return; }
      if (v.length >= 120 && pareceCodigo(v)) { const t = tipoDe(v); add(rota.join('/').replace(/\.(\w+)$/, '') + (EXT.test(ult) ? '' : '.' + t), v, t, rota.join(' › ')); }
      return;
    }
    if (Array.isArray(v)) {
      // conversa: lista de mensagens
      if (v.length && v.every((m) => m && typeof m === 'object' && (m.role || m.autor || m.sender || m.from) && (m.content != null || m.text != null || m.texto != null || m.message != null))) { add(rota.join('/') + '.md', conversaMD(rota[rota.length - 2] || rota[rota.length - 1], v), 'conversa', rota.join(' › ')); return; }
      // lista de registros com texto (ementas, histórico, snippets): cada um vira arquivo se for código, senão vira um .md junto
      const regs = v.filter((o) => o && typeof o === 'object' && !Array.isArray(o));
      if (regs.length && regs.length === v.length && !regs.every((o) => textoDe(o)) && regs.every((o) => Object.values(o).every((x) => x == null || typeof x !== 'object'))) {
        // tabela simples (CSV do banco, ex.: ai_history com input/output): vira um .md com todas as colunas
        const linhas = [];
        regs.forEach((o, i) => { if (linhaSecreta(o)) { segredos++; return; } linhas.push('## ' + (nomeDe(o) || 'Linha ' + (i + 1)) + '\n\n' + Object.entries(o).filter(([kk]) => !CHAVE_SEGREDO.test(kk)).map(([kk, vv]) => String(vv || '').length > 120 ? '**' + kk + ':**\n\n' + vv : '- **' + kk + ':** ' + (vv == null ? '' : vv)).join('\n')); });
        if (linhas.length) add(rota.join('/') + '.md', '# ' + (rota[rota.length - 1] || 'tabela') + ' (' + linhas.length + ')\n\n' + linhas.join('\n\n---\n\n'), 'lista', rota.join(' › '));
        return;
      }
      if (regs.length && regs.length === v.length && regs.every((o) => textoDe(o))) {
        const soltos = [];
        regs.forEach((o, i) => {
          const [k, t] = textoDe(o); const nm = nomeDe(o) || (rota[rota.length - 1] + '-' + (i + 1));
          const raw = k === 'data' && ehB64(t) ? deB64(t) : t; if (raw == null) return;
          if (EXT.test(String(nm)) || pareceCodigo(raw)) add(rota.concat(EXT.test(String(nm)) ? String(nm) : limpo(String(nm)) + '.' + tipoDe(raw)).join('/'), raw, tipoDe(raw), rota.join(' › ') + ' [' + i + ']');
          else if (Array.isArray(o.messages) || Array.isArray(o.mensagens)) add(rota.concat(limpo(String(nm)) + '.md').join('/'), conversaMD(String(nm), o.messages || o.mensagens), 'conversa', rota.join(' › '));
          else if (linhaSecreta(o)) { segredos++; }
          else soltos.push('## ' + (nomeDe(o) || 'Item ' + (i + 1)) + '\n\n' + Object.entries(o).filter(([kk, vv]) => typeof vv !== 'object' && !CHAVE_SEGREDO.test(kk)).map(([kk, vv]) => kk === k ? String(vv) : '- **' + kk + ':** ' + vv).join('\n'));
        });
        if (soltos.length) add(rota.join('/') + '.md', '# ' + (rota[rota.length - 1] || 'lista') + ' (' + soltos.length + ')\n\n' + soltos.join('\n\n---\n\n'), 'lista', rota.join(' › '));
        regs.forEach((o, i) => Object.entries(o).forEach(([kk, vv]) => { if (vv && typeof vv === 'object') andar(vv, rota.concat(limpo(String(nomeDe(o) || i)), kk), prof + 1); }));
        return;
      }
      v.forEach((x, i) => andar(x, rota.concat(String(nomeDe(x) && typeof nomeDe(x) !== 'object' ? limpo(String(nomeDe(x))) : i)), prof + 1));
      return;
    }
    if (v && typeof v === 'object') {
      const ks = Object.keys(v);
      // { "index.html": "<!doctype…", "css/app.css": "…" } → arquivos
      const arqs = ks.filter((k) => EXT.test(k) && (typeof v[k] === 'string' || (v[k] && typeof v[k] === 'object' && textoDe(v[k]))));
      if (arqs.length && arqs.length >= ks.length / 2) {
        arqs.forEach((k) => { let t = typeof v[k] === 'string' ? v[k] : textoDe(v[k])[1]; if (!/\.(html?|css|m?jsx?|tsx?|md|txt|json)$/i.test(k) && ehB64(t)) t = deB64(t) || t; else if (ehB64(t) && !pareceCodigo(t)) t = deB64(t) || t; add(rota.concat(k).join('/'), t, tipoDe(t), rota.join(' › ')); });
        ks.filter((k) => !arqs.includes(k)).forEach((k) => andar(v[k], rota.concat(k), prof + 1));
        return;
      }
      // { name:"x.html", content:"…" }
      const tx = textoDe(v); const nm = nomeDe(v);
      if (tx && nm && (EXT.test(String(nm)) || pareceCodigo(tx[1]))) { let t = tx[1]; if (tx[0] === 'data' && ehB64(t)) t = deB64(t); if (t != null) add(rota.concat(EXT.test(String(nm)) ? String(nm) : limpo(String(nm)) + '.' + tipoDe(t)).join('/'), t, tipoDe(t), rota.join(' › ')); }
      if (Array.isArray(v.messages) || Array.isArray(v.mensagens)) { add(rota.concat(limpo(String(nm || 'conversa')) + '.md').join('/'), conversaMD(nm, v.messages || v.mensagens), 'conversa', rota.join(' › ')); }
      ks.forEach((k) => { if (tx && k === tx[0]) return; if (k === 'messages' || k === 'mensagens') return; andar(v[k], rota.concat(k), prof + 1); });
    }
  }

  function lerCSV(t) {
    const linhas = []; let lin = [], cel = '', q = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { cel += '"'; i++; } else q = false; } else cel += c; continue; }
      if (c === '"') q = true; else if (c === ',') { lin.push(cel); cel = ''; } else if (c === '\n') { lin.push(cel.replace(/\r$/, '')); linhas.push(lin); lin = []; cel = ''; } else cel += c;
    }
    if (cel || lin.length) { lin.push(cel); linhas.push(lin); }
    if (!linhas.length) return [];
    const cab = linhas[0].map((h) => h.trim()); return linhas.slice(1).filter((l) => l.some((x) => x.trim())).map((l) => Object.fromEntries(cab.map((h, i) => [h || 'col' + i, l[i] || ''])));
  }

  function recuperar(nomeArq, texto) {
    achados = []; segredos = 0; origem = nomeArq;
    const base = limpo(nomeArq.replace(/\.(json|csv|txt)$/i, ''));
    if (/\.csv$/i.test(nomeArq)) { andar(lerCSV(texto), [base], 0); }
    else {
      let j; try { j = JSON.parse(texto); } catch (e) { throw new Error('Esse arquivo não é um JSON válido (' + e.message.slice(0, 60) + '). Se for .csv, troque a extensão para .csv.'); }
      andar(j, [base], 0);
    }
    return achados;
  }

  // ── Tela ──
  function tela() {
    const e = el(); if (!e) return;
    e.innerHTML = '<div class="lab-topo"><h2>♻️ Recuperar backup</h2><p class="lab-mut">Abra o <b>.json</b> que os seus apps antigos baixam (Exportar Backup, LocalStorage, playground…) ou o <b>snippets.csv</b> da Replit. Eu acho os códigos, páginas e conversas lá dentro e transformo em <b>arquivos de verdade</b>.</p></div>' +
      '<div class="card"><div class="lab-linha"><button class="btn btn-primary" id="rc-abrir">📂 Abrir backup (.json / .csv)</button><input type="file" id="rc-file" hidden multiple accept=".json,.csv,.txt,application/json,text/*"></div>' +
      '<details class="lab-det"><summary>✍️ Ou colar o conteúdo do backup</summary><textarea id="rc-colar" class="lab-area" placeholder="Cole aqui o JSON…"></textarea><button class="btn" id="rc-usar">♻️ Recuperar o colado</button></details>' +
      '<p class="lab-aviso">🛟 <b>Antes de apagar um app antigo do celular:</b> 1) baixe o backup dele, 2) abra aqui, 3) confira os arquivos e crie o projeto, 4) só então apague o app. Nada aqui apaga coisa nenhuma.</p></div><div id="rc-res"></div>';
    $('#rc-abrir').onclick = () => $('#rc-file').click();
    $('#rc-file').onchange = async (ev) => { const fs = [...ev.target.files]; ev.target.value = ''; if (!fs.length) return; let todos = [], seg = 0, nomes = []; for (const f of fs) { try { recuperar(f.name, await f.text()); todos = todos.concat(achados.map((a) => Object.assign(a, { caminho: (fs.length > 1 ? limpo(f.name.replace(/\.\w+$/, '')) + '/' : '') + a.caminho.replace(/^[^/]+\//, '') }))); seg += segredos; nomes.push(f.name); } catch (er) { LB.aviso(f.name + ': ' + er.message, 'erro'); } } achados = todos; segredos = seg; origem = nomes.join(', '); mostrar(); };
    $('#rc-usar').onclick = () => { try { recuperar('colado.json', $('#rc-colar').value); mostrar(); } catch (er) { LB.aviso(er.message, 'erro'); } };
    if (achados.length) mostrar();
  }
  const ICONE = { html: '🌐', css: '🎨', js: '📜', tsx: '⚛️', md: '📝', conversa: '💬', lista: '📚', txt: '📄' };
  function mostrar() {
    const r = $('#rc-res'); if (!r) return;
    if (!achados.length) { r.innerHTML = '<div class="card"><p class="lab-aviso">Não achei código nem conversa nesse arquivo. Se quiser, me mande um pedacinho dele (sem as chaves) que eu ensino o Recuperador a ler esse formato.</p></div>'; return; }
    const cont = {}; achados.forEach((a) => { cont[a.tipo] = (cont[a.tipo] || 0) + 1; });
    r.innerHTML = '<div class="card"><div class="card-title">✅ Achei ' + achados.length + ' coisa(s) em ' + LB.esc(origem) + '</div><p class="lab-mut">' + Object.entries(cont).map(([k, n]) => (ICONE[k] || '📄') + ' ' + n + ' ' + k).join(' · ') + (segredos ? ' · 🔒 ' + segredos + ' chave(s)/senha(s) deixadas de fora' : '') + '</p>' +
      '<div class="lab-linha"><button class="btn btn-primary" id="rc-proj">💾 Criar projeto com os marcados</button><button class="btn" id="rc-zip">🗜️ Baixar .zip</button><button class="btn" id="rc-md">📝 Baixar tudo em 1 .md</button></div>' +
      '<div class="lab-linha"><button class="btn s" id="rc-todos">☑ Marcar todos</button><button class="btn s" id="rc-nenhum">☐ Desmarcar</button><input id="rc-q" class="lab-busca" style="flex:1;min-width:160px" placeholder="🔎 Procurar…"></div><div id="rc-lista"></div></div>';
    const lista = $('#rc-lista');
    const pintar = (q) => { q = (q || '').toLowerCase(); lista.innerHTML = achados.map((a, i) => (!q || (a.caminho + ' ' + a.texto.slice(0, 3000)).toLowerCase().includes(q)) ? '<details class="lab-det" data-i="' + i + '"><summary><label onclick="event.stopPropagation()"><input type="checkbox" data-ok="' + i + '"' + (a.ok ? ' checked' : '') + '></label> ' + (ICONE[a.tipo] || '📄') + ' <b>' + LB.esc(a.caminho) + '</b> <small>· ' + a.texto.split('\n').length + ' linhas · ' + LB.kb(new Blob([a.texto]).size) + '</small></summary><p class="lab-mut" style="font-size:12px">Veio de: ' + LB.esc(a.de) + '</p><pre class="lab-pre">' + LB.esc(a.texto.slice(0, 6000)) + (a.texto.length > 6000 ? '\n… (o arquivo completo vai inteiro)' : '') + '</pre><div class="lab-linha"><button class="btn s" data-a="copiar">📋 Copiar</button><button class="btn s" data-a="baixar">⤓ Baixar</button><button class="btn s" data-a="nome">✏️ Renomear</button>' + (a.tipo === 'html' ? '<button class="btn s" data-a="ver">👁 Ver funcionando</button>' : '') + '</div></details>' : '').join(''); };
    pintar('');
    $('#rc-q').oninput = (ev) => pintar(ev.target.value);
    lista.addEventListener('change', (ev) => { const c = ev.target.closest('[data-ok]'); if (c) achados[c.dataset.ok].ok = c.checked; });
    lista.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-a]'); if (!b) return; const a = achados[b.closest('[data-i]').dataset.i];
      if (b.dataset.a === 'copiar') LB.copiar(a.texto);
      if (b.dataset.a === 'baixar') LB.baixar(a.caminho.split('/').pop(), a.texto);
      if (b.dataset.a === 'nome') { const n = await LB.pedir('Novo nome (pode ter pasta, ex.: juridico/ementas.md):', a.caminho); if (n && n.trim()) { a.caminho = n.trim(); pintar($('#rc-q').value); } }
      if (b.dataset.a === 'ver') { const u = URL.createObjectURL(new Blob([a.texto], { type: 'text/html' })); window.open(u, '_blank'); }
    });
    $('#rc-todos').onclick = () => { achados.forEach((a) => { a.ok = true; }); pintar($('#rc-q').value); };
    $('#rc-nenhum').onclick = () => { achados.forEach((a) => { a.ok = false; }); pintar($('#rc-q').value); };
    const marcados = () => achados.filter((a) => a.ok);
    $('#rc-proj').onclick = async () => {
      const m = marcados(); if (!m.length) return LB.aviso('Marque pelo menos um', 'erro');
      const nome = await LB.pedir('Nome do projeto:', 'recuperado · ' + origem.replace(/\.(json|csv)$/i, '')); if (!nome) return;
      const arquivos = {}; m.forEach((a) => { arquivos[a.caminho] = { t: a.texto }; });
      const p = { id: LB.novoId(), nome: nome.trim(), criado: Date.now(), origem: 'Recuperador: ' + origem, arquivos };
      await LB.banco.salvar(p); await LB.carregarProjetos(); LB.escolher(p.id);
      LB.aviso('💾 Projeto "' + p.nome + '" com ' + m.length + ' arquivo(s). Veja no 🧪 Prévia, 🔗 Mapa ou ✂️ Fatiador.', 'ok');
    };
    $('#rc-zip').onclick = async () => { const m = marcados(); if (!m.length) return LB.aviso('Marque pelo menos um', 'erro'); const z = new JSZip(); m.forEach((a) => z.file(a.caminho, a.texto)); LB.baixar(limpo(origem.replace(/\.\w+$/, '')) + '-recuperado.zip', await z.generateAsync({ type: 'blob', compression: 'DEFLATE' })); };
    $('#rc-md').onclick = () => {
      const m = marcados(); if (!m.length) return LB.aviso('Marque pelo menos um', 'erro');
      const cerca = (t) => '`'.repeat(Math.max(3, ...((t.match(/`+/g) || []).map((s) => s.length + 1))));
      const md = '# ♻️ Recuperado de ' + origem + '\n\n' + m.length + ' arquivo(s). Cada um começa com ===== ARQUIVO: caminho ===== (o ⤵ Montar do Mini SK recria os arquivos).\n\n' +
        m.map((a) => { const c = cerca(a.texto); return '===== ARQUIVO: ' + a.caminho + ' =====\n' + c + (a.tipo === 'conversa' || a.tipo === 'lista' ? 'md' : a.tipo) + '\n' + a.texto + (a.texto.endsWith('\n') ? '' : '\n') + c + '\n===== FIM: ' + a.caminho + ' =====\n'; }).join('\n');
      LB.baixar(limpo(origem.replace(/\.\w+$/, '')) + '-recuperado.md', md, 'text/markdown;charset=utf-8');
    };
  }

  window.addEventListener('lab-aba', (e) => { if (e.detail === 'recuperar') tela(); });
  LB.recuperar = { recuperar, tela, _achados: () => achados, _segredos: () => segredos };
})(window.LB);
