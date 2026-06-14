# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@antv/infographic` is a declarative infographic visualization engine. It parses an indentation-based DSL (the "infographic syntax"), maps it to a virtual JSX tree of design components, and renders that tree to SVG. The library ships ~200 built-in templates, a built-in editor, SSR support, and PNG/SVG export.

## Commands

```bash
# Development
npm run dev          # Start the dev server (runs the /dev workspace via Vite)

# Build
npm run build        # Full build: clean → ESM → CJS → UMD → size check
npm run build:esm    # ESM only (tsc + tsc-alias)
npm run build:cjs    # CJS only
npm run build:watch  # Watch mode (ESM)

# Test
npm test             # Run all tests with coverage (vitest --run --coverage)
npx vitest run __tests__/unit/syntax   # Run a single test folder

# Lint / format
npm run lint         # ESLint root + site
npm run format       # Prettier (writes in place)

# Full CI pipeline
npm run ci           # build → test → lint
```

Tests run in jsdom (via `vitest.config.ts`). The `__tests__` folder mirrors `src` in its sub-directory structure.

## Architecture

### Data flow

```
Infographic syntax (DSL string)
  └─► parseSyntax()          src/syntax/          YAML-like indent parser → AST → validated data
        └─► parseOptions()   src/options/         Merges with InfographicOptions
              └─► renderSVG() src/jsx/             JSX element tree → SVG string
                    └─► Renderer src/renderer/     Fonts, palettes, patterns, stylize pipeline
```

### Key modules

| Path | Role |
|------|------|
| `src/runtime/Infographic.tsx` | Top-level class: `new Infographic(options)` + `render(syntax)` |
| `src/syntax/` | Fault-tolerant DSL parser (`parser.ts`), schema validation (`schema.ts`), mapper, relations |
| `src/jsx/` | Custom JSX runtime (no React dependency) — `renderer.ts` walks the element tree and serialises to SVG |
| `src/designs/` | All visual building blocks — `items/`, `layouts/`, `structures/`, `components/` |
| `src/templates/` | ~200 named templates that compose designs; registered via `registry.ts` |
| `src/renderer/` | `Renderer` class: fonts, palettes, pattern fills, stylize effects |
| `src/editor/` | Interactive editor built on commands/interactions/plugins (enabled via `editable: true`) |
| `src/exporter/` | `exportToSVG` / `exportToPNGString` |
| `src/ssr/` | Server-side `renderToString` via Node.js path |
| `src/themes/` | Theme registration and lookup |
| `src/resource/` | SVG resource loading (icons, illustrations) |

### JSX setup

The library uses its own JSX runtime (`src/jsx/jsx-runtime.ts`). `tsconfig.json` sets `jsxImportSource` to `@antv/infographic`, so `tsx` files import from the local runtime — **not React**. Path alias `@antv/infographic` resolves to `./src` during development.

### Designs / template hierarchy

- **Templates** (`src/templates/`) are named recipes (e.g., `list-row-simple-horizontal-arrow`). Each template declares which **structure** to use plus default data/design overrides.
- **Structures** (`src/designs/structures/`) compose **layouts** and **items** into a complete visual.
- **Layouts** (`src/designs/layouts/`) handle spatial arrangement (flex, grid, pyramid, funnel…).
- **Items** (`src/designs/items/`) are atomic leaf components (cards, badges, arrows, progress bars…).
- **Components** (`src/designs/components/`) are shared sub-components (Title, ItemLabel, Illus, etc.).

### Build outputs

| Format | Entry | Output |
|--------|-------|--------|
| ESM | `tsc --module ESNext` | `esm/` |
| CJS | `tsc --module commonjs` | `lib/` |
| UMD | Vite (`vite.config.ts`) | `dist/infographic.min.js` |

The `tsc-alias` step rewrites `@antv/infographic` path aliases in the ESM output to relative paths.

## Workspaces

- `dev/` — Vite dev playground (`npm run dev` from root)
- `site/` — Documentation site (`npm run build:site`)

Both are npm workspaces declared in the root `package.json`.
