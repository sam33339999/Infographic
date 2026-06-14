import { DagreLayout } from '@antv/layout';
import type { ComponentType, JSXElement } from '../../jsx';
import { Ellipse, getElementBounds, Group, Path, Rect, Text } from '../../jsx';
import type { ItemDatum, RelationData, RelationEdgeDatum, RelationNodeDatum } from '../../types';
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

const PERSON_HEAD_RADIUS = 16;
const PERSON_HEAD_OFFSET = PERSON_HEAD_RADIUS * 2 + 4;
const BOUNDARY_PADDING = 20;

interface NodeLayout {
  id: string;
  datum: ItemDatum;
  indexes: number[];
  themeColors: ReturnType<typeof getThemeColors>;
  x: number;
  y: number;
  width: number;
  height: number;
  itemY: number;
  itemHeight: number;
  centerX: number;
  centerY: number;
  isPerson: boolean;
  isExternal: boolean;
}

export interface C4Props extends BaseStructureProps {
  rankdir?: 'TB' | 'LR';
  nodesep?: number;
  ranksep?: number;
  padding?: number;
  edgeWidth?: number;
}

export const C4: ComponentType<C4Props> = (props) => {
  const {
    Title,
    Item,
    data,
    options,
    rankdir = 'TB',
    nodesep = 60,
    ranksep = 80,
    padding = 60,
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
  const nodeMetaMap = new Map<string, {
    id: string;
    datum: ItemDatum;
    indexes: number[];
    themeColors: ReturnType<typeof getThemeColors>;
    isPerson: boolean;
    isExternal: boolean;
  }>();

  const nodes = items.map((item, index) => {
    const id = String((item as { id?: string | number }).id ?? index);
    const primary = getPaletteColor(options, [index]) ?? getColorPrimary(options);
    const themeColors = getThemeColors({ colorPrimary: primary }, options);
    const attrs = (item.attributes ?? {}) as Record<string, unknown>;
    const isPerson = attrs.nodeType === 'person';
    const isExternal = attrs.external === true;
    const itemB = getElementBounds(
      <Item indexes={[index]} data={data} datum={item} positionH="center" positionV="middle" themeColors={themeColors} />,
    );
    const totalHeight = itemB.height + (isPerson ? PERSON_HEAD_OFFSET : 0);
    nodeSizeMap.set(id, { width: itemB.width, height: totalHeight });
    nodeMetaMap.set(id, { id, datum: item, indexes: [index], themeColors, isPerson, isExternal });
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
    .filter(Boolean) as { id: string; source: string; target: string; relation: RelationEdgeDatum }[];

  const layout = new DagreLayout({
    rankdir,
    nodesep,
    ranksep,
    edgesep: 10,
    controlPoints: true,
    nodeSize: (node) => {
      const b = nodeSizeMap.get(String((node as { id?: string | number }).id ?? ''));
      return b ? [b.width, b.height] : [0, 0];
    },
  });
  layout.execute({ nodes, edges });

  const nodeLayouts: NodeLayout[] = [];
  layout.forEachNode((node) => {
    const id = String((node as { id?: string | number }).id ?? '');
    const meta = nodeMetaMap.get(id);
    if (!meta) return;
    const b = nodeSizeMap.get(id) ?? { width: 0, height: 0 };
    const x = (node.x ?? 0) - b.width / 2 + padding;
    const y = (node.y ?? 0) - b.height / 2 + padding;
    const itemY = y + (meta.isPerson ? PERSON_HEAD_OFFSET : 0);
    const itemHeight = b.height - (meta.isPerson ? PERSON_HEAD_OFFSET : 0);
    nodeLayouts.push({
      ...meta,
      x,
      y,
      width: b.width,
      height: b.height,
      itemY,
      itemHeight,
      centerX: x + b.width / 2,
      centerY: y + b.height / 2,
    });
  });

  if (nodeLayouts.length === 0) {
    return (
      <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
        {titleContent}
        <Group><BtnAdd indexes={[0]} x={0} y={0} /></Group>
      </FlexLayout>
    );
  }

  const nodeById = new Map<string, NodeLayout>(nodeLayouts.map((n) => [n.id, n]));
  const defaultStroke = getColorPrimary(options);
  const arrowSize = Math.max(10, edgeWidth * 5);
  const isVertical = rankdir === 'TB';
  const themeColorsDefault = getThemeColors({}, options);
  const labelBg = themeColorsDefault?.colorBg ?? '#ffffff';
  const boundaryStroke = defaultStroke;
  const decoElements: JSXElement[] = [];

  // System boundaries — group by RelationNodeDatum.group
  const groupMap = new Map<string, NodeLayout[]>();
  nodeLayouts.forEach((n) => {
    const grp = (n.datum as RelationNodeDatum).group;
    if (!grp) return;
    if (!groupMap.has(grp)) groupMap.set(grp, []);
    groupMap.get(grp)!.push(n);
  });
  groupMap.forEach((groupNodes, groupName) => {
    const minX = Math.min(...groupNodes.map((n) => n.x));
    const minY = Math.min(...groupNodes.map((n) => n.y));
    const maxX = Math.max(...groupNodes.map((n) => n.x + n.width));
    const maxY = Math.max(...groupNodes.map((n) => n.y + n.height));
    decoElements.push(
      <Rect
        x={minX - BOUNDARY_PADDING}
        y={minY - BOUNDARY_PADDING}
        width={maxX - minX + BOUNDARY_PADDING * 2}
        height={maxY - minY + BOUNDARY_PADDING * 2}
        fill="none"
        stroke={boundaryStroke}
        strokeWidth={1.5}
        strokeDasharray="6,3"
        rx={8}
        ry={8}
        data-role="c4-boundary"
      />,
    );
    decoElements.push(
      <Text
        x={minX - BOUNDARY_PADDING}
        y={minY - BOUNDARY_PADDING - 18}
        width={maxX - minX + BOUNDARY_PADDING * 2}
        height={18}
        fontSize={12}
        fill={boundaryStroke}
        fontWeight="bold"
        alignHorizontal="left"
        alignVertical="middle"
      >
        {groupName}
      </Text>,
    );
  });

  // Edges
  layout.forEachEdge((edge) => {
    const src = nodeById.get(String(edge.source));
    const tgt = nodeById.get(String(edge.target));
    if (!src || !tgt) return;

    const start: [number, number] = isVertical
      ? [src.centerX, src.y + src.height]
      : [src.x + src.width, src.centerY];
    const end: [number, number] = isVertical
      ? [tgt.centerX, tgt.y]
      : [tgt.x, tgt.centerY];
    const mid = isVertical ? (start[1] + end[1]) / 2 : (start[0] + end[0]) / 2;
    const pts: [number, number][] = isVertical
      ? [start, [start[0], mid], [end[0], mid], end]
      : [start, [mid, start[1]], [mid, end[1]], end];

    const d = createRoundedPath(pts, 10, 0, 0);
    if (!d) return;

    decoElements.push(
      <Path d={d} stroke={defaultStroke} strokeWidth={edgeWidth} fill="none" />,
    );
    const angle = Math.atan2(end[1] - pts[pts.length - 2][1], end[0] - pts[pts.length - 2][0]);
    decoElements.push(
      ...createArrowElements(end[0], end[1], angle, 'arrow', defaultStroke, edgeWidth, arrowSize),
    );

    const relation = (edge as { _original?: { relation?: RelationEdgeDatum } })._original?.relation;
    if (relation?.label) {
      const mp = getMidPoint(pts);
      if (mp) {
        decoElements.push(
          <Text
            x={mp[0] - 50}
            y={mp[1] - 12}
            width={100}
            height={16}
            fontSize={11}
            fill={defaultStroke}
            backgroundColor={labelBg}
            alignHorizontal="center"
            alignVertical="middle"
          >
            {String(relation.label)}
          </Text>,
        );
      }
    }
  });

  // Person heads & external markers
  nodeLayouts.forEach((n) => {
    if (n.isPerson) {
      decoElements.push(
        <Ellipse
          cx={n.centerX}
          cy={n.y + PERSON_HEAD_RADIUS}
          rx={PERSON_HEAD_RADIUS}
          ry={PERSON_HEAD_RADIUS}
          fill={n.themeColors?.colorPrimary ?? defaultStroke}
          data-role="person-head"
        />,
      );
    }
    if (n.isExternal) {
      decoElements.push(
        <Rect
          x={n.x - 2}
          y={n.itemY - 2}
          width={n.width + 4}
          height={n.itemHeight + 4}
          fill="none"
          stroke={defaultStroke}
          strokeWidth={1.5}
          strokeDasharray="4,2"
          data-role="c4-external"
        />,
      );
    }
  });

  const itemElements: JSXElement[] = nodeLayouts.map((n) => (
    <Item
      indexes={n.indexes}
      datum={n.datum}
      data={data}
      x={n.x}
      y={n.itemY}
      positionH="center"
      positionV="middle"
      themeColors={n.themeColors}
    />
  ));

  return (
    <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
      {titleContent}
      <Group>
        <ShapesGroup>{decoElements}</ShapesGroup>
        <ItemsGroup>{itemElements}</ItemsGroup>
        <BtnsGroup />
      </Group>
    </FlexLayout>
  );
};

registerStructure('c4', {
  component: C4,
  composites: ['title', 'item'],
});
