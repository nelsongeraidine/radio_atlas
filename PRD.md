# PRD — Radio Atlas

Instruções de engenharia (stack, arquitetura, convenções) em `CLAUDE.md`. Este arquivo cobre o que construir, não como.

## Visão geral

Webapp para descobrir e ouvir rádios ao vivo do mundo todo através de uma experiência visual, geográfica e imersiva. Conceito central: explorar o planeta e descobrir o que está tocando em cada cidade agora.

## Identidade visual

Interface premium, minimalista, cinematográfica, estilo app editorial de música/viagem: fundo escuro, tipografia grande com espaço generoso, textos secundários pequenos em caixa alta, translucidez, bordas discretas, animações de 200-500ms.

Evitar: aparência de dashboard corporativo, excesso de cards, gradientes chamativos, cores muito saturadas.

**Padrão de texto técnico** (usar em todo lugar que exibe metadado de estação/cidade): caixa alta, pequeno, formato `CIDADE, PAÍS` / `N STATIONS` / `BITRATE KBPS` / `LIVE` / `IDIOMA` / `GÊNERO`. Nomes de cidade em destaque terminam com ponto final (ex: "Paris.") como parte da identidade gráfica.

Não usar nome, logo ou texto de nenhuma plataforma de rádio existente.

## Navegação

Barra superior: `RADIO ATLAS` + Explore / Discover / Library à esquerda. Busca "Search stations, cities or countries" com atalho ⌘K/Ctrl+K à direita, abre command palette global.

## Tela Explore (principal)

Globo 3D ou mapa mundial interativo ocupando quase toda a tela: arrastar, zoom, clicar em país/cidade/marcador. Pontos luminosos indicam locais com rádios; agrupar geograficamente em zoom distante, revelar cidades individuais ao aproximar. Nunca renderizar milhares de marcadores simultâneos.

Ao selecionar cidade: animação suave de aproximação, mostrar nome + país + contagem de estações + ação "Somewhere new" (escolhe outra cidade aleatória e anima até ela). Lista de estações da cidade com nome, logo, país, idioma, gênero, bitrate, status e botão play.

Controle LOCAL/WORLD: LOCAL prioriza estações próximas à cidade selecionada, WORLD permite descoberta global.

**Spotlight**: cerca de 5 estações selecionadas, reprodução instantânea ao clicar.

## Player

Fixo na parte inferior, discreto: logo, nome da rádio, cidade/país, faixa/programa atual quando a API fornecer. Controles: anterior, play/pause, próxima, volume, favoritar, compartilhar. Mostrar LIVE e bitrate. Animação de onda sonora minimalista durante reprodução, sem waveform exagerada.

## Discover

Página editorial com carrosséis horizontais por seção: Around the world, Something different, Late night, Electronic, Jazz, News & Talk, Brazil, Europe, Asia.

## Library

Abas: Favorites, Recently played, Cities visited, Stations followed. Favoritar via ícone de coração.

## Busca global (command palette)

Ctrl+K / ⌘K abre busca central, placeholder "Find a frequency…", pesquisa por rádio, cidade, país, gênero, idioma, resultados agrupados por categoria (RADIOS / CITY / COUNTRY).

## Random Radio

Ação "Take me somewhere": escolhe cidade aleatória, anima o mapa, seleciona e toca uma rádio disponível. Mensagens de transição dinâmicas e variadas (ex: "Searching the airwaves…", "Tuning into Tokyo…").

## Mapa

Visual limpo: sem estradas, lojas ou pontos de interesse irrelevantes. Prioridade: continentes, países, oceanos, cidades, estações. Deve funcionar como interface de exploração, não como mapa tradicional de navegação.

## Estados de interação

Hover de cidade e de estação seguem o padrão de texto técnico definido acima. Estados do player: `TUNING…` (carregando), `TUNED IN` (tocando), `SIGNAL LOST` com ação `TRY AGAIN` (erro).

## Onboarding

Detecção opcional de país do usuário sem exigir GPS ("Good morning from Brazil." + sugestões locais). Entrada inicial: planeta aparece lentamente, "A world of sound." → "Thousands of stations. One planet." → botão "Start exploring", poucos segundos, pulável. Estado inicial pós-onboarding: cidade de destaque automática (ex. Paris) com Spotlight de 5 rádios reais.

## Responsividade

Desktop: experiência completa, mapa grande. Tablet: controles reorganizados. Mobile: mapa ocupa cerca de metade da tela, estação selecionada abaixo, player fixo, menus compactos. Em nenhum breakpoint a interface deve virar um dashboard cheio de cards.

## Critério de aceite

Produto real e funcional, não mockup: navegar pelo planeta, selecionar país/cidade, encontrar e reproduzir rádios reais, pausar, trocar, controlar volume, pesquisar, favoritar, ver recentes, descobrir aleatoriamente. Resultado deve parecer produto premium editorial, não um diretório tradicional de rádios.
