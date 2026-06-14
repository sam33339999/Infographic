# New Diagram Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 new diagram structure types — Kanban, Treemap, Architecture, State Machine, Requirement, and C4 — each following the established structure/template registration pattern.

**Architecture:** Each diagram is a self-contained structure component in `src/designs/structures/` that receives `{ Title, Item, data, options }` props, renders SVG using the project's custom JSX primitives (`Rect`, `Path`, `Ellipse`, `Text`, `Group`), and registers itself via `registerStructure()`. Graph-based diagrams (Architecture, State Machine, Requirement, C4) reuse the Dagre layout already integrated in `relation-dagre-flow.tsx`. Treemap uses `d3.treemap()` from the already-installed `d3` package. Kanban uses `FlexLayout` with category grouping.

**Tech Stack:** TypeScript + custom JSX runtime (`@antv/infographic`), `@antv/layout` (Dagre), `d3` (treemap), `vitest` (tests).

---

## File Map

### New files
- `src/designs/structures/kanban.tsx` — Kanban structure component
- `src/designs/structures/architecture.tsx` — Architecture diagram structure
- `src/designs/structures/state-machine.tsx` — State machine diagram structure
- `src/designs/structures/requirement.tsx` — Requirement diagram structure
- `src/designs/structures/c4.tsx` — C4 context diagram structure
- `src/designs/structures/treemap.tsx` — Treemap structure (uses d3.treemap)
- `src/templates/kanban.ts` — Kanban template variants
- `src/templates/architecture.ts` — Architecture template variants
- `src/templates/state-machine.ts` — State machine template variants
- `src/templates/requirement.ts` — Requirement template variants
- `src/templates/c4.ts` — C4 template variants
- `__tests__/unit/designs/structures/kanban.test.tsx`
- `__tests__/unit/designs/structures/architecture.test.tsx`
- `__tests__/unit/designs/structures/state-machine.test.tsx`
- `__tests__/unit/designs/structures/requirement.test.tsx`
- `__tests__/unit/designs/structures/c4.test.tsx`
- `__tests__/unit/designs/structures/treemap.test.tsx`

### Modified files
- `src/designs/structures/index.ts` — add 6 new exports
- `src/templates/built-in.ts` — import 6 new template files + register their templates

---

## Task 1: Kanban

Items grouped by `category` field into columns with a colored header per column.

**Files:**
- Create: `src/designs/structures/kanban.tsx`
- Create: `src/templates/kanban.ts`
- Create: `__tests__/unit/designs/structures/kanban.test.tsx`
- Modify: `src/designs/structures/index.ts`
- Modify: `src/templates/built-in.ts`

- [ ] **Step 1.1: Write the failing test**

```tsx
// __tests__/unit/designs/structures/kanban.test.tsx
/** @jsxImportSource ../../../../src */
import { describe, expect, it } from 'vitest';
import type { ComponentType, ParsedInfographicOptions } from '../../../../src';
import { Rect, renderSVG } from '../../../../src';
import type { BaseItemProps } from '../../../../src/designs/items';
import { Kanban } from '../../../../src/designs/structures/kanban';
import type { ParsedData } from '../../../../src/types';
import { minifySvg } from '../../../utils';

const Item: ComponentType<
  Omit<BaseItemProps, 'themeColors'> & Partial<Pick<BaseItemProps, 'themeColors'>>
> = ({ x = 0, y = 0 }) => <Rect x={x} y={y} width={120} height={40} />;

const data: ParsedData = {
  items: [
    { label: 'Task A', category: 'Todo' },
    { label: 'Task B', category: 'In Progress' },
    { label: 'Task C', category: 'Done' },
    { label: 'Task D', category: 'Todo' },
  ],
} as ParsedData;

const options = {
  data,
  themeConfig: { colorBg: '#ffffff', colorPrimary: '#1677ff' },
} as ParsedInfographicOptions;

describe('Kanban', () => {
  it('renders one column header rect per unique category', () => {
    const svg = minifySvg(renderSVG(<Kanban Item={Item} Items={[]} data={data} options={options} />));
    // 3 unique categories → 3 column header rects
    // Each header rect has rx="6"
    const headerRects = svg.match(/rx="6"/g) ?? [];
    expect(headerRects).toHaveLength(3);
  });

  it('renders all items', () => {
    const svg = minifySvg(renderSVG(<Kanban Item={Item} Items={[]} data={data} options={options} />));
    // 4 item rects (20x10 each from mock Item)
    const itemRects = svg.match(/width="120"/g) ?? [];
    expect(itemRects.length).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/designs/structures/kanban.test.tsx
```
Expected: FAIL — `Cannot find module '../../../../src/designs/structures/kanban'`

- [ ] **Step 1.3: Create the Kanban structure**

```tsx
// src/designs/structures/kanban.tsx
import type { ComponentType, JSXElement } from '../../jsx';
import { getElementBounds, Group, Rect, Text } from '../../jsx';
import { BtnAdd, BtnRemove, BtnsGroup, ItemsGroup, ShapesGroup } from '../components';
import { FlexLayout } from '../layouts';
import { getColorPrimary, getPaletteColor, getThemeColors } from '../utils';
import { registerStructure } from './registry';
import type { BaseStructureProps } from './types';

export interface KanbanProps extends BaseStructureProps {
  columnGap?: number;
  itemGap?: number;
  headerHeight?: number;
  columnPadding?: number;
}

export const Kanban: ComponentType<KanbanProps> = (props) => {
  const {
    Title,
    Item,
    data,
    options,
    columnGap = 20,
    itemGap = 12,
    headerHeight = 40,
    columnPadding = 12,
  } = props;
  const { title, desc, items = [] } = data;
  const titleContent = Title ? <Title title={title} desc={desc} /> : null;

  if (!Item || items.length === 0) {
    return (
      <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
        {titleContent}
        <Group><BtnAdd indexes={[0]} x={0} y={0} /></Group>
      </FlexLayout>
    );
  }

  // Group items by category, preserving insertion order
  const categoryOrder: string[] = [];
  const grouped = new Map<string, typeof items>();
  items.forEach((item) => {
    const cat = String((item as any).category ?? 'Backlog');
    if (!grouped.has(cat)) {
      grouped.set(cat, []);
      categoryOrder.push(cat);
    }
    grouped.get(cat)!.push(item);
  });

  const itemBounds = getElementBounds(
    <Item indexes={[0]} data={data} datum={items[0]} positionH="center" />,
  );
  const btnBounds = getElementBounds(<BtnAdd indexes={[0]} />);
  const columnWidth = itemBounds.width + columnPadding * 2;

  const itemElements: JSXElement[] = [];
  const decoElements: JSXElement[] = [];
  const btnElements: JSXElement[] = [];

  let colX = 0;
  categoryOrder.forEach((cat, colIndex) => {
    const colItems = grouped.get(cat)!;
    const primary = getPaletteColor(options, [colIndex]) ?? getColorPrimary(options);
    const themeColors = getThemeColors({ colorPrimary: primary }, options);

    // Column header
    decoElements.push(
      <Rect x={colX} y={0} width={columnWidth} height={headerHeight} fill={primary} rx={6} ry={6} />,
    );
    decoElements.push(
      <Text
        x={colX}
        y={0}
        width={columnWidth}
        height={headerHeight}
        fontSize={14}
        fontWeight="bold"
        fill={themeColors?.colorBg ?? '#ffffff'}
        alignHorizontal="center"
        alignVertical="middle"
      >
        {cat}
      </Text>,
    );

    // Column items
    let itemY = headerHeight + itemGap;
    colItems.forEach((item) => {
      const flatIndex = items.indexOf(item);
      itemElements.push(
        <Item
          indexes={[flatIndex]}
          datum={item}
          data={data}
          x={colX + columnPadding}
          y={itemY}
          positionH="center"
          themeColors={themeColors}
        />,
      );
      btnElements.push(
        <BtnRemove
          indexes={[flatIndex]}
          x={colX + columnWidth - btnBounds.width - 4}
          y={itemY + (itemBounds.height - btnBounds.height) / 2}
        />,
      );
      itemY += itemBounds.height + itemGap;
    });

    // Add button at bottom of column
    btnElements.push(
      <BtnAdd
        indexes={[items.length]}
        x={colX + (columnWidth - btnBounds.width) / 2}
        y={itemY}
      />,
    );

    colX += columnWidth + columnGap;
  });

  return (
    <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
      {titleContent}
      <Group>
        <ShapesGroup>{decoElements}</ShapesGroup>
        <ItemsGroup>{itemElements}</ItemsGroup>
        <BtnsGroup>{btnElements}</BtnsGroup>
      </Group>
    </FlexLayout>
  );
};

registerStructure('kanban', {
  component: Kanban,
  composites: ['title', 'item'],
});
```

- [ ] **Step 1.4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/designs/structures/kanban.test.tsx
```
Expected: PASS

- [ ] **Step 1.5: Create Kanban templates**

```ts
// src/templates/kanban.ts
import type { TemplateOptions } from './types';

export const kanbanTemplates: Record<string, TemplateOptions> = {
  'kanban-simple': {
    design: {
      title: 'default',
      structure: { type: 'kanban' },
      item: { type: 'simple' },
    },
  },
  'kanban-compact-card': {
    design: {
      title: 'default',
      structure: { type: 'kanban' },
      item: { type: 'compact-card' },
    },
  },
  'kanban-badge-card': {
    design: {
      title: 'default',
      structure: { type: 'kanban' },
      item: { type: 'badge-card' },
    },
  },
};
```

- [ ] **Step 1.6: Wire exports and templates**

Add to `src/designs/structures/index.ts` (after the last existing export, before `export type * from './types';`):
```ts
export * from './kanban';
```

Add to `src/templates/built-in.ts` at the top imports block:
```ts
import { kanbanTemplates } from './kanban';
```

Add to `src/templates/built-in.ts` inside the `BUILT_IN_TEMPLATES` object (append before the closing `};`):
```ts
  ...kanbanTemplates,
```

Also add to the `Object.entries(...)` loop at the bottom of `built-in.ts` — actually just spreading into `BUILT_IN_TEMPLATES` is enough.

- [ ] **Step 1.7: Run all tests to check for regressions**

```bash
npm test
```
Expected: All previously passing tests still pass.

- [ ] **Step 1.8: Commit**

```bash
git add src/designs/structures/kanban.tsx src/templates/kanban.ts \
        src/designs/structures/index.ts src/templates/built-in.ts \
        __tests__/unit/designs/structures/kanban.test.tsx
git commit -m "feat: add kanban structure and templates"
```

---

## Task 2: Treemap

Hierarchical nested rectangles using `d3.treemap()`. Input data uses `root` (HierarchyDatum with `children` + `value` on leaf nodes).

**Files:**
- Create: `src/designs/structures/treemap.tsx`
- Create: `__tests__/unit/designs/structures/treemap.test.tsx`
- Modify: `src/designs/structures/index.ts`
- Modify: `src/templates/built-in.ts`

- [ ] **Step 2.1: Write the failing test**

```tsx
// __tests__/unit/designs/structures/treemap.test.tsx
/** @jsxImportSource ../../../../src */
import { describe, expect, it } from 'vitest';
import type { ComponentType, ParsedInfographicOptions } from '../../../../src';
import { Rect, renderSVG } from '../../../../src';
import type { BaseItemProps } from '../../../../src/designs/items';
import { Treemap } from '../../../../src/designs/structures/treemap';
import type { ParsedData } from '../../../../src/types';
import { minifySvg } from '../../../utils';

const Item: ComponentType<
  Omit<BaseItemProps, 'themeColors'> & Partial<Pick<BaseItemProps, 'themeColors'>>
> = ({ x = 0, y = 0 }) => <Rect x={x} y={y} width={20} height={10} />;

const data: ParsedData = {
  items: [
    {
      label: 'Root',
      children: [
        { label: 'A', value: 40 },
        { label: 'B', value: 30 },
        { label: 'C', value: 30 },
      ],
    },
  ],
  root: {
    label: 'Root',
    children: [
      { label: 'A', value: 40 },
      { label: 'B', value: 30 },
      { label: 'C', value: 30 },
    ],
  },
} as unknown as ParsedData;

const options = {
  data,
  themeConfig: { colorBg: '#ffffff', colorPrimary: '#1677ff' },
} as ParsedInfographicOptions;

describe('Treemap', () => {
  it('renders a rect for each leaf node', () => {
    const svg = minifySvg(renderSVG(<Treemap Item={Item} Items={[]} data={data} options={options} />));
    // 3 leaf nodes → 3 colored leaf rects + 1 root rect = 4 rects with fill attribute
    const rects = svg.match(/<rect[^>]+fill="[^u][^>]+"[^>]*\/>/g) ?? [];
    expect(rects.length).toBeGreaterThanOrEqual(3);
  });

  it('renders label text for leaf nodes with space', () => {
    const svg = minifySvg(renderSVG(<Treemap Item={Item} Items={[]} data={data} options={options} />));
    expect(svg).toContain('A');
    expect(svg).toContain('B');
    expect(svg).toContain('C');
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/designs/structures/treemap.test.tsx
```
Expected: FAIL

- [ ] **Step 2.3: Create the Treemap structure**

```tsx
// src/designs/structures/treemap.tsx
import * as d3 from 'd3';
import type { ComponentType, JSXElement } from '../../jsx';
import { Group, Rect, Text } from '../../jsx';
import { BtnsGroup, ShapesGroup } from '../components';
import { FlexLayout } from '../layouts';
import { getColorPrimary, getPaletteColor } from '../utils';
import { registerStructure } from './registry';
import type { BaseStructureProps } from './types';

export interface TreemapProps extends BaseStructureProps {
  mapWidth?: number;
  mapHeight?: number;
  paddingInner?: number;
  tile?: 'squarify' | 'binary' | 'slice' | 'dice';
}

const TILE_MAP = {
  squarify: d3.treemapSquarify,
  binary: d3.treemapBinary,
  slice: d3.treemapSlice,
  dice: d3.treemapDice,
} as const;

export const Treemap: ComponentType<TreemapProps> = (props) => {
  const {
    Title,
    data,
    options,
    mapWidth = 600,
    mapHeight = 400,
    paddingInner = 4,
    tile = 'squarify',
  } = props;
  const { title, desc } = data;
  const titleContent = Title ? <Title title={title} desc={desc} /> : null;

  // Accept root from data.root (HierarchyData) or first item
  const root = (data as any).root ?? data.items?.[0];
  if (!root) {
    return (
      <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
        {titleContent}
        <Group />
      </FlexLayout>
    );
  }

  const hierarchy = d3
    .hierarchy<any>(root)
    .sum((d) => Math.max(0, d.value ?? 0))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  d3.treemap<any>()
    .size([mapWidth, mapHeight])
    .paddingInner(paddingInner)
    .paddingOuter(2)
    .tile(TILE_MAP[tile] ?? d3.treemapSquarify)(hierarchy);

  const leaves = hierarchy.leaves();
  const colorPrimary = getColorPrimary(options);
  const decoElements: JSXElement[] = [];

  hierarchy.descendants().forEach((node) => {
    const x0: number = (node as any).x0;
    const y0: number = (node as any).y0;
    const x1: number = (node as any).x1;
    const y1: number = (node as any).y1;
    const w = x1 - x0;
    const h = y1 - y0;
    if (w <= 0 || h <= 0) return;

    const leafIndex = leaves.indexOf(node as any);
    const isLeaf = leafIndex >= 0;
    const fill = isLeaf
      ? (getPaletteColor(options, [leafIndex]) ?? colorPrimary)
      : 'none';
    const fillOpacity = isLeaf ? 1 : 0;

    decoElements.push(
      <Rect x={x0} y={y0} width={w} height={h} fill={fill} fillOpacity={fillOpacity} rx={3} ry={3} />,
    );

    if (isLeaf && w > 30 && h > 18 && node.data.label) {
      const fontSize = Math.min(13, Math.max(9, Math.floor(w / 9)));
      decoElements.push(
        <Text
          x={x0 + 5}
          y={y0 + 5}
          width={w - 10}
          height={h - 10}
          fontSize={fontSize}
          fill="#ffffff"
          alignHorizontal="left"
          alignVertical="top"
        >
          {String(node.data.label)}
        </Text>,
      );
      if (node.data.value != null && h > 36) {
        decoElements.push(
          <Text
            x={x0 + 5}
            y={y0 + 5 + fontSize + 4}
            width={w - 10}
            height={h - 10 - fontSize - 4}
            fontSize={Math.max(9, fontSize - 2)}
            fill="rgba(255,255,255,0.8)"
            alignHorizontal="left"
            alignVertical="top"
          >
            {String(node.data.value)}
          </Text>,
        );
      }
    }
  });

  return (
    <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
      {titleContent}
      <Group>
        <ShapesGroup>{decoElements}</ShapesGroup>
        <BtnsGroup />
      </Group>
    </FlexLayout>
  );
};

registerStructure('treemap', {
  component: Treemap,
  composites: ['title'],
});
```

- [ ] **Step 2.4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/designs/structures/treemap.test.tsx
```
Expected: PASS

- [ ] **Step 2.5: Add inline templates to `src/templates/built-in.ts`**

Add to the imports at the top of `built-in.ts`:
```ts
// (no separate file needed — add inline below)
```

Add these entries inside `BUILT_IN_TEMPLATES`:
```ts
  'treemap-simple': {
    design: {
      title: 'default',
      structure: { type: 'treemap', mapWidth: 600, mapHeight: 400, tile: 'squarify' },
    },
  },
  'treemap-binary': {
    design: {
      title: 'default',
      structure: { type: 'treemap', mapWidth: 600, mapHeight: 400, tile: 'binary' },
    },
  },
```

- [ ] **Step 2.6: Wire export**

Add to `src/designs/structures/index.ts`:
```ts
export * from './treemap';
```

- [ ] **Step 2.7: Run all tests**

```bash
npm test
```
Expected: All pass.

- [ ] **Step 2.8: Commit**

```bash
git add src/designs/structures/treemap.tsx \
        src/designs/structures/index.ts src/templates/built-in.ts \
        __tests__/unit/designs/structures/treemap.test.tsx
git commit -m "feat: add treemap structure using d3.treemap"
```

---

## Task 3: Architecture Diagram

Same Dagre layout as `relation-dagre-flow`, but with system-boundary rectangles drawn around nodes sharing the same `group` field.

**Files:**
- Create: `src/designs/structures/architecture.tsx`
- Create: `src/templates/architecture.ts`
- Create: `__tests__/unit/designs/structures/architecture.test.tsx`
- Modify: `src/designs/structures/index.ts`
- Modify: `src/templates/built-in.ts`

- [ ] **Step 3.1: Write the failing test**

```tsx
// __tests__/unit/designs/structures/architecture.test.tsx
/** @jsxImportSource ../../../../src */
import { describe, expect, it } from 'vitest';
import type { ComponentType, ParsedInfographicOptions } from '../../../../src';
import { Rect, renderSVG } from '../../../../src';
import type { BaseItemProps } from '../../../../src/designs/items';
import { Architecture } from '../../../../src/designs/structures/architecture';
import type { ParsedData } from '../../../../src/types';
import { minifySvg } from '../../../utils';

const Item: ComponentType<
  Omit<BaseItemProps, 'themeColors'> & Partial<Pick<BaseItemProps, 'themeColors'>>
> = ({ x = 0, y = 0 }) => <Rect x={x} y={y} width={80} height={50} />;

const data: ParsedData = {
  items: [
    { id: 'web', label: 'Web App', group: 'Frontend' },
    { id: 'api', label: 'API', group: 'Backend' },
    { id: 'db', label: 'Database', group: 'Backend' },
  ],
  relations: [
    { from: 'web', to: 'api' },
    { from: 'api', to: 'db' },
  ],
} as unknown as ParsedData;

const options = {
  data,
  themeConfig: { colorBg: '#ffffff', colorPrimary: '#1677ff' },
} as ParsedInfographicOptions;

describe('Architecture', () => {
  it('renders a boundary rect for each unique group', () => {
    const svg = minifySvg(renderSVG(<Architecture Item={Item} Items={[]} data={data} options={options} />));
    // 2 unique groups → 2 boundary rects with stroke-dasharray
    const dashed = svg.match(/stroke-dasharray/g) ?? [];
    expect(dashed.length).toBeGreaterThanOrEqual(2);
  });

  it('renders all node items', () => {
    const svg = minifySvg(renderSVG(<Architecture Item={Item} Items={[]} data={data} options={options} />));
    const itemRects = svg.match(/width="80"/g) ?? [];
    expect(itemRects.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 3.2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/designs/structures/architecture.test.tsx
```
Expected: FAIL

- [ ] **Step 3.3: Create the Architecture structure**

```tsx
// src/designs/structures/architecture.tsx
import { DagreLayout } from '@antv/layout';
import type { ComponentType, JSXElement } from '../../jsx';
import { Defs, getElementBounds, Group, Path, Rect, Text } from '../../jsx';
import type { RelationData } from '../../types';
import { BtnAdd, BtnsGroup, ItemsGroup, ShapesGroup } from '../components';
import { FlexLayout } from '../layouts';
import {
  createArrowElements,
  createRoundedPath,
  getColorPrimary,
  getMidPoint,
  getPaletteColor,
  getThemeColors,
} from '../utils';
import { registerStructure } from './registry';
import type { BaseStructureProps } from './types';

export interface ArchitectureProps extends BaseStructureProps {
  rankdir?: 'TB' | 'LR';
  nodesep?: number;
  ranksep?: number;
  padding?: number;
  edgeWidth?: number;
  showBoundary?: boolean;
  boundaryPadding?: number;
}

export const Architecture: ComponentType<ArchitectureProps> = (props) => {
  const {
    Title,
    Item,
    data,
    options,
    rankdir = 'LR',
    nodesep = 60,
    ranksep = 80,
    padding = 40,
    edgeWidth = 2,
    showBoundary = true,
    boundaryPadding = 20,
  } = props;
  const { title, desc, items = [], relations = [] } = data as RelationData;
  const titleContent = Title ? <Title title={title} desc={desc} /> : null;

  if (!Item || items.length === 0) {
    return (
      <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
        {titleContent}
        <Group><BtnAdd indexes={[0]} x={0} y={0} /></Group>
      </FlexLayout>
    );
  }

  const nodeIdSet = new Set<string>();
  const nodeIdsByIndex = new Map<number, string>();
  const nodeSizeMap = new Map<string, { width: number; height: number }>();
  const nodeMetaMap = new Map<string, { id: string; datum: any; indexes: number[]; group: string; themeColors: any }>();
  const colorGroupMap = new Map<string, number>();
  let nextGroupColor = 0;

  const nodes = items.map((item, index) => {
    const id = String((item as any).id ?? index);
    const groupKey = String((item as any).group ?? '');
    if (groupKey && !colorGroupMap.has(groupKey)) {
      colorGroupMap.set(groupKey, nextGroupColor++);
    }
    const colorIndex = groupKey ? (colorGroupMap.get(groupKey) ?? 0) : index;
    const primary = getPaletteColor(options, [colorIndex]) ?? getColorPrimary(options);
    const themeColors = getThemeColors({ colorPrimary: primary }, options);

    const bounds = getElementBounds(
      <Item indexes={[index]} data={data} datum={item} positionH="center" positionV="middle" themeColors={themeColors} />,
    );
    nodeSizeMap.set(id, bounds);
    nodeMetaMap.set(id, { id, datum: item, indexes: [index], group: groupKey, themeColors });
    nodeIdSet.add(id);
    nodeIdsByIndex.set(index, id);
    return { id };
  });

  const resolveId = (v: string | number | undefined | null) => {
    if (v == null) return null;
    const s = String(v);
    if (nodeIdSet.has(s)) return s;
    const n = Number(v);
    if (!Number.isNaN(n)) return nodeIdsByIndex.get(n) ?? null;
    return null;
  };

  const edges = relations
    .map((r, i) => {
      const src = resolveId(r.from);
      const tgt = resolveId(r.to);
      if (!src || !tgt) return null;
      return { id: `e${i}`, source: src, target: tgt, relation: r };
    })
    .filter(Boolean) as { id: string; source: string; target: string; relation: any }[];

  const layout = new DagreLayout({
    rankdir,
    nodesep,
    ranksep,
    edgesep: 10,
    controlPoints: true,
    nodeSize: (node) => {
      const b = nodeSizeMap.get(String((node as any).id ?? ''));
      return b ? [b.width, b.height] : [0, 0];
    },
  });
  layout.execute({ nodes, edges });

  interface NodeLayout {
    id: string; datum: any; indexes: number[]; group: string; themeColors: any;
    x: number; y: number; width: number; height: number;
    centerX: number; centerY: number;
  }
  const nodeLayouts: NodeLayout[] = [];
  layout.forEachNode((node) => {
    const id = String(node.id);
    const meta = nodeMetaMap.get(id);
    if (!meta) return;
    const b = nodeSizeMap.get(id) ?? { width: 0, height: 0 };
    const x = (node.x ?? 0) - b.width / 2 + padding;
    const y = (node.y ?? 0) - b.height / 2 + padding;
    nodeLayouts.push({ ...meta, x, y, width: b.width, height: b.height, centerX: x + b.width / 2, centerY: y + b.height / 2 });
  });

  if (nodeLayouts.length === 0) {
    return (
      <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
        {titleContent}
        <Group><BtnAdd indexes={[0]} x={0} y={0} /></Group>
      </FlexLayout>
    );
  }

  const nodeById = new Map(nodeLayouts.map((n) => [n.id, n]));
  const decoElements: JSXElement[] = [];
  const defsElements: JSXElement[] = [];

  // Draw system boundaries per group
  if (showBoundary) {
    const groupNodes = new Map<string, NodeLayout[]>();
    nodeLayouts.forEach((n) => {
      if (!n.group) return;
      if (!groupNodes.has(n.group)) groupNodes.set(n.group, []);
      groupNodes.get(n.group)!.push(n);
    });

    let groupColorIdx = 0;
    groupNodes.forEach((gnodes, groupName) => {
      const minX = Math.min(...gnodes.map((n) => n.x)) - boundaryPadding;
      const minY = Math.min(...gnodes.map((n) => n.y)) - boundaryPadding - 20;
      const maxX = Math.max(...gnodes.map((n) => n.x + n.width)) + boundaryPadding;
      const maxY = Math.max(...gnodes.map((n) => n.y + n.height)) + boundaryPadding;
      const bColor = getPaletteColor(options, [groupColorIdx++]) ?? getColorPrimary(options);

      decoElements.push(
        <Rect
          x={minX} y={minY}
          width={maxX - minX} height={maxY - minY}
          fill="none" stroke={bColor} strokeWidth={1.5}
          strokeDasharray="6,3" rx={8} ry={8}
          fillOpacity={0}
        />,
      );
      decoElements.push(
        <Text
          x={minX + 10} y={minY + 4}
          width={maxX - minX - 20} height={20}
          fontSize={12} fill={bColor}
          alignHorizontal="left" alignVertical="top"
        >
          {groupName}
        </Text>,
      );
    });
  }

  // Draw edges
  const defaultStroke = getColorPrimary(options);
  const arrowSize = Math.max(10, edgeWidth * 5);
  layout.forEachEdge((edge) => {
    const src = nodeById.get(String(edge.source));
    const tgt = nodeById.get(String(edge.target));
    if (!src || !tgt) return;
    const isVert = rankdir === 'TB';
    const start: [number, number] = isVert
      ? [src.centerX, src.y + src.height]
      : [src.x + src.width, src.centerY];
    const end: [number, number] = isVert
      ? [tgt.centerX, tgt.y]
      : [tgt.x, tgt.centerY];
    const mid = isVert ? (start[1] + end[1]) / 2 : (start[0] + end[0]) / 2;
    const pts: [number, number][] = isVert
      ? [start, [start[0], mid], [end[0], mid], end]
      : [start, [mid, start[1]], [mid, end[1]], end];
    const d = createRoundedPath(pts, 10, 0, 0);
    if (!d) return;
    decoElements.push(
      <Path d={d} stroke={defaultStroke} strokeWidth={edgeWidth} fill="none" />,
    );
    const relation = (edge as any)._original?.relation;
    const angle = Math.atan2(end[1] - pts[pts.length - 2][1], end[0] - pts[pts.length - 2][0]);
    decoElements.push(
      ...createArrowElements(end[0], end[1], angle, 'triangle', defaultStroke, edgeWidth, arrowSize),
    );
    if (relation?.label) {
      const mid2 = getMidPoint(pts);
      if (mid2) {
        decoElements.push(
          <Text x={mid2[0] - 30} y={mid2[1] - 10} width={60} height={20}
            fontSize={12} fill={defaultStroke} alignHorizontal="center" alignVertical="middle">
            {String(relation.label)}
          </Text>,
        );
      }
    }
  });

  const itemElements: JSXElement[] = nodeLayouts.map((n) => (
    <Item
      indexes={n.indexes} datum={n.datum} data={data}
      x={n.x} y={n.y} positionH="center" positionV="middle"
      themeColors={n.themeColors}
    />
  ));

  return (
    <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
      {titleContent}
      <Group>
        <Defs>{defsElements}</Defs>
        <ShapesGroup>{decoElements}</ShapesGroup>
        <ItemsGroup>{itemElements}</ItemsGroup>
        <BtnsGroup />
      </Group>
    </FlexLayout>
  );
};

registerStructure('architecture', {
  component: Architecture,
  composites: ['title', 'item'],
});
```

- [ ] **Step 3.4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/designs/structures/architecture.test.tsx
```
Expected: PASS

- [ ] **Step 3.5: Create architecture templates**

```ts
// src/templates/architecture.ts
import type { TemplateOptions } from './types';

const base = {
  type: 'architecture',
  showBoundary: true,
  rankdir: 'LR',
} as const;

export const architectureTemplates: Record<string, TemplateOptions> = {
  'architecture-simple-circle-node': {
    design: { title: 'default', structure: base, item: { type: 'simple-circle-node' } },
  },
  'architecture-badge-card': {
    design: { title: 'default', structure: base, item: { type: 'badge-card' } },
  },
  'architecture-compact-card': {
    design: { title: 'default', structure: base, item: { type: 'compact-card' } },
  },
  'architecture-tb-simple-circle-node': {
    design: { title: 'default', structure: { ...base, rankdir: 'TB' }, item: { type: 'simple-circle-node' } },
  },
};
```

- [ ] **Step 3.6: Wire exports and templates**

Add to `src/designs/structures/index.ts`:
```ts
export * from './architecture';
```

Add to `src/templates/built-in.ts` imports:
```ts
import { architectureTemplates } from './architecture';
```

Add inside `BUILT_IN_TEMPLATES`:
```ts
  ...architectureTemplates,
```

- [ ] **Step 3.7: Run all tests**

```bash
npm test
```
Expected: All pass.

- [ ] **Step 3.8: Commit**

```bash
git add src/designs/structures/architecture.tsx src/templates/architecture.ts \
        src/designs/structures/index.ts src/templates/built-in.ts \
        __tests__/unit/designs/structures/architecture.test.tsx
git commit -m "feat: add architecture diagram structure with system boundaries"
```

---

## Task 4: State Machine

Like `relation-dagre-flow` but adds: self-loop edges (curved arc), initial state marker (filled circle + arrow), and final state marker (double ellipse). Initial/final state flags come from `attributes.initial` and `attributes.final` on items.

**Files:**
- Create: `src/designs/structures/state-machine.tsx`
- Create: `src/templates/state-machine.ts`
- Create: `__tests__/unit/designs/structures/state-machine.test.tsx`
- Modify: `src/designs/structures/index.ts`
- Modify: `src/templates/built-in.ts`

- [ ] **Step 4.1: Write the failing test**

```tsx
// __tests__/unit/designs/structures/state-machine.test.tsx
/** @jsxImportSource ../../../../src */
import { describe, expect, it } from 'vitest';
import type { ComponentType, ParsedInfographicOptions } from '../../../../src';
import { Ellipse, Rect, renderSVG } from '../../../../src';
import type { BaseItemProps } from '../../../../src/designs/items';
import { StateMachine } from '../../../../src/designs/structures/state-machine';
import type { ParsedData } from '../../../../src/types';
import { minifySvg } from '../../../utils';

const Item: ComponentType<
  Omit<BaseItemProps, 'themeColors'> & Partial<Pick<BaseItemProps, 'themeColors'>>
> = ({ x = 0, y = 0 }) => <Rect x={x} y={y} width={80} height={40} />;

const data: ParsedData = {
  items: [
    { id: 'idle', label: 'Idle', attributes: { initial: true } },
    { id: 'running', label: 'Running' },
    { id: 'done', label: 'Done', attributes: { final: true } },
  ],
  relations: [
    { from: 'idle', to: 'running', label: 'start' },
    { from: 'running', to: 'done', label: 'finish' },
    { from: 'running', to: 'running', label: 'loop' },
  ],
} as unknown as ParsedData;

const options = {
  data,
  themeConfig: { colorBg: '#ffffff', colorPrimary: '#1677ff' },
} as ParsedInfographicOptions;

describe('StateMachine', () => {
  it('renders all state items', () => {
    const svg = minifySvg(renderSVG(<StateMachine Item={Item} Items={[]} data={data} options={options} />));
    const rects = svg.match(/width="80"/g) ?? [];
    expect(rects.length).toBeGreaterThanOrEqual(3);
  });

  it('renders initial state marker (small filled ellipse)', () => {
    const svg = minifySvg(renderSVG(<StateMachine Item={Item} Items={[]} data={data} options={options} />));
    // initial marker uses a small filled circle
    expect(svg).toContain('data-marker="initial"');
  });

  it('renders final state double ring (outer ellipse with stroke)', () => {
    const svg = minifySvg(renderSVG(<StateMachine Item={Item} Items={[]} data={data} options={options} />));
    expect(svg).toContain('data-marker="final"');
  });
});
```

- [ ] **Step 4.2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/designs/structures/state-machine.test.tsx
```
Expected: FAIL

- [ ] **Step 4.3: Create the State Machine structure**

```tsx
// src/designs/structures/state-machine.tsx
import { DagreLayout } from '@antv/layout';
import type { ComponentType, JSXElement } from '../../jsx';
import { Defs, Ellipse, getElementBounds, Group, Path, Text } from '../../jsx';
import type { RelationData } from '../../types';
import { BtnAdd, BtnsGroup, ItemsGroup, ShapesGroup } from '../components';
import { FlexLayout } from '../layouts';
import {
  createArrowElements,
  createRoundedPath,
  getColorPrimary,
  getMidPoint,
  getPaletteColor,
  getThemeColors,
} from '../utils';
import { registerStructure } from './registry';
import type { BaseStructureProps } from './types';

export interface StateMachineProps extends BaseStructureProps {
  rankdir?: 'TB' | 'LR';
  nodesep?: number;
  ranksep?: number;
  padding?: number;
  edgeWidth?: number;
}

export const StateMachine: ComponentType<StateMachineProps> = (props) => {
  const {
    Title,
    Item,
    data,
    options,
    rankdir = 'TB',
    nodesep = 60,
    ranksep = 80,
    padding = 50,
    edgeWidth = 2,
  } = props;
  const { title, desc, items = [], relations = [] } = data as RelationData;
  const titleContent = Title ? <Title title={title} desc={desc} /> : null;

  if (!Item || items.length === 0) {
    return (
      <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
        {titleContent}
        <Group><BtnAdd indexes={[0]} x={0} y={0} /></Group>
      </FlexLayout>
    );
  }

  const nodeIdSet = new Set<string>();
  const nodeIdsByIndex = new Map<number, string>();
  const nodeSizeMap = new Map<string, { width: number; height: number }>();
  const nodeMetaMap = new Map<string, { id: string; datum: any; indexes: number[]; themeColors: any }>();

  const nodes = items.map((item, index) => {
    const id = String((item as any).id ?? index);
    const primary = getPaletteColor(options, [index]) ?? getColorPrimary(options);
    const themeColors = getThemeColors({ colorPrimary: primary }, options);
    const bounds = getElementBounds(
      <Item indexes={[index]} data={data} datum={item} positionH="center" positionV="middle" themeColors={themeColors} />,
    );
    nodeSizeMap.set(id, bounds);
    nodeMetaMap.set(id, { id, datum: item, indexes: [index], themeColors });
    nodeIdSet.add(id);
    nodeIdsByIndex.set(index, id);
    return { id };
  });

  const resolveId = (v: string | number | undefined | null) => {
    if (v == null) return null;
    const s = String(v);
    if (nodeIdSet.has(s)) return s;
    const n = Number(v);
    if (!Number.isNaN(n)) return nodeIdsByIndex.get(n) ?? null;
    return null;
  };

  // Separate self-loops from normal edges (dagre can't handle self-loops well)
  const selfLoopRelations: typeof relations = [];
  const normalEdges: { id: string; source: string; target: string; relation: any }[] = [];
  relations.forEach((r, i) => {
    const src = resolveId(r.from);
    const tgt = resolveId(r.to);
    if (!src || !tgt) return;
    if (src === tgt) {
      selfLoopRelations.push(r);
    } else {
      normalEdges.push({ id: `e${i}`, source: src, target: tgt, relation: r });
    }
  });

  const layout = new DagreLayout({
    rankdir, nodesep, ranksep, edgesep: 10, controlPoints: true,
    nodeSize: (node) => {
      const b = nodeSizeMap.get(String((node as any).id ?? ''));
      return b ? [b.width, b.height] : [0, 0];
    },
  });
  layout.execute({ nodes, edges: normalEdges });

  interface NL { id: string; datum: any; indexes: number[]; themeColors: any; x: number; y: number; width: number; height: number; centerX: number; centerY: number }
  const nodeLayouts: NL[] = [];
  layout.forEachNode((node) => {
    const id = String(node.id);
    const meta = nodeMetaMap.get(id);
    if (!meta) return;
    const b = nodeSizeMap.get(id) ?? { width: 0, height: 0 };
    const x = (node.x ?? 0) - b.width / 2 + padding;
    const y = (node.y ?? 0) - b.height / 2 + padding;
    nodeLayouts.push({ ...meta, x, y, width: b.width, height: b.height, centerX: x + b.width / 2, centerY: y + b.height / 2 });
  });

  if (nodeLayouts.length === 0) {
    return (
      <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
        {titleContent}
        <Group><BtnAdd indexes={[0]} x={0} y={0} /></Group>
      </FlexLayout>
    );
  }

  const nodeById = new Map(nodeLayouts.map((n) => [n.id, n]));
  const defaultStroke = getColorPrimary(options);
  const arrowSize = Math.max(10, edgeWidth * 5);
  const themeColors = getThemeColors({}, options);
  const labelBg = themeColors?.colorBg ?? '#ffffff';
  const decoElements: JSXElement[] = [];
  const defsElements: JSXElement[] = [];

  // Normal edges
  layout.forEachEdge((edge) => {
    const src = nodeById.get(String(edge.source));
    const tgt = nodeById.get(String(edge.target));
    if (!src || !tgt) return;
    const isVert = rankdir === 'TB';
    const start: [number, number] = isVert ? [src.centerX, src.y + src.height] : [src.x + src.width, src.centerY];
    const end: [number, number] = isVert ? [tgt.centerX, tgt.y] : [tgt.x, tgt.centerY];
    const mid = isVert ? (start[1] + end[1]) / 2 : (start[0] + end[0]) / 2;
    const pts: [number, number][] = isVert
      ? [start, [start[0], mid], [end[0], mid], end]
      : [start, [mid, start[1]], [mid, end[1]], end];
    const d = createRoundedPath(pts, 10, 0, 0);
    if (!d) return;
    decoElements.push(<Path d={d} stroke={defaultStroke} strokeWidth={edgeWidth} fill="none" />);
    const angle = Math.atan2(end[1] - pts[pts.length - 2][1], end[0] - pts[pts.length - 2][0]);
    decoElements.push(...createArrowElements(end[0], end[1], angle, 'triangle', defaultStroke, edgeWidth, arrowSize));
    const relation = (edge as any)._original?.relation;
    if (relation?.label) {
      const mp = getMidPoint(pts);
      if (mp) {
        decoElements.push(
          <Text x={mp[0] - 30} y={mp[1] - 16} width={60} height={14}
            fontSize={12} fill={defaultStroke} backgroundColor={labelBg}
            alignHorizontal="center" alignVertical="middle">
            {String(relation.label)}
          </Text>,
        );
      }
    }
  });

  // Self-loops: render as a small arc above the node
  selfLoopRelations.forEach((r) => {
    const srcId = resolveId(r.from);
    if (!srcId) return;
    const n = nodeById.get(srcId);
    if (!n) return;
    const loopR = 20;
    const topX = n.centerX;
    const topY = n.y - loopR;
    // Arc: start from top-left of node, arc up and back
    const d = `M ${topX - loopR} ${n.y} C ${topX - loopR * 2} ${topY - loopR * 2} ${topX + loopR * 2} ${topY - loopR * 2} ${topX + loopR} ${n.y}`;
    decoElements.push(<Path d={d} stroke={defaultStroke} strokeWidth={edgeWidth} fill="none" />);
    const endAngle = Math.PI / 2;
    decoElements.push(...createArrowElements(topX + loopR, n.y, endAngle, 'triangle', defaultStroke, edgeWidth, arrowSize));
    if (r.label) {
      decoElements.push(
        <Text x={topX - 30} y={topY - loopR * 2 - 4} width={60} height={14}
          fontSize={12} fill={defaultStroke} backgroundColor={labelBg}
          alignHorizontal="center" alignVertical="middle">
          {String(r.label)}
        </Text>,
      );
    }
  });

  // Initial / final state markers
  nodeLayouts.forEach((n) => {
    const attrs = (n.datum as any).attributes ?? {};
    if (attrs.initial) {
      const mx = n.x - 30;
      const my = n.centerY;
      decoElements.push(
        <Ellipse cx={mx} cy={my} rx={8} ry={8} fill={defaultStroke} data-marker="initial" />,
      );
      const ang = Math.atan2(0, n.x - mx - 8);
      decoElements.push(
        ...createArrowElements(n.x, my, ang, 'triangle', defaultStroke, edgeWidth, arrowSize - 2),
      );
      decoElements.push(
        <Path d={`M ${mx + 8} ${my} L ${n.x} ${my}`} stroke={defaultStroke} strokeWidth={edgeWidth} fill="none" />,
      );
    }
    if (attrs.final) {
      const r1 = Math.min(n.width, n.height) / 2 + 6;
      decoElements.push(
        <Ellipse
          cx={n.centerX} cy={n.centerY}
          rx={r1} ry={r1}
          fill="none" stroke={defaultStroke} strokeWidth={2}
          data-marker="final"
        />,
      );
    }
  });

  const itemElements: JSXElement[] = nodeLayouts.map((n) => (
    <Item indexes={n.indexes} datum={n.datum} data={data}
      x={n.x} y={n.y} positionH="center" positionV="middle" themeColors={n.themeColors} />
  ));

  return (
    <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
      {titleContent}
      <Group>
        <Defs>{defsElements}</Defs>
        <ShapesGroup>{decoElements}</ShapesGroup>
        <ItemsGroup>{itemElements}</ItemsGroup>
        <BtnsGroup />
      </Group>
    </FlexLayout>
  );
};

registerStructure('state-machine', {
  component: StateMachine,
  composites: ['title', 'item'],
});
```

- [ ] **Step 4.4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/designs/structures/state-machine.test.tsx
```
Expected: PASS

- [ ] **Step 4.5: Create state-machine templates**

```ts
// src/templates/state-machine.ts
import type { TemplateOptions } from './types';

const base = { type: 'state-machine', rankdir: 'TB' } as const;

export const stateMachineTemplates: Record<string, TemplateOptions> = {
  'state-machine-simple': {
    design: { title: 'default', structure: base, item: { type: 'simple' } },
  },
  'state-machine-badge-card': {
    design: { title: 'default', structure: base, item: { type: 'badge-card' } },
  },
  'state-machine-compact-card': {
    design: { title: 'default', structure: base, item: { type: 'compact-card' } },
  },
  'state-machine-lr-simple': {
    design: { title: 'default', structure: { ...base, rankdir: 'LR' }, item: { type: 'simple' } },
  },
};
```

- [ ] **Step 4.6: Wire exports and templates**

Add to `src/designs/structures/index.ts`:
```ts
export * from './state-machine';
```

Add to `src/templates/built-in.ts` imports:
```ts
import { stateMachineTemplates } from './state-machine';
```

Add inside `BUILT_IN_TEMPLATES`:
```ts
  ...stateMachineTemplates,
```

- [ ] **Step 4.7: Run all tests**

```bash
npm test
```
Expected: All pass.

- [ ] **Step 4.8: Commit**

```bash
git add src/designs/structures/state-machine.tsx src/templates/state-machine.ts \
        src/designs/structures/index.ts src/templates/built-in.ts \
        __tests__/unit/designs/structures/state-machine.test.tsx
git commit -m "feat: add state machine structure with self-loops and initial/final markers"
```

---

## Task 5: Requirement Diagram

Dagre-based. Node boxes have a type header strip. Edge labels encode relationship type (satisfies, traces, refines, contains, copies). Item `attributes` carries `reqType`, `risk`, `verifyMethod`.

**Files:**
- Create: `src/designs/structures/requirement.tsx`
- Create: `src/templates/requirement.ts`
- Create: `__tests__/unit/designs/structures/requirement.test.tsx`
- Modify: `src/designs/structures/index.ts`
- Modify: `src/templates/built-in.ts`

- [ ] **Step 5.1: Write the failing test**

```tsx
// __tests__/unit/designs/structures/requirement.test.tsx
/** @jsxImportSource ../../../../src */
import { describe, expect, it } from 'vitest';
import type { ComponentType, ParsedInfographicOptions } from '../../../../src';
import { Rect, renderSVG } from '../../../../src';
import type { BaseItemProps } from '../../../../src/designs/items';
import { Requirement } from '../../../../src/designs/structures/requirement';
import type { ParsedData } from '../../../../src/types';
import { minifySvg } from '../../../utils';

const Item: ComponentType<
  Omit<BaseItemProps, 'themeColors'> & Partial<Pick<BaseItemProps, 'themeColors'>>
> = ({ x = 0, y = 0 }) => <Rect x={x} y={y} width={120} height={60} />;

const data: ParsedData = {
  items: [
    { id: 'r1', label: 'Performance', attributes: { reqType: 'performanceRequirement', risk: 'high' } },
    { id: 'e1', label: 'System', attributes: { reqType: 'element' } },
  ],
  relations: [{ from: 'e1', to: 'r1', label: 'satisfies' }],
} as unknown as ParsedData;

const options = {
  data,
  themeConfig: { colorBg: '#ffffff', colorPrimary: '#1677ff' },
} as ParsedInfographicOptions;

describe('Requirement', () => {
  it('renders a header strip for each node', () => {
    const svg = minifySvg(renderSVG(<Requirement Item={Item} Items={[]} data={data} options={options} />));
    // header strips use data-role="req-header"
    const headers = svg.match(/data-role="req-header"/g) ?? [];
    expect(headers).toHaveLength(2);
  });

  it('renders edge with satisfies label', () => {
    const svg = minifySvg(renderSVG(<Requirement Item={Item} Items={[]} data={data} options={options} />));
    expect(svg).toContain('satisfies');
  });
});
```

- [ ] **Step 5.2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/designs/structures/requirement.test.tsx
```
Expected: FAIL

- [ ] **Step 5.3: Create the Requirement structure**

```tsx
// src/designs/structures/requirement.tsx
import { DagreLayout } from '@antv/layout';
import type { ComponentType, JSXElement } from '../../jsx';
import { Defs, getElementBounds, Group, Path, Rect, Text } from '../../jsx';
import type { RelationData } from '../../types';
import { BtnAdd, BtnsGroup, ItemsGroup, ShapesGroup } from '../components';
import { FlexLayout } from '../layouts';
import {
  createArrowElements,
  createRoundedPath,
  getColorPrimary,
  getMidPoint,
  getPaletteColor,
  getThemeColors,
} from '../utils';
import { registerStructure } from './registry';
import type { BaseStructureProps } from './types';

const REQ_HEADER_HEIGHT = 20;

const REQ_TYPE_LABELS: Record<string, string> = {
  requirement: 'requirement',
  functionalRequirement: 'functional',
  performanceRequirement: 'performance',
  interfaceRequirement: 'interface',
  physicalRequirement: 'physical',
  designConstraint: 'constraint',
  element: 'element',
};

const RISK_COLORS: Record<string, string> = {
  high: '#ff4d4f',
  medium: '#faad14',
  low: '#52c41a',
};

export interface RequirementProps extends BaseStructureProps {
  rankdir?: 'TB' | 'LR';
  nodesep?: number;
  ranksep?: number;
  padding?: number;
  edgeWidth?: number;
}

export const Requirement: ComponentType<RequirementProps> = (props) => {
  const {
    Title,
    Item,
    data,
    options,
    rankdir = 'TB',
    nodesep = 60,
    ranksep = 80,
    padding = 40,
    edgeWidth = 2,
  } = props;
  const { title, desc, items = [], relations = [] } = data as RelationData;
  const titleContent = Title ? <Title title={title} desc={desc} /> : null;

  if (!Item || items.length === 0) {
    return (
      <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
        {titleContent}
        <Group><BtnAdd indexes={[0]} x={0} y={0} /></Group>
      </FlexLayout>
    );
  }

  const nodeIdSet = new Set<string>();
  const nodeIdsByIndex = new Map<number, string>();
  const nodeSizeMap = new Map<string, { width: number; height: number }>();
  const nodeMetaMap = new Map<string, { id: string; datum: any; indexes: number[]; themeColors: any }>();

  const nodes = items.map((item, index) => {
    const id = String((item as any).id ?? index);
    const primary = getPaletteColor(options, [index]) ?? getColorPrimary(options);
    const themeColors = getThemeColors({ colorPrimary: primary }, options);
    // Add header height to item bounds
    const itemB = getElementBounds(
      <Item indexes={[index]} data={data} datum={item} positionH="center" positionV="middle" themeColors={themeColors} />,
    );
    const bounds = { width: itemB.width, height: itemB.height + REQ_HEADER_HEIGHT };
    nodeSizeMap.set(id, bounds);
    nodeMetaMap.set(id, { id, datum: item, indexes: [index], themeColors });
    nodeIdSet.add(id);
    nodeIdsByIndex.set(index, id);
    return { id };
  });

  const resolveId = (v: string | number | undefined | null) => {
    if (v == null) return null;
    const s = String(v);
    if (nodeIdSet.has(s)) return s;
    const n = Number(v);
    if (!Number.isNaN(n)) return nodeIdsByIndex.get(n) ?? null;
    return null;
  };

  const edges = relations
    .map((r, i) => {
      const src = resolveId(r.from);
      const tgt = resolveId(r.to);
      if (!src || !tgt) return null;
      return { id: `e${i}`, source: src, target: tgt, relation: r };
    })
    .filter(Boolean) as { id: string; source: string; target: string; relation: any }[];

  const layout = new DagreLayout({
    rankdir, nodesep, ranksep, edgesep: 10, controlPoints: true,
    nodeSize: (node) => {
      const b = nodeSizeMap.get(String((node as any).id ?? ''));
      return b ? [b.width, b.height] : [0, 0];
    },
  });
  layout.execute({ nodes, edges });

  interface NL { id: string; datum: any; indexes: number[]; themeColors: any; x: number; y: number; width: number; height: number; centerX: number; centerY: number }
  const nodeLayouts: NL[] = [];
  layout.forEachNode((node) => {
    const id = String(node.id);
    const meta = nodeMetaMap.get(id);
    if (!meta) return;
    const b = nodeSizeMap.get(id) ?? { width: 0, height: 0 };
    const x = (node.x ?? 0) - b.width / 2 + padding;
    const y = (node.y ?? 0) - b.height / 2 + padding;
    nodeLayouts.push({ ...meta, x, y, width: b.width, height: b.height, centerX: x + b.width / 2, centerY: y + b.height / 2 });
  });

  if (nodeLayouts.length === 0) {
    return (
      <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
        {titleContent}
        <Group><BtnAdd indexes={[0]} x={0} y={0} /></Group>
      </FlexLayout>
    );
  }

  const nodeById = new Map(nodeLayouts.map((n) => [n.id, n]));
  const defaultStroke = getColorPrimary(options);
  const arrowSize = Math.max(10, edgeWidth * 5);
  const themeColors = getThemeColors({}, options);
  const labelBg = themeColors?.colorBg ?? '#ffffff';
  const decoElements: JSXElement[] = [];

  // Edges
  layout.forEachEdge((edge) => {
    const src = nodeById.get(String(edge.source));
    const tgt = nodeById.get(String(edge.target));
    if (!src || !tgt) return;
    const isVert = rankdir === 'TB';
    const start: [number, number] = isVert ? [src.centerX, src.y + src.height] : [src.x + src.width, src.centerY];
    const end: [number, number] = isVert ? [tgt.centerX, tgt.y] : [tgt.x, tgt.centerY];
    const mid = isVert ? (start[1] + end[1]) / 2 : (start[0] + end[0]) / 2;
    const pts: [number, number][] = isVert
      ? [start, [start[0], mid], [end[0], mid], end]
      : [start, [mid, start[1]], [mid, end[1]], end];
    const d = createRoundedPath(pts, 10, 0, 0);
    if (!d) return;
    decoElements.push(<Path d={d} stroke={defaultStroke} strokeWidth={edgeWidth} fill="none" strokeDasharray="6,3" />);
    const angle = Math.atan2(end[1] - pts[pts.length - 2][1], end[0] - pts[pts.length - 2][0]);
    decoElements.push(...createArrowElements(end[0], end[1], angle, 'arrow', defaultStroke, edgeWidth, arrowSize));
    const relation = (edge as any)._original?.relation;
    if (relation?.label) {
      const mp = getMidPoint(pts);
      if (mp) {
        decoElements.push(
          <Text x={mp[0] - 40} y={mp[1] - 10} width={80} height={16}
            fontSize={11} fill={defaultStroke} backgroundColor={labelBg}
            alignHorizontal="center" alignVertical="middle">
            {`«${String(relation.label)}»`}
          </Text>,
        );
      }
    }
  });

  // Node header strips
  nodeLayouts.forEach((n) => {
    const attrs = (n.datum as any).attributes ?? {};
    const reqType = String(attrs.reqType ?? 'requirement');
    const risk = String(attrs.risk ?? '');
    const headerLabel = REQ_TYPE_LABELS[reqType] ?? reqType;
    const primary = n.themeColors?.colorPrimary ?? defaultStroke;
    const riskColor = RISK_COLORS[risk];

    decoElements.push(
      <Rect
        x={n.x} y={n.y}
        width={n.width} height={REQ_HEADER_HEIGHT}
        fill={primary} rx={4} ry={4}
        data-role="req-header"
      />,
    );
    decoElements.push(
      <Text
        x={n.x + 4} y={n.y}
        width={n.width - (riskColor ? 30 : 8)} height={REQ_HEADER_HEIGHT}
        fontSize={11} fill="#ffffff" fontWeight="bold"
        alignHorizontal="left" alignVertical="middle"
      >
        {`«${headerLabel}»`}
      </Text>,
    );
    if (riskColor) {
      decoElements.push(
        <Rect x={n.x + n.width - 24} y={n.y + 4} width={20} height={12} fill={riskColor} rx={3} ry={3} />,
      );
    }
  });

  const itemElements: JSXElement[] = nodeLayouts.map((n) => (
    <Item
      indexes={n.indexes} datum={n.datum} data={data}
      x={n.x} y={n.y + REQ_HEADER_HEIGHT}
      positionH="center" positionV="middle"
      themeColors={n.themeColors}
    />
  ));

  return (
    <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
      {titleContent}
      <Group>
        <Defs>{[]}</Defs>
        <ShapesGroup>{decoElements}</ShapesGroup>
        <ItemsGroup>{itemElements}</ItemsGroup>
        <BtnsGroup />
      </Group>
    </FlexLayout>
  );
};

registerStructure('requirement', {
  component: Requirement,
  composites: ['title', 'item'],
});
```

- [ ] **Step 5.4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/designs/structures/requirement.test.tsx
```
Expected: PASS

- [ ] **Step 5.5: Create requirement templates**

```ts
// src/templates/requirement.ts
import type { TemplateOptions } from './types';

const base = { type: 'requirement', rankdir: 'TB' } as const;

export const requirementTemplates: Record<string, TemplateOptions> = {
  'requirement-simple': {
    design: { title: 'default', structure: base, item: { type: 'simple' } },
  },
  'requirement-compact-card': {
    design: { title: 'default', structure: base, item: { type: 'compact-card' } },
  },
  'requirement-lr-simple': {
    design: { title: 'default', structure: { ...base, rankdir: 'LR' }, item: { type: 'simple' } },
  },
};
```

- [ ] **Step 5.6: Wire exports and templates**

Add to `src/designs/structures/index.ts`:
```ts
export * from './requirement';
```

Add to `src/templates/built-in.ts` imports:
```ts
import { requirementTemplates } from './requirement';
```

Add inside `BUILT_IN_TEMPLATES`:
```ts
  ...requirementTemplates,
```

- [ ] **Step 5.7: Run all tests**

```bash
npm test
```
Expected: All pass.

- [ ] **Step 5.8: Commit**

```bash
git add src/designs/structures/requirement.tsx src/templates/requirement.ts \
        src/designs/structures/index.ts src/templates/built-in.ts \
        __tests__/unit/designs/structures/requirement.test.tsx
git commit -m "feat: add requirement diagram structure with type headers and risk badges"
```

---

## Task 6: C4 Diagram

C4 Context view. Items have `type` in `attributes`: `person | system | container | external`. Items sharing the same `group` are enclosed in a system boundary rectangle. Edges use Dagre.

**Files:**
- Create: `src/designs/structures/c4.tsx`
- Create: `src/templates/c4.ts`
- Create: `__tests__/unit/designs/structures/c4.test.tsx`
- Modify: `src/designs/structures/index.ts`
- Modify: `src/templates/built-in.ts`

- [ ] **Step 6.1: Write the failing test**

```tsx
// __tests__/unit/designs/structures/c4.test.tsx
/** @jsxImportSource ../../../../src */
import { describe, expect, it } from 'vitest';
import type { ComponentType, ParsedInfographicOptions } from '../../../../src';
import { Rect, renderSVG } from '../../../../src';
import type { BaseItemProps } from '../../../../src/designs/items';
import { C4Diagram } from '../../../../src/designs/structures/c4';
import type { ParsedData } from '../../../../src/types';
import { minifySvg } from '../../../utils';

const Item: ComponentType<
  Omit<BaseItemProps, 'themeColors'> & Partial<Pick<BaseItemProps, 'themeColors'>>
> = ({ x = 0, y = 0 }) => <Rect x={x} y={y} width={100} height={60} />;

const data: ParsedData = {
  items: [
    { id: 'user', label: 'User', attributes: { type: 'person' } },
    { id: 'web', label: 'Web App', group: 'System', attributes: { type: 'system' } },
    { id: 'api', label: 'API', group: 'System', attributes: { type: 'container' } },
    { id: 'ext', label: 'Auth Service', attributes: { type: 'external' } },
  ],
  relations: [
    { from: 'user', to: 'web', label: 'Uses' },
    { from: 'web', to: 'api', label: 'Calls' },
    { from: 'api', to: 'ext', label: 'Authenticates' },
  ],
} as unknown as ParsedData;

const options = {
  data,
  themeConfig: { colorBg: '#ffffff', colorPrimary: '#1677ff' },
} as ParsedInfographicOptions;

describe('C4Diagram', () => {
  it('renders system boundary around grouped nodes', () => {
    const svg = minifySvg(renderSVG(<C4Diagram Item={Item} Items={[]} data={data} options={options} />));
    // 1 group "System" → 1 boundary rect with data-role="c4-boundary"
    const boundaries = svg.match(/data-role="c4-boundary"/g) ?? [];
    expect(boundaries).toHaveLength(1);
  });

  it('renders person node with ellipse marker', () => {
    const svg = minifySvg(renderSVG(<C4Diagram Item={Item} Items={[]} data={data} options={options} />));
    expect(svg).toContain('data-role="person-head"');
  });

  it('renders external element with dashed border', () => {
    const svg = minifySvg(renderSVG(<C4Diagram Item={Item} Items={[]} data={data} options={options} />));
    expect(svg).toContain('data-role="c4-external"');
  });
});
```

- [ ] **Step 6.2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/designs/structures/c4.test.tsx
```
Expected: FAIL

- [ ] **Step 6.3: Create the C4 Diagram structure**

```tsx
// src/designs/structures/c4.tsx
import { DagreLayout } from '@antv/layout';
import type { ComponentType, JSXElement } from '../../jsx';
import { Defs, Ellipse, getElementBounds, Group, Path, Rect, Text } from '../../jsx';
import type { RelationData } from '../../types';
import { BtnAdd, BtnsGroup, ItemsGroup, ShapesGroup } from '../components';
import { FlexLayout } from '../layouts';
import {
  createArrowElements,
  createRoundedPath,
  getColorPrimary,
  getMidPoint,
  getPaletteColor,
  getThemeColors,
} from '../utils';
import { registerStructure } from './registry';
import type { BaseStructureProps } from './types';

const PERSON_HEAD_RADIUS = 12;
const PERSON_BODY_HEIGHT = 10;
const BOUNDARY_PADDING = 24;
const BOUNDARY_LABEL_HEIGHT = 18;

export interface C4DiagramProps extends BaseStructureProps {
  rankdir?: 'TB' | 'LR';
  nodesep?: number;
  ranksep?: number;
  padding?: number;
  edgeWidth?: number;
}

export const C4Diagram: ComponentType<C4DiagramProps> = (props) => {
  const {
    Title,
    Item,
    data,
    options,
    rankdir = 'TB',
    nodesep = 80,
    ranksep = 100,
    padding = 50,
    edgeWidth = 2,
  } = props;
  const { title, desc, items = [], relations = [] } = data as RelationData;
  const titleContent = Title ? <Title title={title} desc={desc} /> : null;

  if (!Item || items.length === 0) {
    return (
      <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
        {titleContent}
        <Group><BtnAdd indexes={[0]} x={0} y={0} /></Group>
      </FlexLayout>
    );
  }

  const nodeIdSet = new Set<string>();
  const nodeIdsByIndex = new Map<number, string>();
  const nodeSizeMap = new Map<string, { width: number; height: number }>();
  const nodeMetaMap = new Map<string, { id: string; datum: any; indexes: number[]; themeColors: any; c4type: string; group: string }>();

  const nodes = items.map((item, index) => {
    const id = String((item as any).id ?? index);
    const c4type = String((item as any).attributes?.type ?? 'system');
    const groupKey = String((item as any).group ?? '');
    const primary = getPaletteColor(options, [index]) ?? getColorPrimary(options);
    const themeColors = getThemeColors({ colorPrimary: primary }, options);
    const extraH = c4type === 'person' ? PERSON_HEAD_RADIUS * 2 + PERSON_BODY_HEIGHT + 8 : 0;
    const bounds = getElementBounds(
      <Item indexes={[index]} data={data} datum={item} positionH="center" positionV="middle" themeColors={themeColors} />,
    );
    const totalBounds = { width: bounds.width, height: bounds.height + extraH };
    nodeSizeMap.set(id, totalBounds);
    nodeMetaMap.set(id, { id, datum: item, indexes: [index], themeColors, c4type, group: groupKey });
    nodeIdSet.add(id);
    nodeIdsByIndex.set(index, id);
    return { id };
  });

  const resolveId = (v: string | number | undefined | null) => {
    if (v == null) return null;
    const s = String(v);
    if (nodeIdSet.has(s)) return s;
    const n = Number(v);
    if (!Number.isNaN(n)) return nodeIdsByIndex.get(n) ?? null;
    return null;
  };

  const edges = relations
    .map((r, i) => {
      const src = resolveId(r.from);
      const tgt = resolveId(r.to);
      if (!src || !tgt) return null;
      return { id: `e${i}`, source: src, target: tgt, relation: r };
    })
    .filter(Boolean) as { id: string; source: string; target: string; relation: any }[];

  const layout = new DagreLayout({
    rankdir, nodesep, ranksep, edgesep: 10, controlPoints: true,
    nodeSize: (node) => {
      const b = nodeSizeMap.get(String((node as any).id ?? ''));
      return b ? [b.width, b.height] : [0, 0];
    },
  });
  layout.execute({ nodes, edges });

  interface NL {
    id: string; datum: any; indexes: number[]; themeColors: any; c4type: string; group: string;
    x: number; y: number; width: number; height: number; centerX: number; centerY: number;
  }
  const nodeLayouts: NL[] = [];
  layout.forEachNode((node) => {
    const id = String(node.id);
    const meta = nodeMetaMap.get(id);
    if (!meta) return;
    const b = nodeSizeMap.get(id) ?? { width: 0, height: 0 };
    const x = (node.x ?? 0) - b.width / 2 + padding;
    const y = (node.y ?? 0) - b.height / 2 + padding;
    nodeLayouts.push({ ...meta, x, y, width: b.width, height: b.height, centerX: x + b.width / 2, centerY: y + b.height / 2 });
  });

  if (nodeLayouts.length === 0) {
    return (
      <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
        {titleContent}
        <Group><BtnAdd indexes={[0]} x={0} y={0} /></Group>
      </FlexLayout>
    );
  }

  const nodeById = new Map(nodeLayouts.map((n) => [n.id, n]));
  const defaultStroke = getColorPrimary(options);
  const arrowSize = Math.max(10, edgeWidth * 5);
  const themeColors = getThemeColors({}, options);
  const labelBg = themeColors?.colorBg ?? '#ffffff';
  const decoElements: JSXElement[] = [];

  // System boundary boxes
  const groupNodes = new Map<string, NL[]>();
  nodeLayouts.forEach((n) => {
    if (!n.group) return;
    if (!groupNodes.has(n.group)) groupNodes.set(n.group, []);
    groupNodes.get(n.group)!.push(n);
  });
  let bColorIdx = 0;
  groupNodes.forEach((gnodes, groupName) => {
    const minX = Math.min(...gnodes.map((n) => n.x)) - BOUNDARY_PADDING;
    const minY = Math.min(...gnodes.map((n) => n.y)) - BOUNDARY_PADDING - BOUNDARY_LABEL_HEIGHT;
    const maxX = Math.max(...gnodes.map((n) => n.x + n.width)) + BOUNDARY_PADDING;
    const maxY = Math.max(...gnodes.map((n) => n.y + n.height)) + BOUNDARY_PADDING;
    const bColor = getPaletteColor(options, [bColorIdx++]) ?? defaultStroke;
    decoElements.push(
      <Rect x={minX} y={minY} width={maxX - minX} height={maxY - minY}
        fill="none" stroke={bColor} strokeWidth={1.5} strokeDasharray="8,4" rx={6} ry={6}
        data-role="c4-boundary" />,
    );
    decoElements.push(
      <Text x={minX + 8} y={minY + 2} width={maxX - minX - 16} height={BOUNDARY_LABEL_HEIGHT}
        fontSize={12} fill={bColor} fontWeight="bold"
        alignHorizontal="left" alignVertical="top">
        {`[System: ${groupName}]`}
      </Text>,
    );
  });

  // Person markers + external markers
  nodeLayouts.forEach((n) => {
    if (n.c4type === 'person') {
      const headCX = n.centerX;
      const headCY = n.y + PERSON_HEAD_RADIUS;
      decoElements.push(
        <Ellipse cx={headCX} cy={headCY} rx={PERSON_HEAD_RADIUS} ry={PERSON_HEAD_RADIUS}
          fill={n.themeColors?.colorPrimary ?? defaultStroke} data-role="person-head" />,
      );
      decoElements.push(
        <Path
          d={`M ${headCX} ${headCY + PERSON_HEAD_RADIUS} L ${headCX} ${headCY + PERSON_HEAD_RADIUS + PERSON_BODY_HEIGHT}`}
          stroke={n.themeColors?.colorPrimary ?? defaultStroke} strokeWidth={2} fill="none" />,
      );
    }
    if (n.c4type === 'external') {
      decoElements.push(
        <Rect x={n.x - 4} y={n.y - 4} width={n.width + 8} height={n.height + 8}
          fill="none" stroke="#aaaaaa" strokeWidth={1.5} strokeDasharray="5,3" rx={4} ry={4}
          data-role="c4-external" />,
      );
    }
  });

  // Edges
  layout.forEachEdge((edge) => {
    const src = nodeById.get(String(edge.source));
    const tgt = nodeById.get(String(edge.target));
    if (!src || !tgt) return;
    const isVert = rankdir === 'TB';
    const personOffsetSrc = src.c4type === 'person' ? PERSON_HEAD_RADIUS * 2 + PERSON_BODY_HEIGHT + 8 : 0;
    const personOffsetTgt = tgt.c4type === 'person' ? PERSON_HEAD_RADIUS * 2 + PERSON_BODY_HEIGHT + 8 : 0;
    const start: [number, number] = isVert
      ? [src.centerX, src.y + src.height]
      : [src.x + src.width, src.centerY];
    const end: [number, number] = isVert
      ? [tgt.centerX, tgt.y + personOffsetTgt]
      : [tgt.x, tgt.centerY];
    const mid = isVert ? (start[1] + end[1]) / 2 : (start[0] + end[0]) / 2;
    const pts: [number, number][] = isVert
      ? [start, [start[0], mid], [end[0], mid], end]
      : [start, [mid, start[1]], [mid, end[1]], end];
    const d = createRoundedPath(pts, 10, 0, 0);
    if (!d) return;
    decoElements.push(<Path d={d} stroke={defaultStroke} strokeWidth={edgeWidth} fill="none" />);
    const angle = Math.atan2(end[1] - pts[pts.length - 2][1], end[0] - pts[pts.length - 2][0]);
    decoElements.push(...createArrowElements(end[0], end[1], angle, 'triangle', defaultStroke, edgeWidth, arrowSize));
    const relation = (edge as any)._original?.relation;
    if (relation?.label) {
      const mp = getMidPoint(pts);
      if (mp) {
        decoElements.push(
          <Text x={mp[0] - 40} y={mp[1] - 10} width={80} height={16}
            fontSize={11} fill={defaultStroke} backgroundColor={labelBg}
            alignHorizontal="center" alignVertical="middle">
            {String(relation.label)}
          </Text>,
        );
      }
    }
  });

  const itemElements: JSXElement[] = nodeLayouts.map((n) => {
    const personOffset = n.c4type === 'person' ? PERSON_HEAD_RADIUS * 2 + PERSON_BODY_HEIGHT + 8 : 0;
    return (
      <Item
        indexes={n.indexes} datum={n.datum} data={data}
        x={n.x} y={n.y + personOffset}
        positionH="center" positionV="middle"
        themeColors={n.themeColors}
      />
    );
  });

  return (
    <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
      {titleContent}
      <Group>
        <Defs>{[]}</Defs>
        <ShapesGroup>{decoElements}</ShapesGroup>
        <ItemsGroup>{itemElements}</ItemsGroup>
        <BtnsGroup />
      </Group>
    </FlexLayout>
  );
};

registerStructure('c4', {
  component: C4Diagram,
  composites: ['title', 'item'],
});
```

- [ ] **Step 6.4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/designs/structures/c4.test.tsx
```
Expected: PASS

- [ ] **Step 6.5: Create C4 templates**

```ts
// src/templates/c4.ts
import type { TemplateOptions } from './types';

const base = { type: 'c4', rankdir: 'TB' } as const;

export const c4Templates: Record<string, TemplateOptions> = {
  'c4-simple': {
    design: { title: 'default', structure: base, item: { type: 'simple' } },
  },
  'c4-compact-card': {
    design: { title: 'default', structure: base, item: { type: 'compact-card' } },
  },
  'c4-lr-simple': {
    design: { title: 'default', structure: { ...base, rankdir: 'LR' }, item: { type: 'simple' } },
  },
};
```

- [ ] **Step 6.6: Wire exports and templates**

Add to `src/designs/structures/index.ts`:
```ts
export * from './c4';
```

Add to `src/templates/built-in.ts` imports:
```ts
import { c4Templates } from './c4';
```

Add inside `BUILT_IN_TEMPLATES`:
```ts
  ...c4Templates,
```

- [ ] **Step 6.7: Run full test suite and lint**

```bash
npm test && npm run lint:root
```
Expected: All pass, no lint errors.

- [ ] **Step 6.8: Commit**

```bash
git add src/designs/structures/c4.tsx src/templates/c4.ts \
        src/designs/structures/index.ts src/templates/built-in.ts \
        __tests__/unit/designs/structures/c4.test.tsx
git commit -m "feat: add C4 context diagram structure with system boundaries and person markers"
```

---

## Self-Review

### Spec coverage

| Diagram | Task | Structure | Templates | Test |
|---|---|---|---|---|
| Kanban | 1 | ✅ `kanban.tsx` | ✅ `kanban.ts` | ✅ |
| Treemap | 2 | ✅ `treemap.tsx` | ✅ inline | ✅ |
| Architecture | 3 | ✅ `architecture.tsx` | ✅ `architecture.ts` | ✅ |
| State Machine | 4 | ✅ `state-machine.tsx` | ✅ `state-machine.ts` | ✅ |
| Requirement | 5 | ✅ `requirement.tsx` | ✅ `requirement.ts` | ✅ |
| C4 | 6 | ✅ `c4.tsx` | ✅ `c4.ts` | ✅ |

All 6 diagrams have: structure file, template file (or inline templates), export in `index.ts`, registration in `built-in.ts`, and at minimum 2 vitest test cases.

### Placeholder scan

No TBD, TODO, or "similar to Task N" placeholders. Every step shows full code.

### Type consistency

- `KanbanProps`, `TreemapProps`, `ArchitectureProps`, `StateMachineProps`, `RequirementProps`, `C4DiagramProps` all extend `BaseStructureProps` from `./types`.
- All structures call `registerStructure(name, { component, composites })` matching the `Structure` interface.
- All template files export `Record<string, TemplateOptions>` matching `src/templates/types.ts`.
- All test files use the same mock `Item` pattern from `chart-line.test.tsx`.
- `createRoundedPath`, `createArrowElements`, `getMidPoint` are all exported from `../utils` via `geometry.tsx`.
- `DagreLayout` from `@antv/layout`, `d3` from `d3` — both already in `package.json`.
