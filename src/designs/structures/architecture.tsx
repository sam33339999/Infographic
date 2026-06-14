import { DagreLayout } from '@antv/layout';
import type { ComponentType, JSXElement } from '../../jsx';
import { getElementBounds, Group, Path, Rect, Text } from '../../jsx';
import type { ItemDatum, RelationData, RelationEdgeDatum } from '../../types';
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

interface NodeLayout {
  id: string;
  datum: ItemDatum;
  indexes: number[];
  group: string;
  themeColors: ReturnType<typeof getThemeColors>;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
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
  const nodeMetaMap = new Map<string, { id: string; datum: ItemDatum; indexes: number[]; group: string; themeColors: ReturnType<typeof getThemeColors> }>();
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

  const nodeLayouts: NodeLayout[] = [];
  layout.forEachNode((node) => {
    const id = String(node.id);
    const meta = nodeMetaMap.get(id);
    if (!meta) return;
    const b = nodeSizeMap.get(id) ?? { width: 0, height: 0 };
    const x = (node.x ?? 0) - b.width / 2 + padding;
    const y = (node.y ?? 0) - b.height / 2 + padding;
    nodeLayouts.push({
      ...meta,
      x,
      y,
      width: b.width,
      height: b.height,
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
  const decoElements: JSXElement[] = [];

  // System boundary boxes per group
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
      const bColor = getPaletteColor(options, [groupColorIdx++]) ?? defaultStroke;

      decoElements.push(
        <Rect
          x={minX}
          y={minY}
          width={maxX - minX}
          height={maxY - minY}
          fill="none"
          stroke={bColor}
          strokeWidth={1.5}
          strokeDasharray="6,3"
          rx={8}
          ry={8}
        />,
      );
      decoElements.push(
        <Text
          x={minX + 10}
          y={minY + 4}
          width={maxX - minX - 20}
          height={20}
          fontSize={12}
          fill={bColor}
          alignHorizontal="left"
          alignVertical="top"
        >
          {groupName}
        </Text>,
      );
    });
  }

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

    const angle = Math.atan2(
      end[1] - pts[pts.length - 2][1],
      end[0] - pts[pts.length - 2][0],
    );
    decoElements.push(
      ...createArrowElements(end[0], end[1], angle, 'triangle', defaultStroke, edgeWidth, arrowSize),
    );

    const relation = (edge as { _original?: { relation?: RelationEdgeDatum } })._original?.relation;
    if (relation?.label) {
      const mp = getMidPoint(pts);
      if (mp) {
        decoElements.push(
          <Text
            x={mp[0] - 30}
            y={mp[1] - 10}
            width={60}
            height={20}
            fontSize={12}
            fill={defaultStroke}
            alignHorizontal="center"
            alignVertical="middle"
          >
            {String(relation.label)}
          </Text>,
        );
      }
    }
  });

  const itemElements: JSXElement[] = nodeLayouts.map((n) => (
    <Item
      indexes={n.indexes}
      datum={n.datum}
      data={data}
      x={n.x}
      y={n.y}
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

registerStructure('architecture', {
  component: Architecture,
  composites: ['title', 'item'],
});
