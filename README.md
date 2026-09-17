# Radio Atlas 🌍📻

> **Um mundo de sons. Milhares de estações. Um só planeta.**  
> Uma aplicação web imersiva e cinematográfica para explorar e ouvir rádios ao vivo de todo o globo terrestre em tempo real.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Testes](https://img.shields.io/badge/Testes-Vitest%20(100%25%20Aprovados)-brightgreen?style=flat&logo=vitest)](https://vitest.dev/)

---

## ✨ Principais Funcionalidades

- 🌐 **Globo 3D e Mapa 2D com Alternância Fluida**:
  - **Modo Globo 3D**: Projeção esférica realista com cenário espacial completo: mais de 250 estrelas cintilantes animadas em Canvas GPU, meteoros/estrelas cadentes, Lua com crateras e linha terminadora dia/noite, além de anel de brilho atmosférico azul.
  - **Modo 2D Mercator**: Visão plana clássica para navegação rápida e ampla.
- 📻 **Streaming Global Real e Conexões Resilientes**:
  - Dados em tempo real fornecidos pela comunidade [Radio Browser API](https://www.radio-browser.info/) através de uma camada de proxy própria no Node.js com rotação automática de servidores espelho (*DNS mirror pool*).
  - Timeout inteligente de conexão de 8 segundos, transição automática para link alternativo (*fallback*) e recuperação graciosa de sinal.
- 🎵 **Player Contínuo e Persistente**:
  - O áudio nunca para: navegue livremente entre **Explore**, **Discover** e **Library** sem interrupção de reprodução.
  - Integração com **MediaSession API** (fones Bluetooth, controles de mídia do teclado e central do sistema operacional).
  - Suporte completo a atalhos de teclado (Espaço para play/pause, tecla `M` para mudo, setas para navegar, `?` para ver atalhos).
- 🔍 **Busca Global Instantânea (`Ctrl+K` ou `⌘K`)**:
  - Command palette com busca preditiva rápida por nome da emissora, cidades, países e gêneros musicais (*Jazz, Ambient, Rock, Classical, etc.*), com histórico recente salvo localmente.
- 📱 **Experiência Mobile de Primeira Classe**:
  - Scroll vertical contínuo e unificado no painel lateral de estações, sem bloqueios de toque no iOS Safari ou Android.
  - Carrossel horizontal deslizável (*swipe*) nas estações em destaque (**Spotlight**) no celular.
  - Botão de recolhimento rápido para visualizar o mapa em tela cheia com um toque.
  - Modo mini-player compacto para economizar espaço de tela.
- 🎚️ **Filtro de Qualidade HQ & Escopo Geográfico**:
  - Alterne entre emissoras da cidade selecionada (**LOCAL**) ou as mais populares do país inteiro (**WORLD**).
  - Botão de filtro **HQ ONLY (≥128K)** para ouvir apenas transmissões de alta fidelidade sonora.
- 📚 **Biblioteca Pessoal (Persistência no Dispositivo)**:
  - Salve suas estações favoritas, acesse o histórico recente de rádios reproduzidas e acompanhe todas as cidades do mundo que você já "visitou".
- 🔗 **Deep Linking e Compartilhamento**:
  - Compartilhe o link direto de qualquer estação de rádio ou cidade com um clique (`/?city=...&cc=...&station=...`) com inicialização automática do áudio.

---

## 🛠️ Tecnologias Utilizadas

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Biblioteca de UI**: [React 19](https://react.dev/)
- **Linguagem**: [TypeScript 5](https://www.typescriptlang.org/)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/) (Design editorial escuro, minimalista e cinematográfico)
- **Motor Cartográfico**: [MapLibre GL](https://maplibre.org/) com tiles vetoriais CARTO Dark Matter
- **Gerenciamento de Estado de Rede**: [TanStack React Query](https://tanstack.com/query)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Testes Automatizados**: [Vitest](https://vitest.dev/) e [Testing Library](https://testing-library.com/)

---

## 🚀 Como Executar Localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) versão 18.18+ ou 20+
- `npm` ou `pnpm`

### Passo a passo

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/nelsongeraidine/radio_atlas.git
   cd radio_atlas
   ```

2. **Instalar as dependências:**
   ```bash
   npm install
   ```

3. **Iniciar o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Acessar no navegador:**
   Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 🧪 Testes e Qualidade de Código

O Radio Atlas conta com testes automatizados rigorosos e zero erros de tipagem ou linting:

```bash
# Executar a suíte de testes unitários e de integração (Vitest)
npm test

# Executar checagem estrita de tipos TypeScript
npx tsc --noEmit

# Executar verificação de lint (ESLint)
npm run lint

# Executar build de produção otimizado
npm run build
```

---

## 📂 Arquitetura do Projeto

```text
app/
  ├── layout.tsx              # RootLayout com Inter, Providers e Player Global
  ├── page.tsx                # Página Explore (Mapa 3D/2D + Painel de Estações + Deep Linking)
  ├── discover/page.tsx       # Página Discover (Carrosséis temáticos e editoriais)
  ├── library/page.tsx        # Página Library (Favoritos, Histórico e Cidades Visitadas)
  └── api/radio/              # Rotas de API Node.js resilientes (seed, stations, countries, search)
components/
  ├── WorldMap.tsx            # Mapa MapLibre GL interativo (globo 3D/2D com estrelas, lua e atmosfera)
  ├── CityOverlay.tsx         # Cabeçalho da localidade com alternância LOCAL / WORLD
  ├── StationList.tsx         # Lista completa de estações com filtro HQ (≥128k)
  ├── StationCard.tsx         # Card individual de emissora com play e favoritos
  ├── RadioPlayer.tsx         # Player de áudio com visualizer, volume, atalhos e compartilhamento
  ├── GlobalPlayer.tsx        # Container montado no layout raiz que garante persistência do som
  ├── AudioVisualizer.tsx     # Visualizador de áudio minimalista com animação CSS
  ├── GlobalSearch.tsx        # Command palette (Ctrl+K / ⌘K) com busca por gênero e histórico
  ├── DiscoverSection.tsx     # Seção de carrossel temático no Discover
  ├── Spotlight.tsx           # Destaques em carrossel horizontal (mobile) e lista (desktop)
  └── Onboarding.tsx          # Tela de introdução adaptativa ao fuso horário
lib/
  ├── radio-api/              # Cliente Node.js com rotação de servidores DNS
  ├── library.ts              # Hooks de persistência local (useFavorites, useRecentSearches, etc.)
  ├── player-context.tsx      # Contexto React global para tocar sem pausas entre telas
  └── format.ts               # Constantes tipográficas e formatadores de texto
```

---

## 👨‍💻 Autor e Créditos

Desenvolvido por **Nelson Geraidine**:
- **Instagram**: [@nelsonggeraidine](https://instagram.com/nelsonggeraidine)
- **LinkedIn**: [linkedin.com/in/nelsonggeraidine](https://linkedin.com/in/nelsonggeraidine)

*Dados das emissoras providos pela comunidade aberta [Radio Browser](https://www.radio-browser.info/). Tiles de mapa providos por [CARTO](https://carto.com/) via OpenStreetMap.*
