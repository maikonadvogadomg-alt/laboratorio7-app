/* Laboratório — 98z-navegar.js: barrinha NO TOPO (ao lado da versão) com ⬅ voltar · ➡ avançar (entre as abas que você abriu)
   e 🔍− 🔍+ (diminuir/aumentar a tela inteira). O tamanho escolhido fica guardado neste aparelho. */
(function (LB) {
  'use strict';
  const hist = [], frente = []; let atual = null, navegando = false;
  let zoom = 1; try { zoom = parseFloat(localStorage.getItem('lab2:zoom')) || (window.innerWidth > 1400 ? 1.15 : 1); } catch {}
  const aplicar = () => { document.documentElement.style.zoom = zoom; try { localStorage.setItem('lab2:zoom', String(zoom)); } catch {} };
  function pintar() { const b = document.getElementById('lab-nav'); if (!b) return; b.querySelector('[data-n=v]').disabled = !hist.length; b.querySelector('[data-n=a]').disabled = !frente.length; }
  window.addEventListener('lab-aba', (e) => {
    const a = e.detail; if (a === atual) return;
    if (!navegando) { if (atual) hist.push(atual); frente.length = 0; }
    atual = a; navegando = false; pintar();
  });
  function ir(a) { navegando = true; LB.irAba(a); }
  function montar() {
    const b = document.createElement('div'); b.id = 'lab-nav';
    b.innerHTML = '<button data-n="v" title="Voltar">⬅</button><button data-n="a" title="Avançar">➡</button><button data-n="-" title="Diminuir a tela">🔍−</button><button data-n="+" title="Aumentar a tela">🔍+</button>';
    b.addEventListener('click', (e) => {
      const n = (e.target.closest('[data-n]') || {}).dataset; if (!n) return;
      if (n.n === 'v' && hist.length) { frente.push(atual); ir(hist.pop()); }
      else if (n.n === 'a' && frente.length) { hist.push(atual); ir(frente.pop()); }
      else if (n.n === '+') { zoom = Math.min(2, Math.round((zoom + 0.1) * 100) / 100); aplicar(); }
      else if (n.n === '-') { zoom = Math.max(0.6, Math.round((zoom - 0.1) * 100) / 100); aplicar(); }
      pintar();
    });
    (document.querySelector('header .topo') || document.body).appendChild(b); aplicar(); pintar();
  }
  document.addEventListener('keydown', (e) => { if (e.altKey && e.key === 'ArrowLeft') document.querySelector('#lab-nav [data-n=v]').click(); if (e.altKey && e.key === 'ArrowRight') document.querySelector('#lab-nav [data-n=a]').click(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})(window.LB);
