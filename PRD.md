# PRD — Radio Atlas

Instruções de engenharia (stack, arquitetura, convenções) em `CLAUDE.md`. Backlog técnico e especificações de melhorias futuras em `todo.md`. Este arquivo cobre o que construir, o status atual e o roadmap do produto.

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
| **Player Global Contínuo** | ✅ Concluído | Áudio persistente sem interrupção ao navegar entre Explore, Discover e Library via `PlayerContext`. |
| **Deep Linking no Explore** | ✅ Concluído | Suporte a `/?city=...&cc=...&station=...` para carregar cidade/estação a partir de links ou do Discover. |
| **Ação Compartilhar Rádio** | ✅ Concluído | Botão no player para copiar link direto da estação com toast de confirmação. |
| **Controle LOCAL / COUNTRY** | ✅ Concluído | Alternar entre estações locais da cidade selecionada e do país inteiro na sidebar. |
| **Responsividade Mobile** | ✅ Concluído | Layout adaptativo no smartphone: mapa superior, lista inferior com rolagem e player compacto. |
| **Busca por Gêneros no Palette** | ✅ Concluído | Categoria GENRES no Command Palette (`Ctrl+K`) para busca direta de estilos musicais. |
| **Detecção por Timezone** | ✅ Concluído | Saudação adaptativa no Onboarding baseada no fuso horário do visitante sem GPS. |
| **Filtro de Qualidade de Áudio** | ✅ Concluído | Filtro por taxa de bitrate mínima (HQ ≥ 128 kbps) na listagem StationList com contagem dinâmica. |
| **Atalhos de Teclado no Player** | ✅ Concluído | Barra de espaço para play/pause global, tecla M para mute, setas/J/K para estações e ? para guia. |
| **Modo Mini-player Mobile** | ✅ Concluído | Recolhimento do player em barra ultra-fina no mobile para maximizar a área útil do mapa. |
| **MediaSession API (Bluetooth/SO)** | ✅ Concluído | Integração nativa com controles de mídia do teclado, fones Bluetooth e central do SO. |
| **Projeção 3D Globo vs 2D Plano** | ✅ Concluído | Alternância suave entre globo esférico 3D (`pitch: 0`, projeção nativa MapLibre GL v5) e mapa 2D Mercator. |
| **Foco de Gênero no Discover** | ✅ Concluído | Deep linking para `/discover?genre=...` com auto-scroll suave e badge de destaque MATCH. |
| **Exclusão Unitária no Histórico** | ✅ Concluído | Remoção individual com botão X de cada termo do histórico recente no Command Palette. |
| **Cenário Espacial no Modo 3D** | ✅ Concluído | 250 estrelas animadas, estrelas cadentes, lua realista com crateras e anel atmosférico azul no modo globo. |
| **Correções de UX Mobile** | ✅ Concluído | Scroll da lista corrigido no iOS Safari via `position:absolute` na aside (altura explícita em pixels); botão 2D/3D com `z-20` e touch target maior; mapa redimensiona dinamicamente quando painel abre. |

---

## 3. Identidade visual

Interface premium, minimalista, cinematográfica, estilo app editorial de música/viagem: fundo escuro (`bg-black`), tipografia limpa (Inter), textos secundários pequenos em caixa alta, translucidez (`backdrop-blur`), bordas discretas (`border-white/8`), animações suaves (200-500ms).

- **Padrão de texto técnico** (`TECHNICAL_TEXT_CLASS`): caixa alta, tracking espaçado, formato `CIDADE, PAÍS` / `N STATIONS` / `BITRATE KBPS` / `LIVE` / `IDIOMA` / `GÊNERO`. Nomes de cidade e país em destaque terminam com ponto final (ex: "Paris.", "Japan.") como parte da identidade gráfica.
- Evitar: aparência de dashboard corporativo, excesso de cards, gradientes chamativos, cores saturadas.

---

## 4. Navegação & Rotas

- **Header global**: `RADIO ATLAS` + navegação (Explore `/`, Discover `/discover`, Library `/library`) à esquerda.
- **Ações rápidas**: Botão "Take me somewhere" (Shuffle) e busca rápida "Search ⌘K".
- **Comportamento**: A navegação entre abas não interrompe a reprodução de áudio do usuário (Player Global montado no `RootLayout`).

---

## 5. Tela Explore (Principal)

- Mapa mundial escuro vetorial (MapLibre GL com CARTO Dark Matter): arrastar, zoom, marcadores de cidades curadas.
- **Layout responsivo**:
  - *Desktop*: mapa em tela cheia com painel lateral flutuante ou acoplado à direita (`w-80`).
  - *Mobile*: mapa `h-[38vh]` quando painel aberto (absolute), `flex-1` quando fechado. Painel lateral `position:absolute top-[38vh] bottom-0` — altura em pixels garante scroll no iOS Safari. Botão 2D/3D com `z-20` e touch target adequado.
- **Ao selecionar localidade**:
  - Voo suave da câmera (`flyTo`);
  - **Controle LOCAL / COUNTRY**: toggle no topo da sidebar para alternar entre as estações da cidade selecionada e as estações populares de todo o país;
  - **Filtro de Qualidade de Áudio**: toggle `HQ ONLY (≥128K)` para filtrar estações com qualidade de áudio superior com contagem em tempo real;
  - **Spotlight**: seleção das top 5 rádios locais prontas para tocar em 1 clique;
  - **StationList**: lista completa de estações reais com status, tags, bitrate e botão de favoritar.
- **Deep links**: lê parâmetros da URL (`/?city=Paris&cc=FR` ou `/?cc=JP` ou `/?station=id`), voando até a localidade e iniciando a reprodução automaticamente.

---

## 6. Player de Áudio

- Fixo na parte inferior da interface, persistente entre todas as páginas.
- **Informações**: Nome da rádio, localidade (`CIDADE, PAÍS`), bitrate e status.
- **Controles**:
  - Play / Pause;
  - Anterior / Próxima (navegação de playlist);
  - Controle de volume com mute/unmute (adaptado para visualização compacta no mobile);
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
- Clicar em uma estação toca imediatamente usando o player global.
- Clicar na localidade redireciona ao Explore com a cidade/país focado via deep link.

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
- Categoria **GENRES**: busca direta por estilos e tags (Jazz, Ambient, Electronic, Rock, Classical, etc.);
- **Histórico de buscas recentes**: memoriza até 6 consultas em `localStorage`, permitindo reutilização com 1 clique ou limpeza em lote (`Clear`);
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
  - Detecção local opcional por fuso horário (*"Good evening from Brazil."*);
  - Botão "Start exploring" ou ação de "Skip";
  - Persiste conclusão em `localStorage` (`radio-atlas:onboarding-done`).
