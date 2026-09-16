# Fase 2: Busca Global (Command Palette) — Design

## Contexto

Fase 1 (Core Explore) está em `main`: mapa mundial escuro (CARTO Dark Matter), seleção de
cidade curada via marcador, lista de estações reais por cidade, player. `app/page.tsx` hoje só
tem um header estático (`RADIO ATLAS`), sem navegação nem busca.

PRD.md (linhas 19-21, 45-47) especifica um campo de busca no header com atalho `Ctrl+K`/`⌘K`
que abre uma paleta central (`GlobalSearch`, já nomeado na arquitetura em CLAUDE.md), com
placeholder "Find a frequency…", buscando por rádio/cidade/país, resultados agrupados por
categoria (RADIOS / CITY / COUNTRY). Esta fase implementa exatamente isso; busca por
gênero/idioma fica para uma fase futura (fora de escopo aqui, por decisão explícita).

## Decisões (confirmadas em brainstorming)

1. **Busca por cidade**: só contra as cidades curadas de `data/cities.json` (as mesmas do
   mapa). Selecionar uma cidade nos resultados tem o mesmo efeito que clicar no marcador dela.
2. **Busca por país**: contra a lista completa de países da Radio Browser (`getCountries()`).
   Selecionar um país busca as estações mais populares do país inteiro (sem filtro de
   cidade/estado) — funciona para qualquer país, mesmo sem cidade curada.
3. **Escopo**: só RADIOS / CITY / COUNTRY nesta fase. Gênero e idioma ficam para depois.
4. **Arquitetura de dados**: rotas finas e específicas (uma por fonte de dado), merge e
   agrupamento acontecem no cliente, dentro do componente `GlobalSearch`. Nenhuma rota vira uma
   "busca geral" que devolve os três grupos prontos — mantém o padrão já usado em
   `/api/radio/seed` e `/api/radio/stations`.

## Arquitetura

### Backend (Node-only, `runtime = "nodejs"`, chamada à Radio Browser sempre server-side)

**`lib/radio-api/client.ts`** ganha duas funções novas:

- `searchStationsByName(query: string): Promise<Station[]>` — chama
  `/json/stations/search?name={query}&hidebroken=true&order=clickcount&reverse=true&limit=8`,
  normaliza com `normalizeStation` (já existe). Limit baixo (8) porque é só a pré-visualização
  da paleta, não a lista completa de uma cidade.
- `getStationsByCountry(countryCode: string): Promise<Station[]>` — chama
  `/json/stations/search?countrycode={countryCode}&hidebroken=true&order=clickcount&reverse=true&limit=60`
  (mesma forma de `getStationsByCountryState`, só sem o parâmetro `state`). Usada tanto pela
  busca por país quanto por qualquer seleção futura de "país inteiro".

**Rotas novas:**

- `GET /api/radio/search?q=` → `searchStationsByName(q)`. Sem cache (busca ao vivo,
  por definição muda a cada tecla digitada). 400 se `q` vazio ou ausente; 502 se a Radio
  Browser falhar.
- `GET /api/radio/countries` → `getCountries()`, cacheado em memória com o mesmo padrão TTL
  do `/api/radio/seed` (a lista de países muda raríssimo; TTL de 30 minutos é seguro aqui,
  diferente do TTL curto do seed que existe por causa de falhas parciais por cidade — aqui é
  uma chamada única, sem esse risco).

**Rota existente `/api/radio/stations` muda:** o parâmetro `city` passa a ser opcional.
Sem `city`, chama `getStationsByCountry(countryCode)` em vez de
`getStationsByCountryState(countryCode, city)`. Só `countryCode` continua obrigatório.

### Hooks (`lib/radio-api/hooks.ts`)

- `useCountries()` — TanStack Query simples sobre `/api/radio/countries`, `staleTime` alto
  (mesma lista muda pouco).
- `useStationSearch(query: string)` — TanStack Query sobre `/api/radio/search?q=`, com
  `enabled: query.trim().length > 0` (nunca dispara com campo vazio) e debounce de 300ms
  aplicado no componente antes de mudar o `query` que alimenta o hook (não dentro do hook —
  mantém o hook simples e testável isoladamente).
- `useStations(countryCode, city)` muda: `city` vira `city?: string`, a query key e a URL
  construída passam a omitir `city` quando ausente (reflete a rota que agora aceita
  `city` opcional).

### Componente `GlobalSearch` (novo, `components/GlobalSearch.tsx`)

Modal controlado por estado local próprio (`isOpen`, `query`, `activeIndex` para navegação por
teclado). Ganha `onSelectStation`, `onSelectCity`, `onSelectCountry` como props (mesmo padrão
de callback já usado por `StationList`/`WorldMap`) — o componente não sabe tocar rádio nem
mudar o mapa, só reporta a seleção pra cima.

- Listener global de `keydown` (`⌘K`/`Ctrl+K` abre, `Esc` fecha, `↑`/`↓` navega, `Enter`
  seleciona) registrado num `useEffect` a nível de página (não dentro do próprio modal, porque
  precisa funcionar mesmo com o modal fechado).
- Filtro de CITY e COUNTRY é síncrono no cliente (substring case-insensitive sobre os dados já
  carregados por `useCityMarkers()` e `useCountries()` — nenhuma rede nova para essas duas
  categorias).
- RADIOS vem de `useStationSearch(debouncedQuery)`.
- Cada categoria só renderiza se tiver pelo menos 1 resultado; campo vazio não mostra nenhuma
  categoria (nem chama `/api/radio/search`, graças ao `enabled` do hook).
- Skeleton discreto (reaproveitando o padrão já usado em `StationList`) só na linha de RADIOS
  enquanto a busca ao vivo está em voo; CITY/COUNTRY nunca têm skeleton (são instantâneos).

### Mudanças em `app/page.tsx`

- Header ganha um botão de busca (`⌕ SEARCH ⌘K`, mesmo padrão de texto técnico) que abre a
  paleta.
- Estado de seleção precisa comportar "país inteiro" além de "cidade": troca
  `selectedCity: CityMarker | null` por uma união
  `selection: { type: "city"; city: CityMarker } | { type: "country"; countryCode: string; countryName: string } | null`.
- Painel lateral: se `selection.type === "city"`, renderiza `CityOverlay` + `StationList`
  exatamente como hoje. Se `selection.type === "country"`, renderiza um cabeçalho simples (só
  nome do país, mesma tipografia do `CityOverlay`, sem contagem de "N cidades") +
  `StationList` com `city` omitido.
- Selecionar uma cidade na paleta chama o mesmo handler que o clique no marcador já chama
  (`setSelection({ type: "city", city })`); selecionar um país chama o novo caso; selecionar
  uma rádio chama `setNowPlaying` diretamente (mesmo handler que `StationList` já usa) e não
  mexe em `selection`.

### Erros

- `/api/radio/search` falhar (Radio Browser fora do ar): categoria RADIOS mostra o mesmo texto
  técnico de erro já usado em outros lugares (`Signal lost. Try again.`), CITY/COUNTRY continuam
  funcionando normalmente (são independentes, não dependem da mesma chamada).
- `/api/radio/countries` falhar: paleta simplesmente não mostra a categoria COUNTRY (mesmo
  princípio do `/api/radio/seed` — falha parcial nunca trava a experiência inteira).

## Testes

- `client.test.ts`: casos novos para `searchStationsByName` e `getStationsByCountry` (mesmo
  padrão dos testes existentes de `getStationsByCountryState`).
- Novas rotas (`search/route.test.ts`, `countries/route.test.ts`): 200 caminho feliz, 400/502
  conforme aplicável, cache do `/countries`.
- `stations/route.test.ts` (existente): novo caso cobrindo `city` ausente → chama
  `getStationsByCountry` em vez de `getStationsByCountryState`.
- `GlobalSearch.test.tsx` (novo): abre com atalho, fecha com Esc, filtra CITY/COUNTRY
  sincronamente, debounce de RADIOS, navegação por teclado, cada tipo de seleção chama o
  callback certo, categoria vazia não renderiza.
- `page.test.tsx` (existente): cobre a nova união de estado (seleção de país abre o cabeçalho
  simples + lista, sem cidade).

## Fora de escopo (explicitamente adiado)

- Busca por gênero e idioma (decisão do brainstorming).
- Qualquer cidade do mundo além das curadas (decisão do brainstorming).
- Abas de navegação Explore/Discover/Library do header (fases futuras separadas).
