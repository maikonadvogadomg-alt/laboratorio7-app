/* Laboratório — 90-lab-ponte.js: a "tomada" que deixa as ferramentas do Laboratório ANTIGO (19/10)
   — 🔪 Desmontar, 🗺️ Mapa e 🧪 Prévia de vários arquivos — funcionarem aqui dentro, sem mexer nelas.
   Elas pediam um "Shell" (o miolo do app antigo). Aqui o Shell é de mentirinha e conversa com o LB. */
(function (LB) {
  'use strict';
  let pendente = null, timer = 0;
  function arquivosDoAtual() {
    const p = LB.projeto(LB.atual); const fs = {};
    if (p) for (const [k, v] of Object.entries(p.arquivos || {})) if (v && v.t != null) fs[k] = v.t;
    return fs;
  }
  async function criarProjeto() {
    const x = pendente; pendente = null; if (!x || !x.fs) return;
    const arquivos = {}; for (const [k, t] of Object.entries(x.fs)) arquivos[k] = { t: String(t) };
    const p = { id: LB.novoId(), nome: x.nome || 'projeto-desmontado', criado: Date.now(), origem: 'Desmontar', arquivos };
    await LB.banco.salvar(p); await LB.carregarProjetos(); LB.escolher(p.id);
    if (window.Lab && Lab.limparCache) Lab.limparCache();
    LB.aviso('✅ Novo projeto "' + p.nome + '" (' + Object.keys(arquivos).length + ' arquivos). O original continua guardado.', 'ok');
    if (x.ir) LB.irAba(x.ir);
  }
  window.Shell = {
    getState(k) {
      if (k === 'projectFiles') return pendente && pendente.fs ? pendente.fs : arquivosDoAtual();
      if (k === 'projectName') { if (pendente && pendente.nome) return pendente.nome; const p = LB.projeto(LB.atual); return p ? p.nome : ''; }
      return null;
    },
    setState(k, v) {
      if (k === 'projectFiles') { pendente = pendente || {}; pendente.fs = v; }
      else if (k === 'projectName') { pendente = pendente || {}; pendente.nome = v; }
      else return;
      clearTimeout(timer); timer = setTimeout(criarProjeto, 0);
    },
    navigate(t) {
      if (pendente) { pendente.ir = t; return; } // espera o projeto novo ficar pronto
      if (LB.$('#abas [data-t="' + t + '"]')) LB.irAba(t);
    },
    openModal(titulo, html) { LB.modal('<div class="linha" style="justify-content:space-between"><h2 style="margin:0">' + LB.esc(titulo) + '</h2><button class="btn s" data-x="0">✕ Fechar</button></div>' + html, () => {}); },
    toast(m, tipo) { LB.aviso(m, tipo === 'error' ? 'erro' : tipo === 'success' ? 'ok' : ''); },
    getCurrentModule() { const b = LB.$('#abas .aba.on'); return b ? b.dataset.t : ''; },
  };
  window.LabBin = window.LabBin || {};
  const telas = { desmontar: 'LabDesmontar', mapa: 'LabMapa', previa: 'LabPrevia' };
  window.addEventListener('lab-aba', (e) => { const m = window[telas[e.detail]]; if (m && m.tela) try { m.tela(); } catch (er) { LB.aviso('Erro ao abrir: ' + er.message, 'erro'); } });
  window.addEventListener('lab-projeto', () => {
    if (window.Lab && Lab.limparCache) Lab.limparCache();
    const b = LB.$('#abas .aba.on'); const m = b && window[telas[b.dataset.t]]; if (m && m.tela) m.tela();
  });
})(window.LB);
