# 📋 Plano do projeto: laboratorio(7)

_Gerado em 15/11/2026, 18:25:48 — sem IA, lendo os arquivos._

## 📊 Visão geral
| Item | Valor |
|---|---|
| Arquivos | 81 |
| Linhas | 18.347 |
| Telas/páginas | 14 |
| Rotas do backend | 0 |
| Chamadas do app | 0 |
| Tabelas do banco | 0 |
| Variáveis de ambiente | 2 |

**Linguagens:** JavaScript (48), HTML (14), Python (6), CSS (4), Imagem (3), Outros (3), JSON (2), Markdown (1)

## 💡 O que fazer (em ordem)
1. 🧹 Tirar a Replit de 9 arquivo(s) (🏗️ Preparar → Fazer tudo)
2. 🔐 Criar um .env.example com: BASE_PATH, PORT (os valores você coloca no servidor, nunca no código)
3. 📝 Criar um README.md explicando como rodar
4. 🚫 Criar .gitignore (não mandar node_modules ao GitHub)

## 🚀 Por onde começa
- `ferramentas/meu-chat/index.html`
- `index.html`

## 📱 Telas e páginas
| Endereço | Arquivo |
|---|---|
| `ferramentas/ai-code-studio.html` | ferramentas/ai-code-studio.html |
| `ferramentas/arrumador.html` | ferramentas/arrumador.html |
| `ferramentas/colador.html` | ferramentas/colador.html |
| `ferramentas/faxina.html` | ferramentas/faxina.html |
| `ferramentas/iara-suite.html` | ferramentas/iara-suite.html |
| `ferramentas/juntador.html` | ferramentas/juntador.html |
| `ferramentas/meu-chat/index.html` | ferramentas/meu-chat/index.html |
| `ferramentas/montador.html` | ferramentas/montador.html |
| `ferramentas/numerador.html` | ferramentas/numerador.html |
| `ferramentas/picotador.html` | ferramentas/picotador.html |
| `ferramentas/preparador.html` | ferramentas/preparador.html |
| `ferramentas/projeto-lab.html` | ferramentas/projeto-lab.html |
| `ferramentas/replicador.html` | ferramentas/replicador.html |
| `index.html` | index.html |

## 🖥️ Rotas do backend
_Nenhum encontrado._

## 📡 O que o app pede ao servidor
_Nenhum encontrado._

## 🔌 O que falta no backend
✅ Tudo que o app chama tem rota no projeto (ou o app não usa servidor).

## 🗄️ Banco de dados
_Nenhuma tabela encontrada._

## 🔐 Variáveis de ambiente (configurar no servidor)
- `BASE_PATH`
- `PORT`

_Só os nomes. Os valores (chaves, senhas) nunca vão no código nem no GitHub._

## 🤖 IA usada
- generativelanguage.googleapis.com
- api.groq.com
- console.groq.com
- openrouter.ai
- api.openai.com
- platform.openai.com
- api.anthropic.com
- console.anthropic.com

## 🌐 Serviços de fora que ele acessa
- aistudio.google.com
- api-dashboard.search.brave.com
- api.anthropic.com
- api.deepseek.com
- api.groq.com
- api.openai.com
- api.perplexity.ai
- api.search.brave.com
- api.tavily.com
- app.tavily.com
- cdn.jsdelivr.net
- cdn.tailwindcss.com
- cdnjs.cloudflare.com
- console.anthropic.com
- console.groq.com
- esm.sh
- generativelanguage.googleapis.com
- github.com
- google.serper.dev
- meuchat.local
- ollama.com
- openrouter.ai
- platform.deepseek.com
- platform.openai.com
- r.jina.ai
- raw.github.com
- serper.dev
- stuartk.com
- stuk.github.io
- unpkg.com
- www.perplexity.ai

## 🧹 Arquivos com coisa da Replit
- ferramentas/meu-chat/js/33-contextos.js
- ferramentas/meu-chat/js/lib/guia-maikon.js
- js/60-ferramentas.js
- js/95-fatiador.js
- js/96-recuperar.js
- js/98x-raiox.js
- kits/kit-replit.cjs
- kits/organizar.py
- kits/servir.py

## 🔁 Roteiro para recriar fora da Replit
1. Importar o projeto no Mini SK e tocar em 🏗️ Preparar → ✅ Fazer tudo (tira a Replit, cria os arquivos que faltam).
2. Não tem backend: o site sozinho basta (Netlify ou GitHub Pages).
3. Variáveis: cadastrar 2 variável(is) no servidor (lista acima).
4. Testar a prévia; se der erro, 🤖 Mandar os erros para a IA.
5. App: 📲 Instalável (PWA), 📦 APK ou 🖥️ Desktop (.exe) pelo 🏗️ Preparar.

## 🌳 Árvore de arquivos
```
├─ 📁 css/
│  ├─ antigo.css
│  ├─ app.css
│  └─ extra.css
├─ 📁 ferramentas/
│  ├─ 📁 meu-chat/
│  │  ├─ 📁 css/
│  │  │  └─ app.css
│  │  ├─ 📁 icons/
│  │  │  ├─ icon-192.png
│  │  │  └─ icon-512.png
│  │  ├─ 📁 js/
│  │  │  ├─ 📁 lib/
│  │  │  │  ├─ cofre-arquivo.js
│  │  │  │  ├─ guia-maikon.js
│  │  │  │  └─ jszip.min.js
│  │  │  ├─ 00-base.js
│  │  │  ├─ 10-banco.js
│  │  │  ├─ 20-provedores.js
│  │  │  ├─ 30-memoria.js
│  │  │  ├─ 33-contextos.js
│  │  │  ├─ 35-jeito.js
│  │  │  ├─ 40-voz.js
│  │  │  ├─ 50-internet.js
│  │  │  ├─ 60-previa.js
│  │  │  ├─ 70-texto.js
│  │  │  ├─ 80-chat.js
│  │  │  ├─ 85-config.js
│  │  │  ├─ 87-cofre.js
│  │  │  ├─ 90-backup.js
│  │  │  ├─ 95-ponte-lab.js
│  │  │  └─ 99-app.js
│  │  ├─ index.html
│  │  ├─ LEIA-ME.txt
│  │  ├─ manifest.json
│  │  ├─ sw.js
│  │  └─ voz-francisco.py
│  ├─ ai-code-studio.html
│  ├─ arrumador.html
│  ├─ colador.html
│  ├─ faxina.html
│  ├─ iara-suite.html
│  ├─ juntador.html
│  ├─ montador.html
│  ├─ numerador.html
│  ├─ picotador.html
│  ├─ preparador.html
│  ├─ projeto-lab.html
│  └─ replicador.html
├─ 📁 js/
│  ├─ 00-base.js
│  ├─ 10-banco.js
│  ├─ 20-importar.js
│  ├─ 30-analise.js
│  ├─ 40-plano.js
│  ├─ 50-comparar.js
│  ├─ 60-ferramentas.js
│  ├─ 70-ia.js
│  ├─ 75-memoria.js
│  ├─ 80-terminal.js
│  ├─ 90-lab-ponte.js
│  ├─ 91-lab-base.js
│  ├─ 92-lab-mapa.js
│  ├─ 93-lab-previa.js
│  ├─ 94-lab-desmontar.js
│  ├─ 95-fatiador.js
│  ├─ 96-recuperar.js
│  ├─ 97-brincar.js
│  ├─ 98-combinar.js
│  ├─ 98w-desembrulhar.js
│  ├─ 98x-raiox.js
│  ├─ 98y-grupos.js
│  ├─ 98z-navegar.js
│  └─ 99-app.js
├─ 📁 kits/
│  ├─ 📁 receita-montar/
│  │  ├─ 📁 js/
│  │  │  └─ 40-ferramentas.js
│  │  ├─ montar.py
│  │  ├─ PEDIDO-PARA-A-IA.txt
│  │  ├─ RECEITA-MONTAR.md
│  │  └─ receita.json
│  ├─ juntar.py
│  ├─ kit-replit.cjs
│  ├─ organizar.py
│  ├─ servir.py
│  └─ voz-francisco.py
├─ 📁 lib/
│  ├─ acorn.min.js
│  └─ jszip.min.js
├─ cb1.png
├─ index.html
└─ LEIA-ME.txt
```
