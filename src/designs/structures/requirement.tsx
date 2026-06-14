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

const REQ_HEADER_HEIGHT = 20;

const RISK_COLORS: Record<string, string> = {
  high: '#ff4d4f',
  medium: '#faad14',
  low: '#52c41a',
};

const REQ_TYPE_LABELS: Record<string, string> = {
  requirement: 'requirement',
  functionalRequirement: 'functional',
  performanceRequirement: 'performance',
  interfaceRequirement: 'interface',
  physicalRequirement: 'physical',
  designConstraint: 'constraint',
  element: 'element',
};

interface NodeLayout {
  id: string;
  datum: ItemDatum;
  indexes: number[];
  themeColors: ReturnType<typeof getThemeColors>;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

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
  const nodeMetaMap = new Map<string, { id: string; datum: ItemDatum; indexes: number[]; themeColors: ReturnType<typeof getThemeColors> }>();

  const nodes = items.map((item, index) => {
    const id = String((item as { id?: string | number }).id ?? index);
    const primary = getPaletteColor(options, [index]) ?? getColorPrimary(options);
    const themeColors = getThemeColors({ colorPrimary: primary }, options);
    // Reserve space for header strip above the Item
    const itemB = getElementBounds(
      <Item indexes={[index]} data={data} datum={item} positionH="center" positionV="middle" themeColors={themeColors} />,
    );
    nodeSizeMap.set(id, { width: itemB.width, height: itemB.height + REQ_HEADER_HEIGHT });
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
  const themeColorsDefault = getThemeColors({}, options);
  const labelBg = themeColorsDefault?.colorBg ?? '#ffffff';
  const decoElements: JSXElement[] = [];

  // Edges (dashed to follow requirement diagram convention)
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
      <Path d={d} stroke={defaultStroke} strokeWidth={edgeWidth} fill="none" strokeDasharray="6,3" />,
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
            x={mp[0] - 40}
            y={mp[1] - 10}
            width={80}
            height={16}
            fontSize={11}
            fill={defaultStroke}
            backgroundColor={labelBg}
            alignHorizontal="center"
            alignVertical="middle"
          >
            {`«${String(relation.label)}»`}
          </Text>,
        );
      }
    }
  });

  // Node header strips
  nodeLayouts.forEach((n) => {
    const attrs = n.datum.attributes as Record<string, unknown> ?? {};
    const reqType = String(attrs.reqType ?? 'requirement');
    const risk = String(attrs.risk ?? '');
    const headerLabel = REQ_TYPE_LABELS[reqType] ?? reqType;
    const primary = n.themeColors?.colorPrimary ?? defaultStroke;
    const riskColor = RISK_COLORS[risk];

    decoElements.push(
      <Rect
        x={n.x}
        y={n.y}
        width={n.width}
        height={REQ_HEADER_HEIGHT}
        fill={primary}
        rx={4}
        ry={4}
        data-role="req-header"
      />,
    );
    decoElements.push(
      <Text
        x={n.x + 4}
        y={n.y}
        width={n.width - (riskColor ? 30 : 8)}
        height={REQ_HEADER_HEIGHT}
        fontSize={11}
        fill="#ffffff"
        fontWeight="bold"
        alignHorizontal="left"
        alignVertical="middle"
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
      indexes={n.indexes}
      datum={n.datum}
      data={data}
      x={n.x}
      y={n.y + REQ_HEADER_HEIGHT}
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

registerStructure('requirement', {
  component: Requirement,
  composites: ['title', 'item'],
});
