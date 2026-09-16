# Radio Atlas — Instruções de engenharia

Especificação completa de produto em `PRD.md`. Este arquivo cobre apenas como construir, não o que construir.

## Stack obrigatória

React, Next.js, TypeScript, Tailwind CSS, MapLibre GL ou Mapbox GL para o mapa base, Three.js/Globe.gl se a performance permitir globo 3D, Radio Browser API (https://www.radio-browser.info/) como fonte de dados, Framer Motion para animação, Lucide Icons.

## Arquitetura de componentes

`WorldMap` (globo/mapa e marcadores), `CityOverlay` (painel de cidade selecionada), `StationList` (estações da cidade/região), `RadioPlayer` (player fixo inferior), `GlobalSearch` (command palette), `Spotlight` (destaques), `DiscoverSection` (carrosséis editoriais), `Library` (favoritos/histórico local), `StationCard` (card reutilizável de estação), `AudioVisualizer` (animação de onda durante reprodução).

Isolar toda chamada à Radio Browser API em uma camada de abstração própria (ex: `lib/radio-api.ts`), nunca chamada direto dos componentes. Isso permite trocar ou somar outra fonte de dados no futuro sem tocar na UI.

## Convenções não negociáveis

- Nunca dado fictício: toda estação, cidade, país, bitrate, idioma exibido vem da API real. Se a API não retornar o campo, omitir o campo, não inventar.
- Fetch de estações só sob ação do usuário (seleção de cidade/país, busca, navegação de região). Nunca carregar o catálogo inteiro no load inicial.
- Stream de áudio carregado só ao clicar Play (lazy loading).
- Cache de consultas à API para evitar refetch repetido da mesma cidade/região.
- Todo erro de stream tratado: timeout, fallback, CORS, reconexão automática, troca para stream alternativo da mesma estação quando existir. A UI nunca trava por rádio offline.
- Favoritos, histórico e preferências de biblioteca persistidos em `localStorage`.
- O padrão de texto técnico definido no PRD (caixa alta, formato cidade/país/contagem/bitrate) é uma constante de UI única, reaproveitada em hover, card e player, nunca redefinida por componente.
- Skeleton loading discreto em qualquer busca à API.

## Definition of done

- Usuário navega o mapa/globo, seleciona país e cidade, encontra e reproduz rádios reais.
- Play, pause, troca de estação, volume, busca, favoritar, ver recentes e "rádio aleatória" funcionam de ponta a ponta, sem mock.
- Nenhuma tela trava com rádio offline ou API lenta.
- Responsivo nos três breakpoints descritos no PRD.
- Zero placeholder, zero TODO, zero função vazia no código entregue.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
