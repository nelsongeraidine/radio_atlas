# Radio Atlas

Webapp completo e funcional para descobrir e ouvir rádios ao vivo do mundo todo através de uma experiência visual, geográfica e imersiva. Conceito central: explorar o planeta e descobrir o que está tocando em cada cidade agora.

## Stack

React, Next.js, TypeScript, Tailwind CSS, MapLibre GL ou Three.js/Globe.gl (globo 3D se a performance permitir), Radio Browser API (https://www.radio-browser.info/), Lucide Icons, Framer Motion.

Componentes: WorldMap, CityOverlay, StationList, RadioPlayer, GlobalSearch, Spotlight, DiscoverSection, Library, StationCard, AudioVisualizer.

## Identidade visual

Interface premium, minimalista, cinematográfica, no estilo de apps editoriais de música/viagem: fundo escuro, tipografia grande com espaço generoso, textos secundários pequenos em caixa alta, translucidez, bordas discretas, animações de 200-500ms.

Evitar: aparência de dashboard corporativo, excesso de cards, gradientes chamativos, cores muito saturadas.

Padrão de texto técnico (aplicar consistentemente em hovers, cards e player): caixa alta, pequeno, formato `CIDADE, PAÍS` / `N STATIONS` / `BITRATE KBPS` / `LIVE` / `IDIOMA` / `GÊNERO`. Nomes de cidade em destaque grande terminam com ponto final (ex: "Paris.") como parte da identidade gráfica.

Não usar nome, logo ou textos do Astra Radio ou de qualquer outra plataforma existente.

## Navegação

Barra superior minimalista: **RADIO ATLAS** + Explore / Discover / Library à esquerda; busca "Search stations, cities or countries" com atalho ⌘K/Ctrl+K à direita, abrindo command palette global.

## Explore (tela principal)

Globo 3D ou mapa mundial interativo ocupando quase toda a tela: arrastar, zoom, clicar em país/cidade/marcador. Pontos luminosos indicam locais com rádios; agrupar geograficamente em zoom distante, revelar cidades individuais ao aproximar. Nunca renderizar milhares de marcadores simultâneos.

Ao selecionar cidade: animação suave de aproximação, mostrar nome + país + contagem de estações + ação "Somewhere new" (escolhe outra cidade aleatória e anima até ela). Lista de estações da cidade com nome, logo, país, idioma, gênero, bitrate, status e botão play, dados vindos da API, nunca fictícios.

Controle LOCAL/WORLD: LOCAL prioriza estações próximas à cidade selecionada, WORLD permite descoberta global.

**Spotlight**: ~5 estações selecionadas (dados reais da API), reprodução instantânea ao clicar.

## Player

Fixo na parte inferior, discreto: logo, nome da rádio, cidade/país, faixa/programa atual quando a API fornecer. Controles: anterior, play/pause, próxima, volume, favoritar, compartilhar. Mostrar LIVE e bitrate. Animação de onda sonora minimalista durante reprodução (sem waveform falsa exagerada).

## Discover

Página editorial com carrosséis horizontais por seção: Around the world, Something different, Late night, Electronic, Jazz, News & Talk, Brazil, Europe, Asia.

## Library

Favorites, Recently played, Cities visited, Stations followed. Favoritar via ícone de coração, persistência em localStorage.

## Busca global (command palette)

Ctrl+K / ⌘K abre busca central, placeholder "Find a frequency…", pesquisa por rádio, cidade, país, gênero, idioma, resultados agrupados por categoria (RADIOS / CITY / COUNTRY).

## Random Radio

Ação "Take me somewhere": escolhe cidade aleatória, anima o mapa, seleciona e toca uma rádio disponível. Mensagens de transição dinâmicas e variadas (ex: "Searching the airwaves…", "Tuning into Tokyo…").

## Dados

Radio Browser API para estações, países, cidades, idiomas, tags, codecs, bitrate, stream URLs, favicon, votos, disponibilidade. Nunca dados fictícios quando a API está disponível. Construir camada de abstração que permita trocar/adicionar outra fonte no futuro.

## Mapa

MapLibre GL ou Mapbox GL; globo 3D via Three.js/Globe.gl se performance permitir. Visual limpo: sem estradas, lojas ou POIs irrelevantes. Prioridade: continentes, países, oceanos, cidades, estações. Deve funcionar como interface de exploração, não mapa tradicional de navegação.

## Estados de interação

Hover de cidade e de estação seguem o padrão de texto técnico definido acima. Estados do player: `TUNING…` (carregando), `TUNED IN` (tocando), `SIGNAL LOST` com ação `TRY AGAIN` (erro).

## Performance e streaming

Carregamento progressivo: nunca buscar todas as rádios ao abrir a página, apenas ao selecionar cidade/país, pesquisar ou navegar para uma região. Cache de consultas. Skeleton loading discreto. Streams carregados somente ao clicar em Play.

Rádios podem ficar indisponíveis: implementar timeout, fallback, tratamento de CORS, status de estação, reconexão automática e troca para stream alternativo da mesma estação quando existir. A interface nunca pode travar por causa de uma rádio offline.

## Onboarding

Detecção opcional de país do usuário sem exigir GPS ("Good morning from Brazil." + sugestões locais). Entrada inicial: planeta some lentamente, "A world of sound." → "Thousands of stations. One planet." → botão "Start exploring", poucos segundos, pulável. Estado inicial pós-onboarding: cidade de destaque automática (ex. Paris) com Spotlight de 5 rádios reais.

## Responsividade

Desktop: experiência completa, mapa grande. Tablet: controles reorganizados. Mobile: mapa ocupa ~metade da tela, estação selecionada abaixo, player fixo, menus compactos. Em nenhum breakpoint a interface deve virar um dashboard cheio de cards.

## Critério de entrega

Produto real e funcional, não mockup: navegar pelo planeta, selecionar país/cidade, encontrar e reproduzir rádios reais, pausar, trocar, controlar volume, pesquisar, favoritar, ver recentes, descobrir aleatoriamente. Resultado deve parecer produto premium editorial, não um diretório tradicional de rádios.
