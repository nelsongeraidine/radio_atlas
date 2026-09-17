# TODO — Radio Atlas: Histórico de Melhorias & Próximas Ideias

Este arquivo registra o status das melhorias implementadas e as próximas ideias para o **Radio Atlas**.

---

## Funcionalidades Implementadas (Concluídas com Sucesso)

### 1. Integração com a MediaSession API (Controles de Sistema e Fones Bluetooth) — ✅ Concluído
- **Implementação**: Integrado em `components/RadioPlayer.tsx` e testado em `components/RadioPlayer.test.tsx`.
- **Destaques**:
  - Metadados (`title`, `artist`, `album`, `artwork`) atualizados dinamicamente;
  - Handlers de `play`, `pause`, `previoustrack`, `nexttrack` e `stop` registrados;
  - `playbackState` sincronizado com o status do player (`playing`, `paused`, `none`).

### 2. Atalhos de Teclado Globais no Player — ✅ Concluído
- **Implementação**: Criado hook dedicado `lib/use-keyboard-shortcuts.ts` e modal de guia rápido de atalhos em `components/RadioPlayer.tsx`.
- **Atalhos**:
  - `Space`: Alternar Play / Pause (ignorado se digitando em campos de texto);
  - `M`: Mute / Unmute;
  - `←` ou `J`: Estação anterior;
  - `→` ou `K`: Próxima estação;
  - `L` ou `F`: Favoritar estação atual;
  - `?`: Exibir / ocultar guia de atalhos na tela.

### 3. Leitura e Foco de Gênero via Query Param no Discover (`/?genre=...`) — ✅ Concluído
- **Implementação**: Em `app/discover/page.tsx` dentro de boundary `<Suspense>`, e `components/DiscoverSection.tsx`.
- **Destaques**:
  - Detecção automática de query param `genre` com correspondência às seções editoriais;
  - Rolagem suave com `scrollIntoView({ behavior: 'smooth', block: 'center' })`;
  - Badge visual `MATCH` e realce sutil temporário na seção encontrada.

### 4. Modo Mini-Player / Recolhimento no Mobile — ✅ Concluído
- **Implementação**: Em `components/RadioPlayer.tsx` com chevron de alternância (`sm:hidden`).
- **Destaques**:
  - Barra ultra-fina recolhida com indicador LIVE pulsante, título truncado e botão de play/pause compacto;
  - Botão de expansão para restaurar a visualização completa do player.

### 5. Aprimoramento do Histórico de Busca: Remoção Individual de Termos — ✅ Concluído
- **Implementação**: Adicionado `removeRecentSearch` em `lib/library.ts` e botão `X` em cada item recente em `components/GlobalSearch.tsx`.
- **Destaques**:
  - Remoção unitária sem acionar a busca (com `stopPropagation()`);
  - Limpeza total mantida via botão "Clear".

### 6. Alternância de Visualização do Mapa: 2D (Plano) / 3D (Globo Esférico) — ✅ Concluído
- **Implementação**: Atualizado para `maplibre-gl@5.24.0` com suporte nativo a `setProjection({ type: 'globe' })` em `components/WorldMap.tsx`.
- **Destaques**:
  - Seletor estilizado `[ 2D | 3D ]` no canto superior do mapa;
  - Modo 3D com globo esférico e câmera frontal (`pitch: 0` — a projeção esférica já cria o efeito 3D sem inclinação);
  - Modo 2D clássico Mercator (`pitch: 0`, `bearing: 0`);
  - Marcadores de cidades, `flyTo` e áudio contínuo preservados integralmente.

### 7. Cenário Espacial no Modo 3D (Estrelas, Lua e Atmosfera) — ✅ Concluído
- **Implementação**: Sobreposição ao `WorldMap.tsx` via canvas HTML e elementos CSS absolutos.
- **Destaques**:
  - **250 estrelas animadas** com cintilação individual (`requestAnimationFrame`), cores variadas e `mix-blend-mode: screen` para aparecer apenas no espaço escuro ao redor do globo;
  - **Estrelas cadentes** ocasionais (~a cada 5s) com cauda gradiente;
  - **Lua realista** com gradiente radial, manchas escuras (*mare*), crateras, linha terminadora dia/noite e brilho suave;
  - **Anel atmosférico azul** ao redor do globo simulando a atmosfera vista do espaço;
  - Todos os elementos fazem fade-in/out suave (1.4–1.6s) ao alternar entre 2D e 3D.

### 8. Correções de UX Mobile — ✅ Concluído
- **Implementação**: `app/page.tsx`, `components/Spotlight.tsx`, `components/WorldMap.tsx`.
- **Destaques**:
  - **Scroll da lista de rádios corrigido**: removido `overflow-hidden` do `aside`; header e Spotlight envolvidos em `flex-shrink-0`; `div.flex-1.overflow-y-auto.min-h-0` garante scroll em flexbox;
  - **Spotlight limitado a 3 itens** (prop `maxCount`) para liberar espaço vertical para a lista completa;
  - **Botão 2D/3D mais acessível no touch**: `z-20`, `py-1.5 px-3 text-[12px]` — área de toque maior e visibilidade garantida acima de todos os overlays;
  - Altura do painel lateral ajustada de `h-[50vh]` para `h-[45vh]` para equilibrar a visualização do mapa e da lista.

---

## Backlog Futuro (A Definir)

### 💤 Sleep Timer (Temporizador de Sono)
- **Descrição**: Desligar o áudio automaticamente após um tempo definido pelo usuário (15, 30 ou 60 minutos).
- **UX sugerida**: Botão de relógio no player com menu dropdown de opções e contagem regressiva visível.
- **Arquivos envolvidos**: `components/RadioPlayer.tsx`, `components/GlobalPlayer.tsx`, `lib/player-context.tsx`.

### 🎙️ Gravação / Snippet de Áudio
- **Descrição**: Gravar um trecho curto (~15 segundos) da rádio ativa e disponibilizar para download local como arquivo `.webm`.
- **UX sugerida**: Botão de gravação no player; barra de progresso de 15s; link de download ao finalizar.
- **Consideração técnica**: Usar `MediaRecorder API` capturando o stream de áudio ativo.
- **Arquivos envolvidos**: `components/RadioPlayer.tsx`, novo hook `lib/use-audio-recorder.ts`.

### 🌐 Filtro por Idioma das Estações
- **Descrição**: Filtrar as estações listadas pelo idioma falado/transmitido, além do filtro de bitrate já existente.
- **UX sugerida**: Dropdown ou chips de idioma no topo da `StationList`, com contagem dinâmica.
- **Arquivos envolvidos**: `components/StationList.tsx`, `components/CityOverlay.tsx`.
