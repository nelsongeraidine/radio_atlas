# PRD — Radio Atlas

Instruções de engenharia (stack, arquitetura, convenções) em `CLAUDE.md`. Este arquivo cobre o que construir, o status atual e o roadmap do produto.

## 1. Visão geral

Webapp para descobrir e ouvir rádios ao vivo do mundo todo através de uma experiência visual, geográfica e imersiva. Conceito central: explorar o planeta e descobrir o que está tocando em cada cidade agora.

---

## 2. Status Geral do Produto

| Módulo / Funcionalidade | Status | Detalhes |
| :--- | :--- | :--- |
| **Core Explore (Fase 1)** | ✅ Concluído | Mapa mundial interativo, marcadores reais, seleção de cidade/país, listagem de rádios. |
| **Busca Global (Fase 2)** | ✅ Concluído | Command palette (`Ctrl+K` / `⌘K`) com busca por nome de rádio, cidades e países. |
| **Onboarding** | ✅ Concluído | Slides de boas-vindas com transição suave, pulável e com persistência em `localStorage`. |
| **Random Radio (Shuffle)** | ✅ Concluído | Ação "Take me somewhere" com voo animado e mensagens de transição imersivas. |
| **Página Discover** | ✅ Concluído | Carrosséis editoriais por região e curadorias (Around the world, Brazil, Jazz, etc.). |
| **Página Library** | ✅ Concluído | Abas de Favoritos, Tocadas recentemente e Cidades visitadas no `localStorage`. |
| **Player Base & Visualizer** | ✅ Concluído | Player fixo, visualizador minimalista, controle de volume e playlist (anterior/próxima). |
| **Player Global Contínuo** | 🔄 Em andamento | Manter reprodução de áudio sem interrupção ao navegar entre Explore, Discover e Library. |
| **Deep Linking no Explore** | 🔄 Em andamento | Suporte a `/?city=...&cc=...` para carregar cidade/estação ao vir de links ou do Discover. |
| **Ação Compartilhar Rádio** | 🔄 Em andamento | Botão no player para copiar link direto da estação com feedback visual. |
| **Busca por Gênero/Idioma** | ⏳ Planejado | Expandir o Command Palette para filtrar por gênero musical e idioma. |
| **Controle LOCAL / WORLD** | ⏳ Planejado | Alternar raio de priorização na listagem de estações. |

---

## 3. Identidade visual

Interface premium, minimalista, cinematográfica, estilo app editorial de música/viagem: fundo escuro (`bg-black`), tipografia limpa (Inter), textos secundários pequenos em caixa alta, translucidez (`backdrop-blur`), bordas discretas (`border-white/8`), animações suaves (200-500ms).

- **Padrão de texto técnico** (`TECHNICAL_TEXT_CLASS`): caixa alta, tracking espaçado, formato `CIDADE, PAÍS` / `N STATIONS` / `BITRATE KBPS` / `LIVE` / `IDIOMA` / `GÊNERO`. Nomes de cidade e país em destaque terminam com ponto final (ex: "Paris.", "Japan.") como parte da identidade gráfica.
- Evitar: aparência de dashboard corporativo, excesso de cards, gradientes chamativos, cores saturadas.

---

## 4. Navegação & Rotas

- **Header global**: `RADIO ATLAS` + navegação (Explore `/`, Discover `/discover`, Library `/library`) à esquerda.
- **Ações rápidas**: Botão "Take me somewhere" (Shuffle) e busca rápida "Search ⌘K".
- **Comportamento**: A navegação entre abas não deve interromper a reprodução de áudio do usuário (Player Global).

---

## 5. Tela Explore (Principal)

- Mapa mundial escuro vetorial (MapLibre GL com CARTO Dark Matter): arrastar, zoom, marcadores de cidades curadas.
- Ao clicar em uma cidade ou país:
  - Voo suave da câmera (`flyTo`);
  - Abertura do painel lateral com nome da localidade e contagem;
  - **Spotlight**: seleção das top 5 rádios locais prontas para tocar em 1 clique;
  - **StationList**: lista completa de estações reais com status, tags, bitrate e botão de favoritar.
- Suporte a deep links via query params (`/?city=Paris&cc=FR` ou `/?cc=JP`), permitindo abrir cidades diretamente a partir do Discover, Library ou links compartilhados.

---

## 6. Player de Áudio

- Fixo na parte inferior da interface, persistente entre todas as páginas.
- **Informações**: Nome da rádio, localidade (`CIDADE, PAÍS`), bitrate e tag técnica.
- **Controles**:
  - Play / Pause;
  - Anterior / Próxima (navegação de playlist);
  - Controle de volume com mute/unmute;
  - Favoritar (coração conectado à Library);
  - Compartilhar rádio (copia link direto com toast de confirmação);
  - Visualizador de ondas sonoras CSS minimalista (`AudioVisualizer`).
- **Estados de stream**:
  - `TUNING…` (conectando/bufferizando);
  - `LIVE` (reproduzindo áudio real);
  - `SIGNAL LOST` com ação `TRY AGAIN` (fallback automático para URL secundária e recuperação sem travar UI).

---

## 7. Discover

Página editorial com carrosséis horizontais por seção curada:
- *Around the world*, *Brazil*, *Electronic*, *Jazz*, *Europe*, *Late night*, *Asia*, *News & Talk*, *Something different*.
- Clicar em uma estação toca imediatamente e adiciona ao histórico.
- Clicar na localidade redireciona ao Explore com a cidade/país focado.

---

## 8. Library

Armazenamento local persistido via `localStorage`:
- **Favorites**: Rádios marcadas como favoritas com opção de remover ou tocar.
- **Recently played**: Histórico das últimas 50 rádios reproduzidas.
- **Cities visited**: Histórico das cidades exploradas no mapa.

---

## 9. Busca Global (Command Palette)

Atalho `Ctrl+K` / `⌘K`:
- Busca ao vivo por nome de estação no Radio Browser API (com debounce de 300ms e skeleton loading);
- Busca instantânea em cidades curadas (`data/cities.json`);
- Busca instantânea na lista de países da Radio Browser;
- Navegação completa por teclado (setas para cima/baixo, Enter para selecionar, Esc para fechar).

---

## 10. Random Radio ("Take me somewhere")

- Botão no cabeçalho e ação no painel da cidade:
- Sorteia uma cidade com rádios verificadas;
- Mostra mensagem de transição cinematográfica na tela ("Searching the airwaves…", "Spinning the globe…");
- Anima o mapa até a cidade sorteada e inicia a reprodução de uma das suas estações.

---

## 11. Onboarding

- Apresentação na primeira visita:
  - "A world of sound." → "Thousands of stations. One planet.";
  - Botão "Start exploring" ou ação de "Skip";
  - Persiste conclusão em `localStorage` (`radio-atlas:onboarding-done`).
