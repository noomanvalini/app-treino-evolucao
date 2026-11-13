# ClipzBody — Design System & Google Stitch Specification (`DESIGN.md`)

> **Propósito deste documento**: Servir como referência de Design System e contexto base para o **Google Stitch** (ou ferramentas de geração de UI como v0 / Figma AI) para refinar e evoluir a interface do **ClipzBody** mantendo sua identidade visual, hierarquia de dados e usabilidade mobile-first.

---

## 1. Visão do Produto & Direção Estética

- **Nome do App**: ClipzBody
- **Categoria**: Fitness Tracker / Acompanhamento de Hipertrofia, Força (1RM) e Medidas Corporais (PWA Mobile-First).
- **Idioma da Interface**: Português (pt-BR).
- **Personalidade Visual**:
  - **Dark Athletic Performance**: Fundo escuro profundo (`#0D1117`) com superfícies translúcidas em glassmorphism sutil (`rgba(255, 255, 255, 0.05)`) e acentos energéticos em **Verde-Limão Neon (`#D3E156`)**.
  - **Data-Driven & Limpo**: Foco em leitura rápida durante o treino (números grandes em fonte condensada/mono, alto contraste, alvos de toque generosos de no mínimo `44x44px`).
  - **Inspiração de Referência**: Hevy, Whoop, Nike Training Club (Dark Mode), Apple Fitness+.

---

## 2. Paleta de Cores (Design Tokens)

| Token / Papel | Valor Hex / RGBA | Equivalente Tailwind / CSS Var | Uso Principal |
| :--- | :--- | :--- | :--- |
| **Background Principal** | `#0D1117` | `bg-background` / `var(--background)` | Fundo global de todas as telas |
| **Surface / Card Base** | `rgba(255, 255, 255, 0.05)` (`#161B22`) | `bg-slate-card` / `var(--card)` | Cards de exercícios, painéis e modais |
| **Surface Elevada / Hover** | `rgba(255, 255, 255, 0.08)` (`#1E2530`) | `bg-slate-card-light` | Inputs, linhas de séries, chips inativos, hover |
| **Surface Mídia (GIFs)** | `#090D16` / `#FFFFFF` (container) | `bg-slate-900` | Moldura de miniaturas (thumbnails) de exercícios |
| **Borda Padrão** | `rgba(255, 255, 255, 0.08)` | `border-border` | Divisórias sutis e contornos de cards |
| **Borda Destaque / Ativa** | `rgba(211, 225, 86, 0.35)` | `border-lime-neon/35` | Série concluída, card selecionado, input em foco |
| **Primary Accent (Lime Neon)** | `#D3E156` | `text-lime-neon` / `bg-lime-neon` | CTAs principais, PRs (1RM), abas ativas, evolução positiva |
| **Primary Accent Hover** | `#E2ED72` | `bg-lime-neon-hover` | Estado pressionado/hover do botão principal |
| **Secondary Accent (Amber Gold)** | `#F59E0B` / `#FBBF24` | `text-amber-gold` | Insights de IA, alertas de treino em preparo, troféus |
| **Danger / Queda** | `#FF6E61` | `text-danger` / `bg-danger` | Exclusão, descarte de treino, regressão de carga (`▼ -X%`) |
| **Texto Primário** | `#F8FAFC` | `text-slate-100` | Títulos, nomes de exercícios, números principais |
| **Texto Secundário** | `#94A3B8` | `text-slate-400` | Subtítulos, labels de formulário, histórico anterior |
| **Texto Muted** | `#64748B` | `text-slate-500` | Placeholders, datas secundárias, legendas |

---

## 3. Tipografia & Hierarquia

- **Fonte de Títulos e Métricas de Destaque (`--font-heading`)**: **Oswald** (`400`, `500`, `600`, `700`), `letter-spacing: -0.02em`.
  - Usada em scores gerais (`+12.4%`), valores de `1RM Estimado`, títulos de seções de impacto e modais de conquista.
- **Fonte de Interface e Leitura (`--font-sans`)**: **Inter** (`400`, `500`, `600`, `700`, `800`).
  - Usada em nomes de exercícios, botões, abas, tabelas de séries e textos explicativos.
- **Fonte Numérica / Cronômetro (`font-mono`)**: Monospace tabular (`tabular-nums`).
  - Usada no cronômetro de treino (`00:42:15`), inputs de carga (`kg`), repetições (`reps`) e datas curtas (`13/11`).

### Escala Tipográfica Mobile (`max-w-md` / `390px–430px` viewport)
- **Eyebrow / Sub-label**: `10px` (`0.625rem`), `uppercase`, `font-bold`, `tracking-wider` (`0.08em`), cor `#94A3B8`.
- **Body / Lista Compacta**: `12px` (`0.75rem`) a `14px` (`0.875rem`), `font-medium` ou `font-bold`.
- **Card Title (Nome do Exercício)**: `14px` (`0.875rem`) a `15px`, `font-bold`, `#F8FAFC`, truncado em 1 linha quando necessário.
- **Page Header (H1)**: `22px` a `24px` (`1.5rem`), `font-extrabold`, `#F8FAFC`.
- **Hero Metric / 1RM / Score**: `24px` a `32px`, `font-black`, `#D3E156`.

---

## 4. Layout, Grid & Geometria

- **Container Mobile-First**:
  - Largura máxima centralizada de `448px` (`max-w-md`), padding horizontal de `16px` (`px-4`), padding inferior de `80px–112px` (`pb-20` / `pb-28`) para acomodar a barra de navegação inferior fixa ou barra de ação flutuante.
- **Border Radius (Arredondamento)**:
  - **Cards principais e Modais**: `16px` a `24px` (`rounded-2xl` / `rounded-3xl`).
  - **Botões e Inputs**: `10px` a `12px` (`rounded-xl`).
  - **Thumbnails de Exercícios**: `12px` (`rounded-xl`), tamanho `40x40px` (compacto) ou `64x64px` (card detalhado), com `object-cover` e fundo contrastante.
  - **Pills / Abas de Filtro**: `9999px` (`rounded-full`) ou `12px` (`rounded-xl`).
- **Efeitos de Superfície**:
  - **Headers e Navegação Fixa**: `backdrop-blur-md` / `backdrop-blur-lg` com fundo semi-transparente (`bg-[#0D1117]/90`).
  - **Brilho Sutil (Glow)**: Sombra neon suave nos botões primários (`shadow-lg shadow-[#D3E156]/20`).

---

## 5. Componentes-Chave do Ecossistema ClipzBody

### 5.1. Bottom Navigation (5 Abas Fixas)
Barra inferior fixa com ícone + rótulo curto:
1. **Início (`/dashboard`)** — Mapa corporal interativo, Score Geral de Força, Volume Semanal e botão de iniciar treino.
2. **Força (`/strength`)** — Catálogo de exercícios por grupo muscular, cálculo de 1RM (Brzycki), gráfico de evolução por exercício e histórico de sessões.
3. **Treinar (`/workout/active`)** — Destaque central ou card flutuante para iniciar/retomar sessão de treino em tempo real.
4. **Medidas (`/measures`)** — Registro de peso corporal, dobras cutâneas (% BF Pollock) e circunferências (braço, peito, cintura, coxa, etc.).
5. **IA / Insights (`/insights`)** — Coach inteligente com análise semanal de volume, progressão e recomendações.

### 5.2. Card de Exercício (Tela de Força `/strength`)
- **Topo do Card**:
  - Esquerda: Thumbnail animada (GIF `64x64px`, cantos arredondados).
  - Centro: Nome do exercício em destaque + Badge (`PADRÃO` em verde-limão translúcido ou `CRIADO` em cinza) + Última carga registrada (`Última: 60kg × 10 reps (13/11/2026)`).
  - Direita: Ícones discretos de ação rápida (Editar lápis, Excluir lixeira).
- **Rodapé de Métricas do Card**:
  - `1RM Estimado` em destaque (`#D3E156`, ex: `80.0 kg`).
  - `Evolução` com badge semântico (`▲ +4.5%` em verde ou `▼ -2.1%` em coral).
  - Botão primário compacto `+ Carga` (`bg-[#D3E156] text-slate-900 font-bold`).
- **Acordeão Expansível (`Gráfico & Histórico`)**:
  - Gráfico de linha suave (curva de Bézier) com área preenchida em gradiente verde-limão mostrando a evolução do PR (1RM máximo de cada sessão).
  - Lista compacta de sessões anteriores (`DD/MM | 60kg × 10 | PR 80kg | ▲ +4.5% >`) que abre modal com todas as séries ao tocar.

### 5.3. Card de Exercício em Treino Ativo (`/workout/active`)
- **Header do Exercício**: Thumbnail `40x40px` + Nome do Exercício + Contador `2/3 séries` + Botão Play (`▶` em verde-limão para abrir modal com GIF grande demonstrativo) + Botão Remover.
- **Tabela de Séries (Grid de 12 colunas)**:
  - `Série` (badge numerado `1`, `2`, `3`).
  - `Anterior` (referência do último treino, ex: `50kg × 10`).
  - `Carga (kg)` (input numérico centralizado).
  - `Reps` (input numérico centralizado).
  - `Check` (botão quadrado com `✓` que fica verde-limão neon ao concluir a série e dispara o cronômetro de descanso).

### 5.4. Modal Seletor de Exercícios (`Escolher Exercício`)
- **Posicionamento**: Centralizado na tela (`items-center justify-center p-4`) com `max-h-[82vh]`, cantos `rounded-3xl`, borda sutil e fundo `backdrop-blur-sm`.
- **Estrutura Interna Fixa (`shrink-0`)**:
  - Header com ícone de haltere + título `"Escolher Exercício"` + botão fechar `X`.
  - Barra de busca com ícone de lupa (`Buscar por nome...`).
  - Faixa horizontal de filtros de grupos musculares (`Todos`, `Peito`, `Costas`, `Ombro`, `Bíceps`, `Tríceps`, `Quadríceps`, `Posterior de Coxa`, etc.) com altura preservada (`shrink-0`) e rolagem horizontal suave sem barra aparente.
- **Lista Rolável (`flex-1 min-h-0 overflow-y-auto`)**:
  - Cards compactos com Thumbnail GIF `40x40px`, Nome do Exercício, Grupo Muscular + Última carga (`Quadríceps • Último: 50kg × 10`), botão `▶` (ver GIF) e botão `+` (adicionar ao treino).

---

## 6. Prompts Prontos para Usar no Google Stitch

Você pode copiar os blocos abaixo diretamente no **Google Stitch** para gerar novas propostas visuais de cada tela:

### Prompt 1 — Dashboard Principal (`/dashboard`)
> **Prompt para o Stitch**:
> Design a dark-mode mobile fitness app dashboard screen named "ClipzBody" (viewport 412x915px). Use a deep dark background (`#0D1117`), translucent dark cards (`rgba(255,255,255,0.05)` with `1px solid rgba(255,255,255,0.08)` border and `20px` border radius), and energetic Lime Neon (`#D3E156`) as the primary accent color. Fonts: Oswald for large metrics and Inter for UI text.
> Include:
> 1. Top user greeting header with avatar, streak/status badge, and a prominent neon-accented "Iniciar Treino do Dia" CTA card.
> 2. A "Score Geral de Força" summary card showing overall strength evolution (`▲ +8.4%`) and an interactive front/back anatomical Body Map SVG where active muscle groups glow in Lime Neon (`#D3E156`).
> 3. A "Volume Semanal" horizontal bar chart card comparing sets per muscle group.
> 4. An AI Weekly Insights card with a subtle amber/gold (`#F59E0B`) sparkle icon.
> 5. A sleek 5-item bottom navigation bar (Início, Força, Medidas, Insights, Perfil).

### Prompt 2 — Tela de Execução de Treino Ativo (`/workout/active`)
> **Prompt para o Stitch**:
> Design a dark-mode mobile active workout tracker screen for "ClipzBody" (`#0D1117` background, `#D3E156` lime neon accent, Inter + monospace fonts).
> Include:
> 1. Sticky top header with back arrow, editable workout title ("Treino A - Peito e Tríceps"), live monospace timer (`00:34:12`) with pause button, "Descartar" action in coral red (`#FF6E61`), and a thin neon progress bar (`6 de 12 séries concluídas • 50%`).
> 2. Compact 2-column summary strip showing "Volume Total: 4.320 kg" and "Exercícios: 4".
> 3. Exercise cards with a 40x40px rounded exercise GIF thumbnail, exercise name ("Supino Inclinado com Halteres"), muscle subtitle ("Peito • 2/3 séries"), a neon play button to preview the exercise GIF, and a 5-column set table (Série, Anterior `32kg × 10`, Carga kg input, Reps input, and a neon Checkmark button).Completed sets should have a subtle lime-neon tinted row background.
> 4. Fixed bottom bar with a secondary "Descanso (01:30)" timer button and a primary full-width Lime Neon CTA button "Finalizar Treino (6 séries)".

### Prompt 3 — Modal "Escolher Exercício" e Catálogo de Força (`/strength`)
> **Prompt para o Stitch**:
> Design a centered mobile modal dialog ("Escolher Exercício") and background strength catalog screen for the dark-mode fitness app "ClipzBody" (`#0D1117` background, `#161B22` modal surface, `#D3E156` lime neon accent, `24px` border radius).
> Inside the centered modal (`max-height: 82vh`):
> 1. Header with dumbbell icon, title "Escolher Exercício", and close button.
> 2. Search input with magnifying glass ("Buscar por nome...").
> 3. Horizontal scrollable muscle group filter pills ("Todos" selected in solid `#D3E156` with dark text, followed by "Peito", "Costas", "Ombro", "Bíceps", "Tríceps") with fixed height so pills never clip.
> 4. Scrollable vertical list of exercise items: each item has a 44x44px rounded animated GIF preview box on a clean contrasting frame, bold exercise title ("Avanço na Máquina Smith"), subtitle with last recorded load ("Quadríceps • Último: 50kg × 10"), a secondary neon Play icon button, and a Plus (`+`) button to add the exercise.

---

## 7. Diretrizes para Refinamento Visual (Checklist de Qualidade)

1. **Contraste de Thumbnails de Exercícios**: Como os GIFs de anatomia possuem fundo claro/branco, exiba as miniaturas dentro de um container `rounded-xl` com `bg-white` ou borda interna sutil (`border border-white/15`) para evitar que GIFs ainda carregando fiquem invisíveis ou com aparência de caixa vazia.
2. **Prevenção de Achatamento em Flexbox**: Em todos os modais com listas roláveis (`max-h-[82vh] flex flex-col`), mantenha `shrink-0` nos cabeçalhos, inputs de busca e barras de abas horizontais, e `flex-1 min-h-0 overflow-y-auto` apenas no container da lista.
3. **Hierarquia de Botões**: Apenas 1 ação primária em verde-limão sólido (`#D3E156`) por seção visível; ações secundárias devem usar fundo translúcido (`bg-lime-neon/10 text-lime-neon border border-lime-neon/20`).
