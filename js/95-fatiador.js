/* Laboratório — 95-fatiador.js: ✂️ FATIADOR INTELIGENTE
   Pega um arquivo grande (HTML, JS, TS, TSX, JSX, CSS, Python, MD) e corta em FATIAS do tamanho que você escolher
   (50 a 500 linhas), SEM cortar no meio de uma função: ele só corta entre um bloco e outro
   (a leitura dos blocos é a mesma do Fatiador do Mini SK, que sabe pular textos, comentários e regex).
   - Cada fatia vem com o CONTEXTO (projeto, nº, linhas, o que tem dentro, de quais outras fatias ela usa coisas)
     e uma 📝 anotação sua.
   - 🤖 Prompt para a IA: escolhe a fatia e o que quer (explicar, corrigir, melhorar, tirar a Replit…).
   - Exporta em .md (não .txt): todas as fatias, relatório/índice, página .html para ver e copiar, .zip,
     e guarda como projeto do Laboratório.
   - 🔁 Juntar de volta: abre o .md das fatias e devolve o arquivo original, letra por letra. */
(function (LB) {
  'use strict';
  // ── Leitura do código (sabe pular textos, comentários e regex) ─────────────
  /** Para cada linha: profundidade de { ( [ no começo da linha e se começa "dentro" de algo. */
  function lineStates(text, lang) {
    const n = text.length; const st = [{ d: 0, inside: false }];
    let d = 0; const stack = []; let mode = 'code'; let prevSig = '';
    const isPy = lang === 'py', isCss = lang === 'css';
    for (let i = 0; i < n; i++) {
      const c = text[i], nx = text[i + 1];
      if (c === '\n') {
        if (mode === 'lc') mode = 'code';
        if ((mode === 'sq' || mode === 'dq') && !isPy) mode = 'code';
        st.push({ d, inside: mode !== 'code' || stack.length > 0 });
        continue;
      }
      if (mode === 'lc') continue;
      if (mode === 'bc') { if (c === '*' && nx === '/') { mode = 'code'; i++; } continue; }
      if (mode === 'sq' || mode === 'dq') { if (c === '\\') { i++; continue; } if ((mode === 'sq' && c === "'") || (mode === 'dq' && c === '"')) mode = 'code'; continue; }
      if (mode === 'tq') { if (c === '\\') { i++; continue; } if (text.startsWith(stack[stack.length - 1].q, i)) { i += 2; stack.pop(); mode = 'code'; } continue; }
      if (mode === 're') { if (c === '\\') { i++; continue; } if (c === '[') mode = 'rec'; else if (c === '/') mode = 'code'; continue; }
      if (mode === 'rec') { if (c === '\\') { i++; continue; } if (c === ']') mode = 're'; continue; }
      if (mode === 'tpl') {
        if (c === '\\') { i++; continue; }
        if (c === '`') { stack.pop(); mode = stack.length && stack[stack.length - 1].t === 'tpl' ? 'tpl' : 'code'; continue; }
        if (c === '$' && nx === '{') { stack.push({ t: 'expr', d }); mode = 'code'; i++; continue; }
        continue;
      }
      // code
      if (c === ' ' || c === '\t' || c === '\r') continue;
      if (isPy && c === '#') { mode = 'lc'; continue; }
      if (!isPy && c === '/' && nx === '/' && !isCss) { mode = 'lc'; continue; }
      if (!isPy && c === '/' && nx === '*') { mode = 'bc'; i++; continue; }
      if (isPy && (text.startsWith('"""', i) || text.startsWith("'''", i))) { stack.push({ t: 'tq', q: text.substr(i, 3) }); mode = 'tq'; i += 2; continue; }
      if (c === "'") { mode = 'sq'; prevSig = c; continue; }
      if (c === '"') { mode = 'dq'; prevSig = c; continue; }
      if (c === '`' && !isPy && !isCss) { stack.push({ t: 'tpl' }); mode = 'tpl'; prevSig = c; continue; }
      if (c === '/' && !isPy && !isCss) {
        const before = text.slice(Math.max(0, i - 12), i).trimEnd();
        const tsBang = prevSig === '!' && /[\w$)\]]!\s*$/.test(before); // x! / y  (TypeScript)
        if (!tsBang && (!prevSig || /[(,=:[!&|?{;+\-*%~^]$/.test(prevSig) || (prevSig === '>' && /=>\s*$/.test(before)) || /\b(return|typeof|case|else|in|of|void|delete|throw)$/.test(before))) { mode = 're'; continue; }
      }
      if (c === '}' && stack.length && stack[stack.length - 1].t === 'expr' && d === stack[stack.length - 1].d) { stack.pop(); mode = 'tpl'; prevSig = c; continue; }
      if (c === '{' || c === '(' || c === '[') d++;
      else if (c === '}' || c === ')' || c === ']') d = Math.max(0, d - 1);
      prevSig = c;
    }
    return st;
  }

  // ── Divisores por tipo (todos devolvem faixas de linhas que cobrem TUDO) ──
  const JS_START = /^(export\s+(default\s+)?)?(declare\s+)?(abstract\s+)?(async\s+)?(function\*?[\s(]|class\s|const\s|let\s|var\s|interface\s|type\s+[\w$]+|enum\s|namespace\s)/;
  const JS_OTHER = /^(return\s*\(?\s*$|return\s*\(?\s*<|import[\s{*'"]|export\s*(\{|\*)|export\s+default\b|module\.exports|exports\.|['"]use strict['"]|(?!(if|for|while|switch|catch|return|else|do|try|await|typeof|new|super|throw|yield|delete|void)\b)[A-Za-z_$][\w$]*(\.[\w$]+)*\s*\(|\(\s*(async\s*)?(function|\(|[\w$]+\s*=>)|;?\(function|!function)/;
  function nameOfJs(line, isTsx) {
    const t = line.trim(); let m;
    if (/^import\b/.test(t)) return ['imports', 'imports'];
    if (/^return\b/.test(t)) return ['tela (o que aparece — JSX)', 'tela'];
    if ((m = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\*?\s*([\w$]*)/.exec(t))) { const nm = m[1] || 'default'; return [nm, /^[A-Z]/.test(nm) && isTsx ? 'componente' : 'função']; }
    if ((m = /^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([\w$]+)/.exec(t))) return [m[1], 'classe'];
    if ((m = /^(?:export\s+)?(?:declare\s+)?(?:interface|type|enum)\s+([\w$]+)/.exec(t))) return [m[1], 'tipo'];
    if ((m = /^(?:export\s+)?(?:declare\s+)?(?:const|let|var)\s+(?:\{([^}]*)\}|\[([^\]]*)\]|([\w$]+))/.exec(t))) {
      const nm = (m[3] || (m[1] || m[2] || '').split(',').map((x) => x.split(':').pop().trim()).filter(Boolean).slice(0, 3).join(', ')) || '?';
      const isFn = /=\s*(async\s*)?(\([^)]*\)|[\w$]+)\s*(:\s*[^=]+)?=>|=\s*(async\s+)?function/.test(t) || /=\s*(React\.)?(memo|forwardRef|lazy)\(/.test(t);
      return [nm, isFn ? (/^[A-Z]/.test(nm) && isTsx ? 'componente' : 'função') : 'constante'];
    }
    if (/^export\s+default\b/.test(t)) return ['export default', 'exportação'];
    if (/^export\s*\{|^module\.exports|^exports\./.test(t)) return ['exportações', 'exportação'];
    if (/^['"]use strict['"]/.test(t)) return ['use strict', 'outro'];
    if ((m = /^([A-Za-z_$][\w$.]*)\s*\(/.exec(t))) return [m[1] + '(…)', 'chamada'];
    if (/^;?\(|^!function/.test(t)) return ['função imediata (IIFE)', 'código'];
    return [t.slice(0, 40), 'código'];
  }
  function splitByStarts(lines, starts, nameFn) {
    const set = [...new Set(starts)].sort((a, b) => a - b);
    if (!set.length || set[0] !== 0) set.unshift(0);
    const blocks = [];
    set.forEach((s, k) => {
      const e = k + 1 < set.length ? set[k + 1] : lines.length;
      if (e > s) blocks.push({ a: s, b: e });
    });
    blocks.forEach((bl) => { const first = lines.slice(bl.a, bl.b).find((l) => l.trim() && !/^\s*(\/\/|\/\*|\*|#|<!--)/.test(l)) || lines[bl.a] || ''; const [nm, kind] = nameFn(first, bl, lines[bl.a] || ''); bl.name = nm; bl.kind = kind; });
    return blocks;
  }
  /** Volta o começo do bloco para incluir os comentários logo acima dele. */
  function pullComments(lines, starts, states, base, commentRe) {
    return starts.map((s) => {
      let k = s;
      while (k > 0 && states[k - 1].d === base && !states[k - 1].inside && commentRe.test(lines[k - 1]) && !starts.includes(k - 1)) k--;
      return k;
    });
  }
  function splitJs(text, lang, forceBase) {
    const lines = text.split('\n');
    const isTsx = /tsx|jsx/.test(lang);
    const states = lineStates(text, 'js');
    const tryBase = (base) => {
      const starts = [];
      lines.forEach((l, i) => {
        const s = states[i]; if (s.inside || s.d !== base) return;
        const t = l.trim(); if (!t) return;
        if (JS_START.test(t) || JS_OTHER.test(t)) starts.push(i);
      });
      return pullComments(lines, starts, states, base, /^\s*(\/\/|\/\*|\*|\*\/)/);
    };
    let starts = forceBase ? [0].concat(tryBase(forceBase)) : tryBase(0);
    // arquivo todo dentro de um "invólucro" (ex.: (function (SK) { … })(…)): divide por dentro
    if (!forceBase && starts.length < 4 && lines.length > 60) {
      for (const base of [1, 2, 3]) {
        const inner = tryBase(base);
        const decls = inner.filter((i) => JS_START.test((lines.slice(i).find((l) => l.trim() && !/^\s*(\/\/|\/\*|\*)/.test(l)) || '').trim())).length;
        if (decls >= 3) { starts = [0].concat(inner); break; }
      }
    }
    let blocks = splitByStarts(lines, starts, (first) => nameOfJs(first, isTsx));
    // junta imports seguidos (e "use strict") num bloco só; e linhas curtas seguidas (ex.: vários useState) num grupo
    const merged = [];
    for (const b of blocks) {
      const last = merged[merged.length - 1];
      if (last && last.kind === 'imports' && (b.kind === 'imports' || !lines.slice(b.a, b.b).join('').trim())) { last.b = b.b; continue; }
      const short = (x) => x.b - x.a <= 2 && /constante|chamada/.test(x.kind);
      if (last && short(b) && (short(last) || last.grupo)) { if (!last.grupo) { last.grupo = [last.name]; last.kind = 'grupo'; } last.grupo.push(b.name); last.name = last.grupo.slice(0, 4).join(', ') + (last.grupo.length > 4 ? ' … (+' + (last.grupo.length - 4) + ')' : ''); last.b = b.b; continue; }
      merged.push(b);
    }
    return merged;
  }
  function splitCss(text) {
    const lines = text.split('\n'); const states = lineStates(text, 'css');
    const starts = []; let since = 0;
    lines.forEach((l, i) => {
      const s = states[i]; if (s.inside || s.d !== 0) return; const t = l.trim(); if (!t) return;
      if (/^\/\*/.test(t) && (i === 0 || !lines[i - 1].trim() || /^\/\*.*(=|─|—|-{3}|\*{3})/.test(t))) { starts.push(i); since = i; return; }
      if (/^@(media|keyframes|font-face|supports|layer|container)\b|^:root\b/.test(t)) { starts.push(i); since = i; return; }
      if (i - since > 40 && /[{,]\s*$/.test(t)) { starts.push(i); since = i; }
    });
    return splitByStarts(lines, starts, (first, bl, head) => {
      const h = head.trim(); const hm = /^\/\*+\s*[=─—\-*]*\s*(.*?)\s*[=─—\-*]*\s*(\*\/)?$/.exec(h);
      if (/^\/\*/.test(h) && hm && hm[1]) return [hm[1].slice(0, 50), 'seção'];
      const t = first.trim(); const m = /^\/\*+\s*[=─—\-*]*\s*(.*?)\s*[=─—\-*]*\s*\*\/$/.exec(t);
      if (m && m[1]) return [m[1].slice(0, 50), 'seção'];
      if (/^@/.test(t)) return [t.replace(/\s*\{.*$/, '').slice(0, 50), 'regra @'];
      return [t.replace(/\s*\{.*$/, '').slice(0, 50), 'estilos'];
    });
  }
  function splitPy(text) {
    const lines = text.split('\n'); const states = lineStates(text, 'py');
    const starts = [];
    lines.forEach((l, i) => {
      if (states[i].inside || states[i].d !== 0) return;
      if (/^(def |async def |class |@|if __name__)/.test(l)) { if (/^@/.test(l) && i > 0 && /^@/.test(lines[i - 1])) return; starts.push(i); }
      else if (/^(import |from )/.test(l) && !(i > 0 && /^(import |from )/.test(lines[i - 1]))) starts.push(i);
    });
    const st2 = pullComments(lines, starts, states, 0, /^#/);
    return splitByStarts(lines, st2, (first) => {
      let m; const t = first.trim();
      if (/^(import|from) /.test(t)) return ['imports', 'imports'];
      if ((m = /^(?:async\s+)?def\s+(\w+)/.exec(t))) return [m[1], 'função'];
      if ((m = /^class\s+(\w+)/.exec(t))) return [m[1], 'classe'];
      if (/^@/.test(t)) { const nx = (/(?:def|class)\s+(\w+)/.exec(lines.slice(lines.indexOf(first)).join('\n')) || [])[1]; return [nx || t, 'função']; }
      if (/^if __name__/.test(t)) return ['principal (__main__)', 'código'];
      return [t.slice(0, 40), 'código'];
    });
  }
  function splitMd(text) {
    const lines = text.split('\n'); const starts = []; let inFence = false;
    lines.forEach((l, i) => { if (/^\s*(```|~~~)/.test(l)) inFence = !inFence; if (!inFence && /^#{1,3}\s/.test(l)) starts.push(i); });
    return splitByStarts(lines, starts, (first) => [first.replace(/^#+\s*/, '').slice(0, 60) || '(início)', 'seção']);
  }
  function splitPlain(text) {
    const lines = text.split('\n'); const starts = []; let since = 0;
    lines.forEach((l, i) => { if (i - since >= 80 && !l.trim()) { starts.push(i + 1); since = i; } });
    return splitByStarts(lines, starts.filter((s) => s < lines.length), (first) => [first.trim().slice(0, 40) || '(trecho)', 'trecho']);
  }
  function splitHtml(text) {
    const lines = text.split('\n'); const out = [];
    let i = 0; let seg = { a: 0, kind: 'html' };
    const push = (b, kind, name) => { if (b > seg.a) out.push({ a: seg.a, b, kind: seg.kind, name: seg.name }); seg = { a: b, kind, name }; };
    let sc = 0, stc = 0;
    while (i < lines.length) {
      const t = lines[i].trim();
      if (/^<style\b/i.test(t) && !/<\/style>/i.test(t)) {
        push(i, 'html'); stc++;
        let j = i + 1; while (j < lines.length && !/<\/style>/i.test(lines[j])) j++;
        out.push({ a: i, b: i + 1, kind: 'tag', name: '<style> ' + stc });
        const inner = lines.slice(i + 1, j).join('\n');
        if (j > i + 1) splitCss(inner).forEach((bl) => out.push({ a: i + 1 + bl.a, b: i + 1 + bl.b, kind: bl.kind, name: 'CSS › ' + bl.name, lang: 'css' }));
        seg = { a: j, kind: 'html' }; i = j; continue;
      }
      if (/^<script\b/i.test(t) && !/<\/script>/i.test(t)) {
        push(i, 'html'); sc++;
        let j = i + 1; while (j < lines.length && !/<\/script>/i.test(lines[j])) j++;
        const isMod = /type=["']?module/i.test(t);
        out.push({ a: i, b: i + 1, kind: 'tag', name: '<script> ' + sc + (isMod ? ' (módulo)' : '') });
        const inner = lines.slice(i + 1, j).join('\n');
        if (j > i + 1) splitJs(inner, 'js').forEach((bl) => out.push({ a: i + 1 + bl.a, b: i + 1 + bl.b, kind: bl.kind, name: 'JS › ' + bl.name, lang: 'js' }));
        seg = { a: j, kind: 'html' }; i = j; continue;
      }
      if (/^<head\b/i.test(t)) push(i, 'html', 'cabeçalho (head)');
      else if (/^<body\b/i.test(t)) push(i, 'html', 'corpo (body)');
      else if (/^<!--/.test(t) && i > seg.a) push(i, 'html', t.replace(/^<!--\s*|\s*-->.*$/g, '').slice(0, 50));
      i++;
    }
    push(lines.length, 'html');
    return out.filter((b) => b.b > b.a).map((b) => Object.assign(b, { name: b.name || (lines[b.a] || '').trim().slice(0, 40) || 'html', lang: b.lang || 'html' }));
  }
  function langOf(name, text) {
    const e = (name.split('.').pop() || '').toLowerCase();
    if (/^(tsx|jsx)$/.test(e)) return e; if (/^(ts|mts|cts)$/.test(e)) return 'ts'; if (/^(js|mjs|cjs)$/.test(e)) return 'js';
    if (/^(html?|vue|svelte)$/.test(e)) return 'html'; if (/^(css|scss|less)$/.test(e)) return 'css'; if (e === 'py') return 'py'; if (/^(md|markdown)$/.test(e)) return 'md';
    if (/^\s*<(!doctype|html|head|body|div)/i.test(text)) return 'html';
    if (/^\s*(import|export|const|function|let|var)\b/m.test(text)) return 'js';
    return 'txt';
  }
  function slice(name, text) {
    text = text.replace(/\r\n/g, '\n');
    const lang = langOf(name, text);
    let blocks;
    if (lang === 'html') blocks = splitHtml(text);
    else if (/^(js|ts|tsx|jsx)$/.test(lang)) blocks = splitJs(text, lang);
    else if (lang === 'css') blocks = splitCss(text);
    else if (lang === 'py') blocks = splitPy(text);
    else if (lang === 'md') blocks = splitMd(text);
    else blocks = splitPlain(text);
    const lines = text.split('\n');
    // dependências entre blocos (JS/TS)
    const named = blocks.filter((b) => /função|componente|classe|constante|tipo/.test(b.kind));
    blocks.forEach((b, k) => {
      b.n = k + 1; b.text = lines.slice(b.a, b.b).join('\n'); b.lang = b.lang || lang;
      b.uses = [];
    });
    named.forEach((dep) => {
      const ids = dep.name.split(/,\s*/).filter((x) => /^[A-Za-z_$][\w$]*$/.test(x));
      if (!ids.length) return;
      const re = new RegExp('(^|[^\\w$.])(' + ids.map((x) => x.replace(/\$/g, '\\$')).join('|') + ')(?![\\w$])');
      blocks.forEach((b) => { if (b !== dep && b.kind !== 'tag' && re.test(b.text.replace(/\/\/.*$/gm, ''))) b.uses.push(dep.n); });
    });
    blocks.forEach((b) => { b.usedBy = blocks.filter((o) => o.uses.includes(b.n)).map((o) => o.n); });
    return { name, text, lang, lines: lines.length, blocks };
  }
  const rejoin = (blocks) => blocks.map((b) => b.text).join('\n');


  // ── Fatias: junta os blocos até o tamanho escolhido, sem partir nenhum ─────
  const NOMES_LANG = { html: '🌐 HTML', css: '🎨 CSS', js: '📜 JS', ts: '📘 TS', tsx: '⚛️ TSX', jsx: '⚛️ JSX', py: '🐍 Python', md: '📝 MD', txt: '📄 Texto' };
  const CERCA_LANG = { js: 'js', ts: 'ts', tsx: 'tsx', jsx: 'jsx', html: 'html', css: 'css', py: 'python', md: 'md' };
  const cerca = (t) => '`'.repeat(Math.max(3, ...((String(t).match(/`+/g) || []).map((s) => s.length + 1))));
  const genericos = /^(tag|html)$/;

  /** Divide um bloco grande por dentro (o corpo de um invólucro, de um componente…). Devolve blocos com a/b absolutos ou null. */
  function porDentro(lines, bl, lang) {
    if (!/^(js|ts|tsx|jsx)$/.test(bl.lang || lang)) return null;
    const txt = lines.slice(bl.a, bl.b).join('\n');
    for (const base of [1, 2, 3]) {
      let inner; try { inner = splitJs(txt, bl.lang || lang, base); } catch (e) { return null; }
      if (inner.length >= 3) return inner.map((x) => ({ a: bl.a + x.a, b: bl.a + x.b, kind: x.kind, name: (bl.name ? bl.name + ' › ' : '') + x.name, lang: bl.lang || lang, n: bl.n }));
    }
    return null;
  }

  function fatiar(nome, texto, max, modo, dentro) {
    const r = slice(nome, texto); const lines = r.text.split('\n');
    const fatias = [];
    const nova = (a) => ({ a, b: a, blocos: [] });
    if (modo === 'fixo') {
      const inicios = new Set(r.blocks.map((b) => b.a));
      for (let a = 0; a < lines.length; a += max) {
        const f = nova(a); f.b = Math.min(lines.length, a + max);
        f.blocos = r.blocks.filter((b) => b.b > f.a && b.a < f.b);
        f.cortou = f.b < lines.length && !inicios.has(f.b);
        fatias.push(f);
      }
    } else {
      // lista "plana" de pedaços que não podem ser partidos (blocos; os grandes demais são abertos por dentro)
      const pecas = [];
      const abrir = (b, nivel) => {
        if (b.b - b.a > max && nivel < 4) { const d = porDentro(lines, b, r.lang); if (d && d.length > 1) { d.forEach((x) => abrir(Object.assign(x, { pai: b.pai || b.n, n: b.n }), nivel + 1)); return; } }
        if (b.b - b.a > max && dentro) { cortarPorDentro(b).forEach((x) => pecas.push(x)); return; }
        pecas.push(b);
      };
      let estados = null;
      const cortarPorDentro = (b) => {
        // peça grande demais (uma função só): corta nas linhas mais "rasas" (linha em branco, <tag>, comentário), avisando
        if (!estados) estados = /^(js|ts|tsx|jsx)$/.test(r.lang) ? lineStates(r.text, 'js') : null;
        const out = []; let s = b.a, k = 1;
        while (b.b - s > max) {
          let melhor = -1, nota = -1e9;
          for (let i = s + Math.ceil(max / 2); i <= s + max && i < b.b; i++) {
            const st = estados ? estados[i] : { d: 0, inside: false }; if (st.inside && estados && st.d === undefined) continue;
            const t = lines[i].trim(); const ant = (lines[i - 1] || '').trim();
            let n = -(st.d || 0) * 10 + (i - s) / max;
            if (!t) n += 6; else if (/^(<[A-Za-z{]|\{\/\*|\/\/|\/\*|\})/.test(t)) n += 4; if (!ant) n += 3; if (/[>;})\]]\s*$/.test(ant)) n += 2;
            if (n > nota) { nota = n; melhor = i; }
          }
          if (melhor <= s) melhor = s + max;
          out.push({ a: s, b: melhor, kind: b.kind, name: b.name + ' (parte ' + k + ')', lang: b.lang, n: b.n, pai: b.pai, partida: true });
          s = melhor; k++;
        }
        out.push({ a: s, b: b.b, kind: b.kind, name: b.name + ' (parte ' + k + ')', lang: b.lang, n: b.n, pai: b.pai, partida: true });
        return out;
      };
      for (const b of r.blocks) abrir(b, 0);
      let f = nova(0);
      for (const p of pecas) {
        const tam = p.b - p.a;
        if (f.b > f.a && (f.b - f.a) + tam > max) { fatias.push(f); f = nova(p.a); }
        f.blocos.push(p); f.b = p.b;
        if (tam > max) { f.grande = true; }
        if (p.partida) f.partida = true;
      }
      if (f.b > f.a || !fatias.length) fatias.push(f);
    }
    // costura: garante que cobre tudo, sem buraco nem sobra
    fatias.forEach((f, i) => { f.a = i ? fatias[i - 1].b : 0; });
    fatias[fatias.length - 1].b = lines.length;
    const blocoFatia = {};
    fatias.forEach((f, i) => {
      f.n = i + 1; f.text = lines.slice(f.a, f.b).join('\n'); f.nota = '';
      f.langs = [...new Set(f.blocos.map((b) => b.lang || r.lang))];
      const nomes = f.blocos.filter((b) => !genericos.test(b.kind)).map((b) => b.name.replace(/^(JS|CSS) › /, ''));
      f.nomes = nomes;
      f.titulo = nomes.length ? nomes.slice(0, 3).join(', ') + (nomes.length > 3 ? ' +' + (nomes.length - 3) : '') : 'Bloco ' + f.n;
      f.blocos.forEach((b) => { if (blocoFatia[b.n] == null) blocoFatia[b.n] = f.n; });
    });
    fatias.forEach((f) => {
      const usa = new Set();
      f.blocos.forEach((b) => (r.blocks[b.n - 1] ? r.blocks[b.n - 1].uses : []).forEach((u) => { const k = blocoFatia[u]; if (k && k !== f.n) usa.add(k); }));
      f.usa = [...usa].sort((x, y) => x - y);
    });
    fatias.forEach((f) => { f.usadaPor = fatias.filter((o) => o.usa.includes(f.n)).map((o) => o.n); });
    const ok = fatias.map((f) => f.text).join('\n') === r.text;
    return { nome, lang: r.lang, texto: r.text, linhas: lines.length, max, modo, dentro: !!dentro, fatias, ok, crlf: /\r\n/.test(texto) };
  }

  // ── Textos para a IA e para baixar ─────────────────────────────────────────
  let R = null, projNome = '';
  const tipoDe = (f) => f.langs.map((l) => NOMES_LANG[l] || l).join(' + ');
  function contexto(f) {
    const L = ['📌 CONTEXTO PARA A IA', 'Projeto: ' + (projNome || '—') + ' · arquivo: ' + R.nome, 'Fatia ' + f.n + ' de ' + R.fatias.length + ' · linhas ' + (f.a + 1) + ' até ' + f.b + ' (de ' + R.linhas + ') · tipo: ' + tipoDe(f)];
    if (f.nomes.length) L.push('Tem dentro: ' + f.nomes.slice(0, 25).join(', ') + (f.nomes.length > 25 ? '…' : ''));
    if (f.usa.length) L.push('Usa coisas das fatias: ' + f.usa.join(', '));
    if (f.usadaPor.length) L.push('É usada pelas fatias: ' + f.usadaPor.join(', '));
    if (f.grande) L.push('Atenção: é uma peça só maior que o tamanho escolhido (não dava para cortar sem partir uma função).');
    if (f.partida) L.push('Atenção: esta fatia tem um PEDAÇO de uma função grande (cortei por dentro, numa linha segura); o resto dela está na fatia vizinha.');
    if (f.cortou) L.push('Atenção: corte FIXO — esta fatia pode terminar no meio de uma função; a continuação está na fatia ' + (f.n + 1) + '.');
    if (f.nota.trim()) L.push('📝 Anotação: ' + f.nota.trim());
    return L.join('\n');
  }
  const blocoCodigo = (f) => { const c = cerca(f.text); return c + (CERCA_LANG[R.lang] || '') + '\n' + f.text + '\n' + c; };
  const comContexto = (f) => contexto(f) + '\n\n' + blocoCodigo(f);
  const PEDIDOS = {
    explicar: 'Explique, em português simples e sem termos difíceis, o que esta fatia faz: cada função em 1 ou 2 linhas, e como ela se liga com o resto.',
    bugs: 'Procure erros nesta fatia. Para cada erro: a linha, o que acontece e por quê. Depois me devolva a FATIA INTEIRA já corrigida (não me diga "troque este pedaço por aquele").',
    melhorar: 'Sugira melhorias nesta fatia sem mudar o que ela faz (sem tirar nada que funciona). Depois me devolva a FATIA INTEIRA já melhorada.',
    replit: 'Ache nesta fatia tudo que depende da Replit (variáveis REPL_, @replit/…, caminhos /home/runner, banco da Replit, login da Replit) e me devolva a FATIA INTEIRA funcionando sem a Replit.',
  };
  function prompt(f, qual, livre) {
    const pedido = qual === 'livre' ? (livre || '(escreva o que você quer)') : PEDIDOS[qual];
    return 'Estou te mandando UMA FATIA de um arquivo grande que eu cortei em ' + R.fatias.length + ' pedaços, sem partir as funções. Não reescreva as outras fatias — trabalhe só nesta.\n\n' +
      comContexto(f) + '\n\nO QUE EU QUERO:\n' + pedido + '\n\nNão invente funções que não estão aqui; se precisar de algo de outra fatia, me diga qual.';
  }
  const slug = (s) => String(s || 'fatia').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'fatia';
  const base = () => R.nome.replace(/\.[^.]+$/, '');
  const pad = (n) => String(n).padStart(String(R.fatias.length).length < 2 ? 2 : String(R.fatias.length).length, '0');
  function fatiaMD(f) {
    return '<!-- fatia ' + f.n + '/' + R.fatias.length + ' -->\n### ' + f.n + '. ' + f.titulo + '\n\n' + contexto(f).split('\n').map((l) => '> ' + l).join('  \n') + '\n\n' + blocoCodigo(f) + '\n<!-- fim da fatia ' + f.n + ' -->\n';
  }
  function todasMD() {
    return '<!-- fatiador: ' + JSON.stringify({ arquivo: R.nome, linhas: R.linhas, fatias: R.fatias.length }) + ' -->\n# ✂️ ' + R.nome + ' — ' + R.fatias.length + ' fatias\n\n' +
      'Projeto: ' + (projNome || '—') + ' · ' + R.linhas + ' linhas · até ' + R.max + ' linhas por fatia · modo ' + (R.modo === 'fixo' ? 'fixo' : 'inteligente (não corta função)') + '\n\n' +
      '_Para voltar ao arquivo original: Laboratório → ✂️ Fatiador → 🔁 Juntar de volta → abra este .md._\n\n' + indiceMD() + '\n---\n\n' + R.fatias.map(fatiaMD).join('\n');
  }
  function indiceMD() {
    const L = ['## Índice', '', '| Nº | Linhas | Tipo | O que tem | Usa | Anotação |', '|---|---|---|---|---|---|'];
    R.fatias.forEach((f) => L.push('| ' + f.n + ' | ' + (f.a + 1) + '–' + f.b + ' | ' + tipoDe(f) + ' | ' + (f.nomes.join(', ') || '—').replace(/\|/g, '\\|').slice(0, 300) + ' | ' + (f.usa.join(', ') || '—') + ' | ' + (f.nota.replace(/\n/g, ' ').replace(/\|/g, '\\|') || '') + ' |'));
    return L.join('\n') + '\n';
  }
  function relatorioMD() {
    const grandes = R.fatias.filter((f) => f.grande), cortes = R.fatias.filter((f) => f.cortou);
    const idx = []; R.fatias.forEach((f) => f.nomes.forEach((n) => idx.push([n, f.n])));
    idx.sort((a, b) => a[0].localeCompare(b[0]));
    return '# 📋 Relatório do Fatiador — ' + R.nome + '\n\n' +
      '- Projeto: ' + (projNome || '—') + '\n- Linhas: ' + R.linhas + '\n- Fatias: ' + R.fatias.length + ' (até ' + R.max + ' linhas cada, modo ' + (R.modo === 'fixo' ? 'fixo' : 'inteligente') + ')\n' +
      '- Conferência: ' + (R.ok ? '✅ juntando as fatias dá o arquivo original, letra por letra' : '⚠ as fatias NÃO reconstroem o original') + '\n' +
      (grandes.length ? '- Peças maiores que o tamanho (uma função só, não cortei): fatias ' + grandes.map((f) => f.n).join(', ') + '\n' : '') +
      (cortes.length ? '- Corte fixo no meio de função: fatias ' + cortes.map((f) => f.n).join(', ') + '\n' : '') +
      '\n' + indiceMD() + '\n## 🔎 Onde está cada coisa (A–Z)\n\n' + (idx.map(([n, k]) => '- `' + n.replace(/`/g, "'") + '` → fatia ' + k).join('\n') || '_(nenhum nome encontrado)_') + '\n';
  }
  function paginaHTML() {
    const dados = JSON.stringify({ nome: R.nome, projeto: projNome, fatias: R.fatias.map((f) => ({ n: f.n, a: f.a + 1, b: f.b, t: f.titulo, tipo: tipoDe(f), nomes: f.nomes, ctx: contexto(f), txt: f.text })) }).replace(/</g, '\\u003c');
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fatias de ' + LB.esc(R.nome) + '</title><style>' +
      ':root{color-scheme:dark}body{margin:0;background:#0f172a;color:#e6edf8;font:15px/1.5 system-ui,sans-serif}header{position:sticky;top:0;background:#16213a;padding:10px 14px;border-bottom:1px solid #2b3a5c;z-index:2}h1{font-size:17px;margin:0 0 8px}' +
      'input{width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:1px solid #2b3a5c;background:#0f172a;color:inherit;font:inherit}.linha{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}' +
      'button{background:#3b82f6;color:#fff;border:0;border-radius:9px;padding:8px 12px;font:inherit;cursor:pointer;min-height:40px}button.s{background:#1e2b48}details{margin:10px 14px;border:1px solid #2b3a5c;border-radius:12px;background:#16213a}' +
      'summary{padding:10px 12px;cursor:pointer}summary small{color:#9fb0cc}.ctx{white-space:pre-wrap;background:#0d2a1d;color:#a7f3d0;border-radius:8px;padding:8px 10px;margin:0 12px;font-size:13px}pre{margin:8px 12px;padding:10px;overflow:auto;max-height:65vh;font:12px/1.45 ui-monospace,Consolas,monospace;background:#0b0f18;border-radius:8px;white-space:pre}.bt{display:flex;gap:6px;flex-wrap:wrap;padding:0 12px 12px}</style></head><body>' +
      '<header><h1>✂️ ' + LB.esc(R.nome) + ' — ' + R.fatias.length + ' fatias</h1><input id="q" placeholder="🔎 Procurar função, nome ou texto…"><div class="linha"><button id="orig">⤓ Baixar o arquivo original (juntado)</button><button class="s" id="abrir">Abrir todas</button></div></header><main id="m"></main>' +
      '<script type="application/json" id="dados">' + dados + '<\/script><script>' +
      'var D=JSON.parse(document.getElementById("dados").textContent);var m=document.getElementById("m");function e(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}' +
      'm.innerHTML=D.fatias.map(function(f,i){return "<details data-i=\\""+i+"\\"><summary><b>"+f.n+". "+e(f.t)+"</b> <small>"+e(f.tipo)+" · linhas "+f.a+"–"+f.b+"</small></summary><div class=\\"ctx\\">"+e(f.ctx)+"</div><pre>"+e(f.txt)+"</pre><div class=\\"bt\\"><button data-c=\\"0\\">📋 Copiar</button><button class=\\"s\\" data-c=\\"1\\">🤖 Copiar + contexto</button></div></details>"}).join("");' +
      'function copiar(t,b){var ok=function(){var v=b.textContent;b.textContent="Copiado ✓";setTimeout(function(){b.textContent=v},1400)};if(navigator.clipboard)navigator.clipboard.writeText(t).then(ok,function(){fb()});else fb();function fb(){var a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();document.execCommand("copy");a.remove();ok()}}' +
      'm.addEventListener("click",function(ev){var b=ev.target.closest("[data-c]");if(!b)return;var f=D.fatias[+b.closest("details").dataset.i];copiar(b.dataset.c==="1"?f.ctx+"\\n\\n"+f.txt:f.txt,b)});' +
      'document.getElementById("q").oninput=function(){var q=this.value.toLowerCase();document.querySelectorAll("details").forEach(function(d){var f=D.fatias[+d.dataset.i];d.hidden=q&&(f.t+" "+f.nomes.join(" ")+" "+f.txt).toLowerCase().indexOf(q)<0})};' +
      'document.getElementById("abrir").onclick=function(){var ab=this.textContent==="Abrir todas";document.querySelectorAll("details").forEach(function(d){d.open=ab});this.textContent=ab?"Fechar todas":"Abrir todas"};' +
      'document.getElementById("orig").onclick=function(){var t=D.fatias.map(function(f){return f.txt}).join("\\n");var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t],{type:"text/plain;charset=utf-8"}));a.download=D.nome;document.body.appendChild(a);a.click();a.remove()};' +
      '<\/script></body></html>';
  }
  /** 🔁 Juntar de volta: lê o .md das fatias e devolve { nome, texto, n } */
  function juntarMD(md) {
    md = md.replace(/\r\n/g, '\n');
    let nome = 'arquivo-juntado.txt'; const cab = /<!-- fatiador: (\{.*?\}) -->/.exec(md);
    let esperado = 0; if (cab) { try { const j = JSON.parse(cab[1]); nome = j.arquivo || nome; esperado = j.fatias || 0; } catch (e) {} }
    const L = md.split('\n'); const partes = [];
    for (let i = 0; i < L.length; i++) {
      const m = /^<!-- fatia (\d+)\/(\d+) -->$/.exec(L[i]); if (!m) continue;
      let j = i + 1; while (j < L.length && !/^`{3,}/.test(L[j])) j++;
      if (j >= L.length) break;
      const c = /^`+/.exec(L[j])[0]; let k = j + 1; while (k < L.length && L[k] !== c) k++;
      partes.push({ n: +m[1], total: +m[2], texto: L.slice(j + 1, k).join('\n') }); i = k;
    }
    if (!partes.length) throw new Error('Não achei fatias neste arquivo. Ele precisa ser o "⤓ Todas as fatias (.md)" do Fatiador.');
    partes.sort((a, b) => a.n - b.n);
    const total = esperado || partes[0].total;
    const faltam = []; for (let n = 1; n <= total; n++) if (!partes.some((p) => p.n === n)) faltam.push(n);
    return { nome, texto: partes.map((p) => p.texto).join('\n'), n: partes.length, total, faltam };
  }

  // ── Tela ────────────────────────────────────────────────────────────────────
  const $ = (s) => LB.$(s, el());
  const el = () => LB.$('#panel-fatiador');
  let sub = 'entrada', fonte = null; // { nome, texto }
  const opc = { max: 150, modo: 'inteligente', dentro: false };
  try { const o = JSON.parse(localStorage.getItem('lab-fatiador') || '{}'); if (o.max) opc.max = o.max; if (o.modo) opc.modo = o.modo; if (o.dentro) opc.dentro = true; } catch (e) {}
  const lembrar = () => { try { localStorage.setItem('lab-fatiador', JSON.stringify(opc)); } catch (e) {} };
  const TAMANHOS = [[50, '50 linhas — Haiku / modelos pequenos / Ollama'], [100, '100 linhas — modelos médios'], [150, '150 linhas — recomendado (Claude Sonnet)'], [200, '200 linhas — modelos grandes'], [300, '300 linhas — GPT-4 / Claude Opus / Gemini'], [500, '500 linhas — contexto muito grande']];

  function arquivosDoProjeto() {
    const p = LB.projeto(LB.atual); if (!p) return [];
    return Object.keys(p.arquivos).filter((k) => p.arquivos[k].t != null && /\.(m?[jt]sx?|cjs|html?|css|scss|less|py|md|markdown|vue|svelte|txt|json)$/i.test(k)).sort();
  }
  function tela() {
    const e = el(); if (!e) return;
    const p = LB.projeto(LB.atual); projNome = p ? p.nome : projNome;
    e.innerHTML = '<div class="lab-topo"><h2>✂️ Fatiador inteligente</h2><p class="lab-mut">Corta um arquivo grande em pedaços <b>sem partir as funções</b>, com o contexto de cada pedaço — fácil de levar para a IA. Exporta em <b>.md</b>.</p></div>' +
      '<div class="lab-chips" id="ft-sub">' + [['entrada', '📥 1. Entrada'], ['fatias', '✂️ 2. Fatias'], ['prompt', '🤖 3. Prompt IA'], ['exportar', '📦 4. Exportar'], ['juntar', '🔁 Juntar de volta']].map(([k, t]) => '<button class="lab-chip' + (sub === k ? ' on' : '') + '" data-sub="' + k + '">' + t + '</button>').join('') + '</div><div id="ft-corpo" style="margin-top:12px"></div>';
    LB.$('#ft-sub', e).onclick = (ev) => { const b = ev.target.closest('[data-sub]'); if (b) { sub = b.dataset.sub; tela(); } };
    ({ entrada: telaEntrada, fatias: telaFatias, prompt: telaPrompt, exportar: telaExportar, juntar: telaJuntar })[sub]();
  }
  const corpo = (h) => { $('#ft-corpo').innerHTML = h; };
  const precisa = () => { if (R) return false; corpo('<div class="card"><p class="lab-mut">Primeiro fatie um arquivo na aba <b>📥 1. Entrada</b>.</p></div>'); return true; };

  function telaEntrada() {
    const arqs = arquivosDoProjeto();
    corpo('<div class="card"><div class="card-title">📥 Carregar o código</div>' +
      (arqs.length ? '<label class="lab-mut">Um arquivo do projeto <b>' + LB.esc(projNome) + '</b>:</label><select id="ft-arq" class="lab-busca"><option value="">— escolher —</option>' + arqs.map((a) => '<option' + (fonte && fonte.nome === a ? ' selected' : '') + '>' + LB.esc(a) + '</option>').join('') + '</select>' : '<p class="lab-mut">Nenhum projeto escolhido (ou sem arquivos de código). Pode abrir um arquivo ou colar.</p>') +
      '<div class="lab-linha"><button class="btn" id="ft-abrir">📂 Abrir um arquivo do aparelho</button><input type="file" id="ft-file" hidden accept=".html,.htm,.js,.mjs,.cjs,.ts,.tsx,.jsx,.css,.scss,.py,.md,.txt,.json,.vue,.svelte,text/*"></div>' +
      '<details class="lab-det"><summary>✍️ Ou colar o código</summary><input id="ft-nome" class="lab-busca" placeholder="nome com a extensão (ex.: App.tsx, pagina.html)" value="colado.html" style="margin:8px 0"><textarea id="ft-colar" class="lab-area" placeholder="Cole aqui o código completo…"></textarea><button class="btn" id="ft-usar">✔ Usar o colado</button></details>' +
      '<p class="lab-mut" id="ft-fonte">' + (fonte ? '✅ <b>' + LB.esc(fonte.nome) + '</b> · ' + fonte.texto.split('\n').length.toLocaleString('pt-BR') + ' linhas' : 'Nada carregado ainda.') + '</p></div>' +
      '<div class="card"><div class="card-title">⚙️ Como fatiar</div><label class="lab-mut">Tamanho máximo de cada fatia:</label><select id="ft-max" class="lab-busca">' +
      TAMANHOS.map(([n, t]) => '<option value="' + n + '"' + (opc.max === n ? ' selected' : '') + '>' + t + '</option>').join('') + (TAMANHOS.some(([n]) => n === opc.max) ? '' : '<option value="' + opc.max + '" selected>' + opc.max + ' linhas</option>') + '<option value="outro">✏️ Outro número…</option></select>' +
      '<div style="margin:10px 0"><label class="lab-op"><input type="radio" name="ft-modo" value="inteligente"' + (opc.modo !== 'fixo' ? ' checked' : '') + '> 🧠 Inteligente — nunca corta no meio de uma função</label><br><label class="lab-op"><input type="radio" name="ft-modo" value="fixo"' + (opc.modo === 'fixo' ? ' checked' : '') + '> 📏 Fixo — corta exatamente no número de linhas</label><br><label class="lab-op"><input type="checkbox" id="ft-dentro"' + (opc.dentro ? ' checked' : '') + '> ✂️ No inteligente: se UMA função sozinha passar do tamanho, cortar ela por dentro (numa linha segura, avisando)</label></div>' +
      '<label class="lab-mut">Nome do projeto (vai no contexto):</label><input id="ft-proj" class="lab-busca" value="' + LB.esc(projNome) + '">' +
      '<button class="btn btn-primary" id="ft-ir" style="width:100%;margin-top:12px">✂️ FATIAR AGORA</button></div>');
    const pegar = (nome, texto) => { fonte = { nome, texto }; $('#ft-fonte').innerHTML = '✅ <b>' + LB.esc(nome) + '</b> · ' + texto.split('\n').length.toLocaleString('pt-BR') + ' linhas'; };
    if ($('#ft-arq')) $('#ft-arq').onchange = (ev) => { const k = ev.target.value; const p = LB.projeto(LB.atual); if (k && p) pegar(k, p.arquivos[k].t); };
    $('#ft-abrir').onclick = () => $('#ft-file').click();
    $('#ft-file').onchange = async (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) pegar(f.name, await f.text()); };
    $('#ft-usar').onclick = () => { const t = $('#ft-colar').value; if (!t.trim()) return LB.aviso('Cole um código primeiro', 'erro'); pegar($('#ft-nome').value.trim() || 'colado.txt', t); };
    $('#ft-max').onchange = async (ev) => { if (ev.target.value !== 'outro') { opc.max = +ev.target.value; lembrar(); return; } const n = parseInt(await LB.pedir('Quantas linhas no máximo por fatia? (de 20 a 3000)', String(opc.max)), 10); if (n >= 20 && n <= 3000) opc.max = n; lembrar(); telaEntrada(); };
    $('#ft-ir').onclick = () => {
      if (!fonte) return LB.aviso('Escolha, abra ou cole um arquivo primeiro', 'erro');
      opc.modo = (el().querySelector('input[name="ft-modo"]:checked') || {}).value || 'inteligente'; opc.dentro = $('#ft-dentro').checked; lembrar();
      projNome = $('#ft-proj').value.trim();
      try { R = fatiar(fonte.nome, fonte.texto, opc.max, opc.modo, opc.dentro); } catch (er) { LB.aviso('Não consegui fatiar: ' + er.message, 'erro'); return; }
      LB.aviso('✂️ ' + R.fatias.length + ' fatias' + (R.ok ? ' · ✅ conferido' : ' · ⚠ não confere'), R.ok ? 'ok' : 'erro');
      sub = 'fatias'; tela();
    };
  }

  function telaFatias() {
    if (precisa()) return;
    const maior = Math.max(...R.fatias.map((f) => f.b - f.a));
    const grandes = R.fatias.filter((f) => f.grande).length, cortes = R.fatias.filter((f) => f.cortou).length;
    corpo('<div class="lab-cards"><div class="lab-num"><b>' + R.fatias.length + '</b><span>fatias</span></div><div class="lab-num"><b>' + R.linhas.toLocaleString('pt-BR') + '</b><span>linhas</span></div><div class="lab-num"><b>' + Math.round(R.linhas / R.fatias.length) + '</b><span>linhas/fatia (média)</span></div><div class="lab-num' + (maior > R.max ? ' ruim' : '') + '"><b>' + maior + '</b><span>a maior</span></div></div>' +
      '<p class="' + (R.ok ? 'lab-ok' : 'lab-aviso') + '">' + (R.ok ? '✅ Conferido: juntando as fatias dá o arquivo original, letra por letra.' : '⚠ As fatias não reconstroem o original. Não use; me mande o arquivo.') + '</p>' +
      (R.crlf ? '<p class="lab-mut">(As quebras de linha do Windows viraram as normais — o código é o mesmo.)</p>' : '') +
      (grandes ? '<p class="lab-aviso">📏 ' + grandes + ' fatia(s) passaram do tamanho porque são <b>uma peça só</b> (uma função ou componente grande). Não cortei para não quebrar. Se quiser, em 📥 Entrada marque <b>"cortar ela por dentro"</b>.</p>' : '') + (R.fatias.some((f) => f.partida) ? '<p class="lab-aviso">✂️ Algumas funções grandes foram cortadas por dentro (marcadas com ✂️) — o contexto de cada fatia avisa.</p>' : '') +
      (cortes ? '<p class="lab-aviso">✂️ Modo fixo: ' + cortes + ' fatia(s) terminam no meio de uma função (marcadas com ⚠).</p>' : '') +
      '<input id="ft-q" class="lab-busca" placeholder="🔎 Procurar função, nome ou texto nas fatias…"><div id="ft-lista"></div>');
    const lista = $('#ft-lista');
    const pintar = (q) => {
      q = (q || '').toLowerCase();
      lista.innerHTML = R.fatias.filter((f) => !q || (f.titulo + ' ' + f.nomes.join(' ') + ' ' + f.text + ' ' + f.nota).toLowerCase().includes(q)).map((f) =>
        '<details class="lab-det" data-n="' + f.n + '"><summary><b>' + f.n + '</b> · <small>' + LB.esc(tipoDe(f)) + '</small> · ' + LB.esc(f.titulo) + ' <small>— linhas ' + (f.a + 1) + '–' + f.b + ' · ' + (f.b - f.a) + ' linhas' + (f.grande ? ' · 📏 peça grande' : '') + (f.cortou ? ' · ⚠ cortou função' : '') + (f.partida ? ' · ✂️ pedaço de função grande' : '') + (f.nota.trim() ? ' · 📝' : '') + '</small></summary>' +
        '<pre class="lab-pre" style="white-space:pre-wrap;background:rgba(52,211,153,.08)">' + LB.esc(contexto(f)) + '</pre>' +
        '<label class="lab-mut">📝 Anotação desta fatia (vai junto no contexto e no .md):</label><textarea class="lab-area" data-nota="' + f.n + '" style="min-height:60px" placeholder="Ex.: aqui fica o login; não mexer na parte do PIX…">' + LB.esc(f.nota) + '</textarea>' +
        '<pre class="lab-pre">' + LB.esc(f.text.split('\n').slice(0, 400).join('\n')) + (f.b - f.a > 400 ? '\n… (mostrando 400 de ' + (f.b - f.a) + ' linhas — o Copiar leva tudo)' : '') + '</pre>' +
        '<div class="lab-linha"><button class="btn s" data-a="copiar">📋 Copiar</button><button class="btn s" data-a="ctx">🤖 Copiar + contexto</button><button class="btn s" data-a="baixar">⤓ Baixar (.md)</button><button class="btn s" data-a="ia">📎 Mandar para a 🤖 IA</button><button class="btn s" data-a="prompt">✍️ Fazer prompt</button></div></details>').join('') || '<p class="lab-mut">Nada encontrado.</p>';
    };
    pintar('');
    $('#ft-q').oninput = (ev) => pintar(ev.target.value);
    lista.addEventListener('input', (ev) => { const t = ev.target.closest('[data-nota]'); if (t) R.fatias[t.dataset.nota - 1].nota = t.value; });
    lista.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-a]'); if (!b) return; const f = R.fatias[b.closest('[data-n]').dataset.n - 1];
      if (b.dataset.a === 'copiar') LB.copiar(f.text);
      if (b.dataset.a === 'ctx') LB.copiar(comContexto(f));
      if (b.dataset.a === 'baixar') LB.baixar(base() + '-fatia-' + pad(f.n) + '-' + slug(f.titulo) + '.md', fatiaMD(f), 'text/markdown;charset=utf-8');
      if (b.dataset.a === 'ia') mandarIA('Fatia ' + f.n + ' de ' + R.fatias.length + ' de ' + R.nome, comContexto(f));
      if (b.dataset.a === 'prompt') { escolhida = f.n; sub = 'prompt'; tela(); }
    });
  }
  function mandarIA(titulo, texto) {
    if (!LB.ia) return LB.copiar(texto);
    LB.irAba('ia'); setTimeout(() => LB.ia.colar(titulo, texto), 80);
  }

  let escolhida = 1, pedido = 'explicar', livre = '';
  function telaPrompt() {
    if (precisa()) return;
    if (escolhida > R.fatias.length) escolhida = 1;
    corpo('<div class="card"><div class="card-title">🤖 Prompt para a IA</div><p class="lab-mut">Escolha a fatia e o que quer. O prompt já leva o contexto (o que é a fatia, de onde ela vem, o que ela usa).</p>' +
      '<label class="lab-mut">Fatia:</label><select id="ft-pf" class="lab-busca">' + R.fatias.map((f) => '<option value="' + f.n + '"' + (f.n === escolhida ? ' selected' : '') + '>' + f.n + '. ' + LB.esc(f.titulo) + ' (linhas ' + (f.a + 1) + '–' + f.b + ')</option>').join('') + '</select>' +
      '<div style="margin:10px 0">' + [['explicar', '🔍 Analisar e explicar o que faz'], ['bugs', '🔧 Encontrar e corrigir erros'], ['melhorar', '⚡ Melhorar sem tirar nada'], ['replit', '🚨 Tirar a dependência da Replit'], ['livre', '✏️ O que eu escrever:']].map(([k, t]) => '<label class="lab-op"><input type="radio" name="ft-ped" value="' + k + '"' + (pedido === k ? ' checked' : '') + '> ' + t + '</label><br>').join('') +
      '<input id="ft-livre" class="lab-busca" placeholder="Ex.: adaptar para funcionar sem internet…" value="' + LB.esc(livre) + '"></div>' +
      '<label class="lab-mut">Prompt pronto:</label><textarea id="ft-ptxt" class="lab-area" style="min-height:220px" readonly></textarea>' +
      '<div class="lab-linha"><button class="btn btn-primary" id="ft-pcop">📋 Copiar o prompt</button><button class="btn" id="ft-pia">📎 Mandar para a 🤖 IA daqui</button></div></div>');
    const gerar = () => { escolhida = +$('#ft-pf').value; pedido = (el().querySelector('input[name="ft-ped"]:checked') || {}).value || 'explicar'; livre = $('#ft-livre').value; $('#ft-ptxt').value = prompt(R.fatias[escolhida - 1], pedido, livre); };
    gerar();
    $('#ft-corpo').addEventListener('change', gerar); $('#ft-livre').oninput = () => { el().querySelector('input[value="livre"]').checked = true; gerar(); };
    $('#ft-pcop').onclick = () => LB.copiar($('#ft-ptxt').value);
    $('#ft-pia').onclick = () => mandarIA('Prompt — fatia ' + escolhida + ' de ' + R.nome, $('#ft-ptxt').value);
  }

  function telaExportar() {
    if (precisa()) return;
    corpo('<div class="card"><div class="card-title">📦 Exportar as fatias de ' + LB.esc(R.nome) + '</div>' +
      '<div class="lab-linha"><button class="btn btn-primary" data-x="md">⤓ Todas as fatias (.md)</button><button class="btn" data-x="copiar">📋 Copiar todas</button></div>' +
      '<div class="lab-linha"><button class="btn" data-x="rel">📋 Relatório + índice (.md)</button><button class="btn" data-x="html">🌐 Página para ver e copiar (.html)</button></div>' +
      '<div class="lab-linha"><button class="btn" data-x="zip">🗜️ Uma fatia por arquivo (.zip)</button><button class="btn" data-x="proj">💾 Guardar como projeto do Laboratório</button></div>' +
      '<p class="lab-mut">• O <b>.md de todas</b> volta a ser o arquivo original no <b>🔁 Juntar de volta</b>.<br>• A <b>página .html</b> abre em qualquer celular: tem pesquisa, botão Copiar em cada fatia e o botão para baixar o original.<br>• <b>Guardar como projeto</b> cria um projeto novo aqui (pasta <code>fatias/</code> + relatório), que aparece no 🔗 Mapa, no 📂 Projetos e na 🤖 IA (📎 Um arquivo).</p></div>');
    $('#ft-corpo').onclick = async (ev) => {
      const b = ev.target.closest('[data-x]'); if (!b) return; const x = b.dataset.x;
      if (x === 'md') LB.baixar(base() + '-fatias.md', todasMD(), 'text/markdown;charset=utf-8');
      if (x === 'copiar') LB.copiar(R.fatias.map(comContexto).join('\n\n---\n\n'));
      if (x === 'rel') LB.baixar(base() + '-relatorio.md', relatorioMD(), 'text/markdown;charset=utf-8');
      if (x === 'html') LB.baixar(base() + '-fatias.html', paginaHTML(), 'text/html;charset=utf-8');
      if (x === 'zip') {
        const z = new JSZip(); const pasta = base() + '-fatias/';
        R.fatias.forEach((f) => z.file(pasta + pad(f.n) + '-' + slug(f.titulo) + '.md', fatiaMD(f)));
        z.file(pasta + '00-RELATORIO.md', relatorioMD()); z.file(pasta + '00-TODAS.md', todasMD());
        LB.baixar(base() + '-fatias.zip', await z.generateAsync({ type: 'blob', compression: 'DEFLATE' }));
      }
      if (x === 'proj') {
        const nome = await LB.pedir('Nome do projeto novo:', (projNome ? projNome + ' · ' : '') + base() + ' (fatias)'); if (!nome) return;
        const arquivos = {}; R.fatias.forEach((f) => { arquivos['fatias/' + pad(f.n) + '-' + slug(f.titulo) + '.md'] = { t: fatiaMD(f) }; });
        arquivos['RELATORIO.md'] = { t: relatorioMD() }; arquivos['TODAS-AS-FATIAS.md'] = { t: todasMD() }; arquivos['original/' + R.nome.split('/').pop()] = { t: R.texto };
        const p = { id: LB.novoId(), nome: nome.trim(), criado: Date.now(), origem: 'Fatiador', arquivos };
        await LB.banco.salvar(p); await LB.carregarProjetos(); LB.escolher(p.id);
        LB.aviso('💾 Projeto "' + p.nome + '" criado com ' + R.fatias.length + ' fatias', 'ok');
      }
    };
  }

  function telaJuntar() {
    corpo('<div class="card"><div class="card-title">🔁 Juntar de volta</div><p class="lab-mut">Abra o <b>.md de todas as fatias</b> (o "⤓ Todas as fatias") — mesmo depois que a IA mexeu numa fatia e você colou a fatia nova no lugar. Ele devolve <b>um arquivo só</b>, na ordem.</p>' +
      '<div class="lab-linha"><button class="btn btn-primary" id="ft-jabrir">📂 Abrir o .md das fatias</button><input type="file" id="ft-jfile" hidden accept=".md,.markdown,.txt,text/*"></div>' +
      '<details class="lab-det"><summary>✍️ Ou colar o .md</summary><textarea id="ft-jcolar" class="lab-area"></textarea><button class="btn" id="ft-jusar">🔁 Juntar o colado</button></details><div id="ft-jres"></div></div>');
    const fazer = (md) => {
      let r; try { r = juntarMD(md); } catch (er) { $('#ft-jres').innerHTML = '<p class="lab-aviso">' + LB.esc(er.message) + '</p>'; return; }
      $('#ft-jres').innerHTML = '<p class="' + (r.faltam.length ? 'lab-aviso' : 'lab-ok') + '">' + (r.faltam.length ? '⚠ Faltam as fatias ' + r.faltam.join(', ') + ' — juntei só as que tinha.' : '✅ ' + r.n + ' fatias juntas') + ' → <b>' + LB.esc(r.nome) + '</b> · ' + r.texto.split('\n').length.toLocaleString('pt-BR') + ' linhas</p>' +
        '<div class="lab-linha"><button class="btn btn-primary" id="ft-jbaixar">⤓ Baixar ' + LB.esc(r.nome) + '</button><button class="btn" id="ft-jproj">💾 Pôr no projeto escolhido</button><button class="btn" id="ft-jfat">✂️ Fatiar de novo</button></div>';
      $('#ft-jbaixar').onclick = () => LB.baixar(r.nome.split('/').pop(), r.texto);
      $('#ft-jproj').onclick = async () => {
        const p = LB.projeto(LB.atual); if (!p) return LB.aviso('Escolha um projeto lá em cima primeiro', 'erro');
        const caminho = await LB.pedir('Salvar com que nome dentro do projeto "' + p.nome + '"? (se já existir, o antigo vira .antes)', r.nome); if (!caminho) return;
        if (p.arquivos[caminho] && p.arquivos[caminho].t != null) p.arquivos[caminho + '.antes'] = p.arquivos[caminho];
        p.arquivos[caminho] = { t: r.texto }; await LB.banco.salvar(p); await LB.carregarProjetos();
        window.dispatchEvent(new CustomEvent('lab-projeto-mudou', { detail: p.id })); LB.aviso('💾 ' + caminho + ' salvo em "' + p.nome + '"', 'ok');
      };
      $('#ft-jfat').onclick = () => { fonte = { nome: r.nome, texto: r.texto }; sub = 'entrada'; tela(); };
    };
    $('#ft-jabrir').onclick = () => $('#ft-jfile').click();
    $('#ft-jfile').onchange = async (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) fazer(await f.text()); };
    $('#ft-jusar').onclick = () => fazer($('#ft-jcolar').value);
  }

  window.addEventListener('lab-aba', (e) => { if (e.detail === 'fatiador') tela(); });
  window.addEventListener('lab-projeto', () => { const s = el() && el().closest('section'); if (s && !s.hidden && sub === 'entrada') tela(); });
  LB.fatiador = { usar: (r) => { R = r; }, abrir: (n, t) => { fonte = { nome: n, texto: t }; sub = 'entrada'; LB.irAba('fatiador'); }, fatiar, juntarMD, tela, _r: () => R, todasMD: () => todasMD(), paginaHTML: () => paginaHTML(), relatorioMD: () => relatorioMD() };
})(window.LB);
