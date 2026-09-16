# Radio Atlas — Fase 1: Core Explore — Design

Referências: `../../../PRD.md` (produto), `../../../CLAUDE.md` (engenharia).

Este documento cobre apenas a Fase 1: o núcleo mínimo de ponta a ponta do produto (mapa → cidade → estações → play). Fases seguintes (Search/Command Palette, Discover, Library, Onboarding/polish) têm spec própria, a ser escrita quando esta fase estiver concluída.

## Objetivo da Fase 1

Usuário abre o app, vê um mapa mundial com marcadores reais de cidades com rádios, clica num marcador, vê a lista de estações reais daquela cidade, clica em play numa estação e ouve o stream ao vivo. Sem mock, sem placeholder.

## Escopo incluído

- `WorldMap`: mapa 2D com MapLibre GL, marcadores agregados por cidade/região, clique seleciona cidade.
- `CityOverlay`: nome + país + contagem de estações da cidade selecionada.
- `StationList` + `StationCard`: lista de estações reais (nome, idioma, gênero, bitrate, status) com skeleton loading.
- `RadioPlayer`: play/pause/volume, estados `TUNING…` / `TUNED IN` / `SIGNAL LOST` + `TRY AGAIN`, lazy load do stream.
- `AudioVisualizer`: versão simples (CSS/Canvas leve) para indicar reprodução ativa.
- `lib/radio-api/`: camada de abstração contra a Radio Browser API.
- Rotas server-side `/api/radio/seed` e `/api/radio/stations`.

## Fora de escopo (fases futuras)

Command palette/busca global, página Discover, Library (favoritos/histórico/persistência), globo 3D, onboarding animado, controle LOCAL/WORLD, Random Radio, compartilhar, anterior/próxima faixa entre estações.

## Stack e setup

- Next.js (App Router) + TypeScript + Tailwind CSS, gerenciado com **pnpm**.
- MapLibre GL para o mapa (decisão: 2D em vez de globo 3D nesta fase, ver ADR abaixo).
- Framer Motion para as transições de 200-500ms exigidas no PRD.
- Lucide Icons.
- TanStack Query para cache/dedup de requisições no client.
- Vitest + React Testing Library para testes.

## ADR: mapa 2D (MapLibre) em vez de globo 3D

CLAUDE.md deixava a porta aberta para globo 3D "se a performance permitir". Decisão: começar com MapLibre GL 2D. Motivo: sem token pago, tiles vetoriais fáceis de customizar para visual limpo (sem POI/estradas), menor risco técnico e de performance em mobile. Globo 3D fica como possível evolução visual de fase futura, não bloqueia a Fase 1.

## ADR: dataset estático de coordenadas de cidade

A Radio Browser API não tem conceito formal de "cidade": tem `country` (nativo, com `stationcount`) e um campo `state` (pensado para estado/província, mas na prática muitos operadores preenchem com nome de cidade). Nenhum dos dois vem com latitude/longitude de cidade.

Decisão: empacotar `data/cities.json`, um dataset estático curado (~100-150 cidades principais do mundo, cobrindo os países mais relevantes na Radio Browser) com `{ city, countryCode, lat, lon }`. Isso serve só para posicionar o marcador no mapa — a contagem de estações exibida em cada marcador e toda a lista de estações continuam vindo 100% da Radio Browser (`/json/states/{country}` casado por nome de cidade/estado, depois `/json/stations/search?country=&state=`). Coordenada de cidade é fato geográfico objetivo, não é "dado de rádio" fictício, então não viola a regra de nunca inventar estação/bitrate/idioma/etc.

Efeito colateral positivo: como o dataset é curado e pequeno, cumpre naturalmente a regra de "nunca renderizar milhares de marcadores simultâneos".

## Arquitetura

```
app/
  page.tsx                    Explore (tela principal)
  api/radio/
    seed/route.ts             cidades (do dataset) casadas com contagem real de estações via Radio Browser
    stations/route.ts         estações por cidade/país (?country=&city=)
lib/
  radio-api/
    mirrors.ts                DNS SRV lookup (dns.resolveSrv) + cache em memória (TTL 1h) + fallback ordenado
    client.ts                 fetch tipado contra o mirror ativo, timeout via AbortController, normalização de campos
    types.ts                  tipos TS das entidades (Station, Country, City)
data/
  cities.json                 dataset estático curado de cidades (city, countryCode, lat, lon)
components/
  WorldMap.tsx
  CityOverlay.tsx
  StationList.tsx
  StationCard.tsx
  RadioPlayer.tsx
  AudioVisualizer.tsx
```

Princípio inegociável (CLAUDE.md): o client nunca fala com `radio-browser.info` direto, sempre via `/api/radio/*`. Essas rotas rodam em Node runtime (não Edge), porque `dns.resolveSrv` exige Node runtime — o navegador não tem capacidade de resolução DNS SRV, então a resolução de mirrors e o fallback entre eles precisam acontecer no servidor.

## Fluxo de dados

1. **Carga inicial**: `page.tsx` busca `/api/radio/seed`, que cruza `data/cities.json` (coordenadas) com `/json/states/{country}` da Radio Browser (contagem real por estado/cidade), cacheado no servidor. `WorldMap` desenha só esses pontos curados — nunca o catálogo inteiro.
2. **Clique num marcador de cidade**: TanStack Query busca `/api/radio/stations?country=X&city=Y`. `CityOverlay`/`StationList` mostram skeleton discreto durante o carregamento.
3. **Resultado chega**: `CityOverlay` mostra nome/país/contagem; `StationList` renderiza `StationCard`s com dados reais.
4. **Clique em Play**: `RadioPlayer` cria o elemento de áudio e carrega o stream só agora (lazy load). Estado `TUNING…`.
5. **Stream conecta**: estado `TUNED IN`, toca. Se falha/timeout: `SIGNAL LOST` + `TRY AGAIN`, que tenta de novo e usa `url_resolved` alternativa da própria Radio Browser antes de desistir.
6. **Troca de estação/cidade**: repete passos 2-4; cidades já visitadas voltam do cache do TanStack Query sem refetch.

## Tratamento de erro

- **Mirror fora do ar**: `mirrors.ts` mantém lista ordenada de mirrors resolvidos via DNS SRV; se o mirror ativo falhar, tenta o próximo automaticamente. Se todos falharem, a rota `/api/radio/*` devolve erro estruturado e a UI mostra estado de erro discreto (nunca tela branca).
- **Timeout**: `AbortController` com timeout de 8s em toda chamada à Radio Browser (rotas server e client).
- **Stream não conecta**: listener de erro no `<audio>` → `SIGNAL LOST`; `TRY AGAIN` tenta `url_resolved` alternativa antes de desistir.
- **CORS de stream**: sem proxy de áudio nesta fase — `<audio>` não está sujeito a CORS para reprodução simples. Reavaliar só se aparecer caso real quebrado.

## Testes

- `lib/radio-api/`: unitários (Vitest) mockando DNS e fetch, cobrindo fallback entre mirrors e normalização de dados.
- Componentes: React Testing Library para `RadioPlayer` (máquina de estados) e `StationList` (skeleton → dados → erro).
- Sem E2E automatizado nesta fase; teste manual no browser antes de considerar a fase concluída.

## Critério de aceite da Fase 1

- Mapa carrega com marcadores reais (sem catálogo completo no load inicial).
- Clicar numa cidade mostra estações reais dela.
- Play/pause/volume funcionam com stream real.
- Estados TUNING/TUNED IN/SIGNAL LOST + TRY AGAIN funcionam.
- Nenhum dado fictício em nenhum campo exibido.
- Zero placeholder/TODO/função vazia.
