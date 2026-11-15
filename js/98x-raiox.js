/* Laboratório — 98x-raiox.js: 🔍 RAIO-X DE APK (e de zip de projeto)
   Abre um .apk (ou .zip/.aab) SEM instalar, olha por dentro e faz um RELATÓRIO em português:
   - que tipo de app é (Capacitor, Cordova, React Native, Flutter, site embrulhado…);
   - se ele só abre um SITE da internet (server.url) — aí "funciona sem servidor" porque usa o servidor de lá;
   - endereços de internet e rotas /api que o app chama; bibliotecas que usa;
   - COMO ELE IMPORTA arquivo (PDF.js, Tesseract/OCR, envia para o servidor…);
   - chaves que ficaram dentro (mostradas MASCARADAS).
   Botões: ⬇ relatório .md · 📋 copiar · ⬇ baixar desmontado (.zip) · ➕ abrir a parte web como projeto do Laboratório. */
(function (LB) {
  'use strict';
  const { $, esc } = LB;
  let ultimo = null; // { nome, zip, rel, web: {caminho: texto} }

  const BIBLIOTECAS = [[/pdfjs|pdf\.worker|getDocument\(/i, 'PDF.js (lê PDF no próprio aparelho)'], [/tesseract/i, 'Tesseract (OCR: lê texto de imagem/PDF escaneado no aparelho)'], [/mammoth/i, 'Mammoth (lê Word .docx)'], [/jszip/i, 'JSZip (zip)'], [/docx|Packer\.toBlob/i, 'docx (gera Word)'], [/jspdf/i, 'jsPDF (gera PDF)'], [/react(-dom)?\b|__REACT|createRoot\(/i, 'React'], [/vue\b|createApp\(/i, 'Vue'], [/@capacitor|Capacitor\./, 'Capacitor (ponte com o celular)'], [/cordova/i, 'Cordova'], [/firebase/i, 'Firebase'], [/supabase/i, 'Supabase'], [/neon\.tech|@neondatabase/i, 'Neon (banco)'], [/generativelanguage\.googleapis|@google\/genai|gemini/i, 'Gemini'], [/api\.openai\.com/i, 'OpenAI'], [/api\.groq\.com/i, 'Groq'], [/openrouter\.ai/i, 'OpenRouter'], [/anthropic/i, 'Claude/Anthropic'], [/speechSynthesis|SpeechRecognition/, 'Voz do aparelho'], [/datajud|api-publica\.datajud/i, 'DataJud (CNJ)'], [/comunicaapi\.pje|pje\.jus\.br|jus\.br/i, 'PJe / Jus.br'], [/replit\.(app|dev|co)/i, 'Replit (endereço)'], [/netlify\.app/i, 'Netlify (endereço)'], [/vercel\.app/i, 'Vercel (endereço)']];
  const IMPORTA = [[/extract-text|\/upload/i, 'manda o arquivo para o SERVIDOR ler (rota de upload/extract-text)'], [/getDocument\(|pdfjsLib/i, 'lê o PDF NO APARELHO com PDF.js'], [/tesseract|recognize\(/i, 'faz OCR NO APARELHO com Tesseract (lento em PDF grande)'], [/FileReader|readAsArrayBuffer|\.arrayBuffer\(\)/, 'abre o arquivo no aparelho (FileReader)'], [/FormData\(/, 'monta envio de arquivo (FormData)'], [/maxSize|MAX_FILE|fileSize|\b50\s*\*\s*1024\s*\*\s*1024|52428800/i, 'tem LIMITE de tamanho de arquivo no código']];
  const SEGREDOS = [/AIza[0-9A-Za-z_\-]{30,}/g, /\bsk-(?:or-v1-|proj-|ant-)?[A-Za-z0-9_\-]{20,}/g, /\bgsk_[A-Za-z0-9]{20,}/g, /\beyJ[A-Za-z0-9_\-]{15,}\.[A-Za-z0-9_\-]{15,}\.[A-Za-z0-9_\-]{10,}/g, /postgres(?:ql)?:\/\/[^\s"'`]+/g, /-----BEGIN [A-Z ]*PRIVATE KEY-----/g];
  const mascara = (s) => s.length <= 10 ? '••••' : s.slice(0, 6) + '••••' + s.slice(-3);
  const kb = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const TEXTO = /\.(html?|js|mjs|cjs|css|json|txt|md|xml|map|ts|tsx|svg|webmanifest)$/i;

  async function examinar(arquivo) {
    if (!window.JSZip) throw new Error('Sem o JSZip.');
    const zip = await JSZip.loadAsync(arquivo);
    const ents = Object.values(zip.files).filter((f) => !f.dir);
    const nomes = ents.map((f) => f.name);
    const tam = (f) => (f._data && f._data.uncompressedSize) || 0;
    const total = ents.reduce((a, f) => a + tam(f), 0);
    const tem = (re) => nomes.some((n) => re.test(n));
    let tipo = 'não reconheci (pode ser um app nativo Java/Kotlin)', raizWeb = '';
    if (tem(/^assets\/public\/index\.html$/)) { tipo = 'Capacitor — um site (HTML/JS) dentro de um app'; raizWeb = 'assets/public/'; }
    else if (tem(/^assets\/www\/index\.html$/)) { tipo = 'Cordova — um site (HTML/JS) dentro de um app'; raizWeb = 'assets/www/'; }
    else if (tem(/index\.android\.bundle$/)) tipo = 'React Native';
    else if (tem(/libflutter\.so$/)) tipo = 'Flutter';
    else if (tem(/^index\.html$/) || tem(/^[^/]+\/index\.html$/)) { tipo = 'zip de projeto/site (não é APK)'; raizWeb = nomes.find((n) => /(^|\/)index\.html$/.test(n)).replace(/index\.html$/, ''); }
    else if (tem(/^res\//) && tem(/classes\d*\.dex$/) && !tem(/^assets\//)) tipo = 'app que só abre um site (TWA/WebView) — a tela fica na internet, não no APK';
    // configurações do Capacitor/Cordova
    let config = null, configTxt = '';
    for (const c of ['assets/capacitor.config.json', 'capacitor.config.json', 'assets/www/config.xml', 'res/xml/config.xml']) if (zip.files[c]) { try { configTxt = await zip.files[c].async('string'); if (/\.json$/.test(c)) config = JSON.parse(configTxt); } catch (e) {} break; }
    // ler os textos da parte web
    const web = {}; let lidos = 0;
    for (const f of ents) {
      if (!TEXTO.test(f.name) || tam(f) > 15e6) continue;
      if (raizWeb && !f.name.startsWith(raizWeb) && !/^assets\//.test(f.name)) continue;
      if (lidos > 120e6) break;
      const t = await f.async('string'); lidos += t.length; web[f.name] = t;
    }
    const tudo = Object.entries(web).filter(([n]) => !/\.map$/.test(n)).map(([, t]) => t).join('\n');
    const urls = {}; (tudo.match(/https?:\/\/[A-Za-z0-9.\-]+(?::\d+)?(?:\/[^\s"'`)<>\\]*)?/g) || []).forEach((u) => { u = u.replace(/[.,;]+$/, ''); if (/w3\.org|reactjs\.org|schema\.org|mozilla\.org|github\.com\/[^/]+\/[^/]+\/(issues|blob)|fb\.me|tailwindcss|googleapis\.com\/css|fonts\.g|unpkg\.com|cdnjs|jsdelivr|example\.com|localhost\b/i.test(u)) return; const h = u.split('/').slice(0, 3).join('/'); urls[h] = (urls[h] || 0) + 1; });
    const rotas = [...new Set((tudo.match(/["'`]\/api\/[A-Za-z0-9_\-/:{}.]+/g) || []).map((r) => r.slice(1)))].sort();
    const libs = BIBLIOTECAS.filter(([re]) => re.test(tudo)).map(([, n]) => n);
    const importa = IMPORTA.filter(([re]) => re.test(tudo)).map(([, n]) => n);
    const segredos = []; SEGREDOS.forEach((re) => (tudo.match(re) || []).forEach((s) => { const m = mascara(s); if (!segredos.includes(m)) segredos.push(m); }));
    const limites = [...new Set((tudo.match(/(\d{1,4})\s*\*\s*1024\s*\*\s*1024/g) || []))].slice(0, 8);
    const pastas = {}; ents.forEach((f) => { const p = f.name.split('/').slice(0, f.name.startsWith('assets/') ? 2 : 1).join('/'); pastas[p] = (pastas[p] || 0) + tam(f); });
    const serverUrl = config && config.server && config.server.url;
    const r = [];
    r.push('# 🔍 Raio-X de ' + arquivo.name + ' (' + new Date().toLocaleString('pt-BR') + ')', '');
    r.push('## Resumo em português');
    r.push('- **Tipo:** ' + tipo);
    if (config) r.push('- **Nome do app:** ' + (config.appName || '?') + ' · **identificador:** ' + (config.appId || '?') + (config.webDir ? ' · pasta da tela: ' + config.webDir : ''));
    if (serverUrl) r.push('- ⚠️ **Este app NÃO usa a tela que está dentro dele: ele abre o site ' + serverUrl + '.** Ou seja, tudo (inclusive importar) roda no servidor desse endereço. Por isso ele "não dá erro de servidor": o servidor é o de lá, na internet. Se esse site sair do ar, o app para.');
    else if (raizWeb) r.push('- A tela fica **dentro** do APK, em `' + raizWeb + '`.');
    r.push('- **Arquivos:** ' + ents.length + ' · **tamanho aberto:** ' + kb(total));
    r.push('- **Como ele importa arquivo:** ' + (importa.length ? importa.join('; ') : 'não achei sinal de importação'));
    if (limites.length) r.push('- **Limites de tamanho achados no código:** ' + limites.join(', ') + ' (ex.: "50 * 1024 * 1024" = 50 MB)');
    r.push('- **Usa:** ' + (libs.length ? libs.join(', ') : '—'));
    r.push('', '## Endereços de internet que ele chama');
    const us = Object.entries(urls).sort((a, b) => b[1] - a[1]).slice(0, 40);
    r.push(us.length ? us.map(([u, n]) => '- ' + u + ' (' + n + 'x)').join('\n') : '- nenhum');
    r.push('', '## Rotas /api que a tela usa (' + rotas.length + ')');
    r.push(rotas.length ? rotas.slice(0, 120).map((x) => '- `' + x + '`').join('\n') + (rotas.length > 120 ? '\n- …' : '') : '- nenhuma');
    r.push('', '## 🔑 Chaves/senhas que ficaram dentro (mascaradas)');
    r.push(segredos.length ? segredos.map((s) => '- ' + s).join('\n') + '\n\n> ⚠️ Se alguma for sua e ainda valer, troque ela no site de origem: quem tem o APK consegue ler.' : '- nenhuma encontrada ✅');
    r.push('', '## Pastas (o que ocupa espaço)');
    r.push(Object.entries(pastas).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([p, t]) => '- ' + p + ' — ' + kb(t)).join('\n'));
    if (configTxt) r.push('', '## Configuração do app', '```', configTxt.replace(/("(?:apiKey|key|token|secret|password)"\s*:\s*")[^"]+/gi, '$1••••').slice(0, 4000), '```');
    ultimo = { nome: arquivo.name.replace(/\.(apk|aab|zip)$/i, ''), zip, rel: r.join('\n') + '\n', web, raizWeb };
    return ultimo;
  }

  function tela() {
    const el = $('#panel-raiox'); if (!el) return;
    if (!el.dataset.ok) {
      el.dataset.ok = '1';
      el.innerHTML = '<div class="card"><h2>🔍 Raio-X de APK</h2><p class="muted">Escolha um <b>.apk</b> (ou .aab, ou o .zip de um projeto). Ele <b>não instala nada</b>: só olha por dentro e te diz em português que tipo de app é, se ele usa um site da internet, que endereços chama, <b>como importa arquivo</b> e se ficou alguma chave dentro.</p>' +
        '<label class="btn p">📂 Escolher o APK<input type="file" id="rx-f" accept=".apk,.aab,.zip,application/vnd.android.package-archive,application/zip" hidden></label>' +
        '<p class="muted" style="margin-top:6px">Dica: se o celular não deixar escolher .apk, faça uma cópia e troque o final para <b>.zip</b>.</p></div><div id="rx-saida"></div>';
      $('#rx-f').onchange = async (e) => {
        const f = e.target.files[0]; e.target.value = ''; if (!f) return;
        const s = $('#rx-saida'); s.innerHTML = '<div class="card"><p class="muted">⏳ Abrindo ' + esc(f.name) + '…</p></div>';
        try { const u = await examinar(f); mostrar(u); } catch (er) { s.innerHTML = '<div class="card"><p style="color:#ef4444">⚠ Não consegui abrir: ' + esc(er.message) + '</p></div>'; }
      };
      el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-rx]'); if (!b || !ultimo) return;
        const a = b.dataset.rx;
        if (a === 'md') LB.baixar('raio-x-' + ultimo.nome + '.md', ultimo.rel, 'text/markdown');
        if (a === 'copiar') LB.copiar(ultimo.rel);
        if (a === 'zip') { b.disabled = true; b.textContent = '⏳ montando…'; const blob = await ultimo.zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }); LB.baixar(ultimo.nome + '-desmontado.zip', blob, 'application/zip'); b.disabled = false; b.textContent = '⬇ Baixar desmontado (.zip)'; }
        if (a === 'projeto') {
          const arquivos = {}; Object.entries(ultimo.web).forEach(([k, t]) => { if (/\.map$/.test(k)) return; arquivos[ultimo.raizWeb && k.startsWith(ultimo.raizWeb) ? k.slice(ultimo.raizWeb.length) : k] = { t }; });
          arquivos['RAIO-X.md'] = { t: ultimo.rel };
          const p = { id: LB.novoId(), nome: '📱 ' + ultimo.nome, criado: Date.now(), origem: 'raio-x', arquivos };
          await LB.banco.salvar(p); await LB.carregarProjetos(); LB.escolher(p.id); LB.aviso('✅ Abri a parte web como projeto "' + p.nome + '". Veja no 🔗 Mapa ou na 🧪 Prévia.', 'ok');
        }
        if (a === 'ia') { LB.irAba('ia'); setTimeout(() => LB.ia.colar('🔍 Raio-X de um APK', ultimo.rel + '\n\nMe explique em português simples o que este app faz, como ele importa arquivos e o que dá para aproveitar no meu jurídico. Termine com 📋 Situação.'), 80); }
      });
    }
  }
  function mostrar(u) {
    const s = $('#rx-saida');
    s.innerHTML = '<div class="card"><div class="linha" style="flex-wrap:wrap"><button class="btn p" data-rx="md">⬇ Relatório (.md)</button><button class="btn" data-rx="copiar">📋 Copiar relatório</button><button class="btn" data-rx="zip">⬇ Baixar desmontado (.zip)</button><button class="btn" data-rx="projeto">➕ Abrir a parte web como projeto</button><button class="btn" data-rx="ia">🤖 Perguntar à IA</button></div>' +
      '<pre style="white-space:pre-wrap;max-height:70vh;overflow:auto;margin-top:8px">' + esc(u.rel) + '</pre></div>';
  }
  window.addEventListener('lab-aba', (e) => { if (e.detail === 'raiox') tela(); });
  LB.raiox = { examinar, tela, _ultimo: () => ultimo };
})(window.LB);
