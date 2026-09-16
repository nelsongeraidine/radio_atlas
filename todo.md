# TODO — Radio Atlas: Próximas Atualizações e Melhorias

Este arquivo registra as melhorias e funcionalidades planejadas para as próximas iterações do **Radio Atlas**, com especificações técnicas, arquivos afetados e critérios de teste.

---

## 1. Integração com a MediaSession API (Controles de Sistema e Fones Bluetooth)

- **Objetivo**: Integrar o áudio do webapp à API nativa do navegador (`navigator.mediaSession`) para permitir controle por teclas de mídia do teclado do SO, fones de ouvido Bluetooth, tela de bloqueio e central de controle do Windows / macOS / Android / iOS.
- **Arquivos afetados**:
  - `components/RadioPlayer.tsx` ou `components/GlobalPlayer.tsx`
  - `components/RadioPlayer.test.tsx`
- **Especificações técnicas**:
  - Atualizar `navigator.mediaSession.metadata` sempre que uma estação começar a tocar:
    - `title`: Nome da estação (`station.name`).
    - `artist`: Localidade formatada (`station.city`, `station.country` ou `formatCityCountry`).
    - `album`: `"Radio Atlas"`.
    - `artwork`: Imagem de capa/favicon da rádio (`station.favicon` se disponível).
  - Registrar handlers de ações:
    - `play`: Iniciar/retomar áudio.
    - `pause`: Pausar áudio.
    - `previoustrack`: Navegar para rádio anterior (`onNavigate("prev")`).
    - `nexttrack`: Navegar para próxima rádio (`onNavigate("next")`).
    - `stop`: Pausar e redefinir áudio.
  - Atualizar `playbackState` (`"playing"` | `"paused"` | `"none"`).
- **Testes**:
  - Mock de `navigator.mediaSession` em ambiente Vitest/jsdom.
  - Testar atribuição correta dos metadados e disparo dos handlers de play, pause, next e prev.

---

## 2. Atalhos de Teclado Globais no Player

- **Objetivo**: Proporcionar navegação rápida e acessível para audiófilos via teclado físico sem necessidade de cliques.
- **Arquivos afetados**:
  - `components/RadioPlayer.tsx` ou hook `lib/use-keyboard-shortcuts.ts`
  - `components/RadioPlayer.test.tsx`
- **Atalhos planejados**:
  - `Space`: Alternar Play / Pause (ignorado se o usuário estiver digitando em `input`, `textarea` ou elemento com `contentEditable`).
  - `M`: Alternar Mute / Unmute.
  - `ArrowLeft` ou `J`: Estação anterior da lista.
  - `ArrowRight` ou `K`: Próxima estação da lista.
  - `L` ou `F`: Favoritar / remover dos favoritos a estação atual.
  - `?` (`Shift + /`): Abrir modal/painel com colinha dos atalhos rápidos (*Keyboard Shortcuts*).
- **Testes**:
  - Disparo de eventos `keydown` na `window`.
  - Verificação de isolamento quando um `input` (como a busca) está focado.

---

## 3. Leitura e Foco de Gênero via Query Param no Discover (`/?genre=...`)

- **Objetivo**: Ao selecionar um gênero no Command Palette (`Ctrl+K`), o usuário é redirecionado para `/discover?genre=...`. O Discover deve navegar diretamente até a seção correspondente com animação suave e destaque.
- **Arquivos afetados**:
  - `app/discover/page.tsx`
  - `components/DiscoverSection.tsx`
  - `app/discover/page.test.tsx`
- **Especificações técnicas**:
  - Ler `useSearchParams().get("genre")` dentro de um boundary com `<Suspense>` (requisito Next.js 16).
  - Fazer correspondência do parâmetro com a lista de seções editoriais (`SECTIONS`).
  - Rolar a página suavemente até a seção (`scrollIntoView({ behavior: "smooth" })`).
  - Aplicar um destaque visual temporário (borda sutil ou pulso discreto em `TECHNICAL_TEXT_CLASS`) para sinalizar a seção encontrada.
- **Testes**:
  - Testar renderização de `/discover?genre=Electronic` com mock de `useSearchParams`.

---

## 4. Modo Mini-Player / Recolhimento no Mobile

- **Objetivo**: Permitir que usuários em smartphones recolham o player inferior em uma barra ultra-fina (ex: 32px), maximizando a visualização do mapa vetorial interativo.
- **Arquivos afetados**:
  - `components/RadioPlayer.tsx`
  - `components/RadioPlayer.test.tsx`
- **Especificações técnicas**:
  - Adicionar botão de alternância (chevron recolher/expandir) visível apenas em telas mobile (`sm:hidden`).
  - Estado colapsado: barra fina contendo apenas status pulsante, nome da estação em texto contínuo truncado e botão de play/pause compacto.
  - Estado expandido: layout completo com logo, localidade, navegação de playlist, volume e favoritos.
  - Transição fluida de altura com classes Tailwind (`transition-all duration-300`).

---

## 5. Aprimoramento do Histórico de Busca: Remoção Individual de Termos

- **Objetivo**: Permitir apagar termos específicos do histórico de buscas recentes no Command Palette (`Ctrl+K`), além do botão de limpar tudo.
- **Arquivos afetados**:
  - `lib/library.ts` (`removeRecentSearch`)
  - `components/GlobalSearch.tsx`
  - `components/GlobalSearch.test.tsx`
- **Especificações técnicas**:
  - Adicionar função `removeRecentSearch(term: string)` no hook `useRecentSearches`.
  - Exibir ícone sutil de `X` ao lado de cada item em `Recent searches`.
  - Clicar no `X` remove apenas aquele item sem executar a busca.

---

## 6. Alternância de Visualização do Mapa: 2D (Plano) / 3D (Globo Esférico)

- **Objetivo**: Permitir que o usuário alterne entre a visão clássica de mapa plano (Mercator) e a projeção de globo esférico 3D (estilo Terra no espaço sideral), aumentando a imersão geográfica.
- **Arquivos afetados**:
  - `components/WorldMap.tsx`
  - `app/page.tsx`
  - `components/WorldMap.test.tsx`
- **Abordagem técnica recomendada**:
  - Utilizar a projeção nativa de globo do **MapLibre GL v4** (`setProjection({ type: "globe" })`), aproveitando a biblioteca já instalada sem adicionar peso ao bundle.
- **Especificações técnicas**:
  - **Controle de UI**: Adicionar seletor discreto `[ 2D | 3D ]` com a classe `TECHNICAL_TEXT_CLASS` no canto do mapa (sobreposto, próximo aos controles de zoom/localização).
  - **Transição de projeção**:
    - Modo 2D: `map.setProjection({ type: 'mercator' })` com `pitch: 0` e `bearing: 0`.
    - Modo 3D: `map.setProjection({ type: 'globe' })` com suporte a inclinação de câmera (`pitch: 45`) e rotação livre da Terra com o botão direito do mouse.
  - **Compatibilidade total**:
    - Preservar os marcadores de cidades existentes (`CityMarker`).
    - Manter a animação cinematográfica `flyTo` ao clicar em uma cidade ou ao usar o shuffle ("Take me somewhere").
    - Não interromper o áudio ou o estado de seleção durante a troca de projeção.
- **Testes**:
  - Testar toggle de projeção chamando `setProjection` com `globe` e `mercator` no `WorldMap.test.tsx`.
