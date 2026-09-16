# Radio Atlas — Instruções de engenharia

Especificação de produto e status de implementação em `PRD.md`. Este arquivo cobre as diretrizes de arquitetura, convenções e padrões técnicos para o desenvolvimento.

## Stack obrigatória

- **Framework**: Next.js 16 (App Router) com React 19 e TypeScript.
- **Estilização**: Tailwind CSS (paleta escura, minimalista, sem cards pesados).
- **Mapa**: MapLibre GL com tiles vetoriais CARTO Dark Matter (dark basemap limpo).
- **Dados de Rádio**: Radio Browser API (https://www.radio-browser.info/) via cliente tipado próprio no servidor (`lib/radio-api/`).
- **Data Fetching / Cache**: TanStack React Query (`@tanstack/react-query`).
- **Ícones**: Lucide React (`lucide-react`).
- **Testes & Qualidade**: Vitest (`vitest`), Testing Library (`@testing-library/react`), ESLint 9, TypeScript (`tsc --noEmit`).

---

## Arquitetura de Pastas e Componentes

```text
app/
  ├── layout.tsx              # RootLayout com Inter, Providers e Player Global
  ├── page.tsx                # Página principal (Explore: Mapa + Sidebar + Spotlight + Deep Linking)
  ├── discover/page.tsx       # Página Discover (Carrosséis editoriais)
  ├── library/page.tsx        # Página Library (Favoritos, Histórico, Cidades visitadas)
  └── api/radio/              # Rotas de API Node.js (seed, stations, countries, search)
components/
  ├── WorldMap.tsx            # Mapa interativo MapLibre GL
  ├── CityOverlay.tsx         # Cabeçalho da cidade/país selecionado com alternância LOCAL / COUNTRY
  ├── StationList.tsx         # Lista de estações da localidade selecionada
  ├── StationCard.tsx         # Card individual de rádio com play e favoritos
  ├── RadioPlayer.tsx         # Player de áudio com visualizer, volume, playlist e compartilhamento
  ├── GlobalPlayer.tsx        # Container global montado no RootLayout que mantém o áudio ativo
  ├── AudioVisualizer.tsx     # Visualizador minimalista com animação CSS
  ├── GlobalSearch.tsx        # Command palette (Ctrl+K / ⌘K: rádios, cidades, países, gêneros)
  ├── DiscoverSection.tsx     # Seção de carrossel editorial no Discover
  ├── Spotlight.tsx           # Destaques (Top 5 rádios) na sidebar
  └── Onboarding.tsx          # Tela de boas-vindas na primeira visita (saudação adaptativa)
lib/
  ├── radio-api/              # Cliente Node.js resiliente com pool de mirrors
  ├── library.ts              # Hooks de persistência local (useFavorites, useRecentlyPlayed, useCitiesVisited)
  ├── player-context.tsx      # Contexto global para reprodução contínua entre rotas
  └── format.ts               # Constante TECHNICAL_TEXT_CLASS e formatadores
```

---

## Convenções Não Negociáveis

1. **Nunca dado fictício**: Toda estação, cidade, país, bitrate e idioma vem da API real ou de `data/cities.json`. Campos ausentes na API são omitidos, nunca inventados.
2. **Camada de isolamento de API**: Componentes clientes nunca chamam a Radio Browser API diretamente. As requisições passam exclusivamente por rotas de API em `app/api/radio/` com runtime Node.js e pool de mirrors de DNS resiliente.
3. **Resiliência de Stream**: Toda tentativa de reprodução possui timeout (8s), fallback automático para `fallbackUrl` e recuperação graciosa de erros (`TUNING…` → `LIVE` ou `SIGNAL LOST`). A interface nunca trava por rádio offline.
4. **Padrão de texto técnico unificado**: Usar sempre a constante `TECHNICAL_TEXT_CLASS` de `lib/format.ts` para metadados, títulos técnicos, tags e badges.
5. **Persistência local**: Favoritos, histórico de reprodução e cidades visitadas são gravados no `localStorage` via hooks dedicados.
6. **Player Contínuo**: O áudio reside no `GlobalPlayer` no `RootLayout`. A navegação entre as abas (`/`, `/discover`, `/library`) não desmonta o player nem interrompe a reprodução da rádio ativa.
7. **Responsividade Mobile**: Em telas pequenas (`< 768px`), o Explore organiza-se em coluna vertical (mapa na metade superior, lista na metade inferior), e os controles do player tornam-se compactos sem transbordamento.
8. **Qualidade contínua**:
   - Rodar testes: `npm test` (deve passar 100% dos testes sem erros);
   - Lint: `npm run lint` (zero warnings e zero erros);
   - Typecheck: `npx tsc --noEmit` (zero erros de tipagem).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
