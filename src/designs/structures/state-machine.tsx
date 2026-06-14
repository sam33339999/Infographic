import { DagreLayout } from '@antv/layout';
import type { ComponentType, JSXElement } from '../../jsx';
import { Ellipse, getElementBounds, Group, Path, Text } from '../../jsx';
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

const LOOP_RADIUS = 20;
const INITIAL_CIRCLE_RADIUS = 8;
const INITIAL_OFFSET = 30;

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
  const nodeMetaMap = new Map<string, { id: string; datum: ItemDatum; indexes: number[]; themeColors: ReturnType<typeof getThemeColors> }>();

  const nodes = items.map((item, index) => {
    const id = String((item as { id?: string | number }).id ?? index);
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

  // Separate self-loops (dagre can't layout self-loop edges well)
  const selfLoopRelations: RelationEdgeDatum[] = [];
  const normalEdges: { id: string; source: string; target: string; relation: RelationEdgeDatum }[] = [];
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
  layout.execute({ nodes, edges: normalEdges });

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
  const themeColorsDefault = getThemeColors({}, options);
  const labelBg = themeColorsDefault?.colorBg ?? '#ffffff';
  const decoElements: JSXElement[] = [];

  // Normal edges
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

    decoElements.push(<Path d={d} stroke={defaultStroke} strokeWidth={edgeWidth} fill="none" />);

    const angle = Math.atan2(end[1] - pts[pts.length - 2][1], end[0] - pts[pts.length - 2][0]);
    decoElements.push(...createArrowElements(end[0], end[1], angle, 'triangle', defaultStroke, edgeWidth, arrowSize));

    const relation = (edge as { _original?: { relation?: RelationEdgeDatum } })._original?.relation;
    if (relation?.label) {
      const mp = getMidPoint(pts);
      if (mp) {
        decoElements.push(
          <Text
            x={mp[0] - 30}
            y={mp[1] - 16}
            width={60}
            height={14}
            fontSize={12}
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

  // Self-loop edges: cubic arc above the node
  selfLoopRelations.forEach((r) => {
    const srcId = resolveId(r.from);
    if (!srcId) return;
    const n = nodeById.get(srcId);
    if (!n) return;

    const topX = n.centerX;
    // Arc starts top-left of node, curves up and ends top-right
    const arcD = `M ${topX - LOOP_RADIUS} ${n.y} C ${topX - LOOP_RADIUS * 2} ${n.y - LOOP_RADIUS * 3} ${topX + LOOP_RADIUS * 2} ${n.y - LOOP_RADIUS * 3} ${topX + LOOP_RADIUS} ${n.y}`;
    decoElements.push(<Path d={arcD} stroke={defaultStroke} strokeWidth={edgeWidth} fill="none" />);

    // Arrow at end point (top-right of arc, pointing downward)
    const endAngle = Math.PI / 2;
    decoElements.push(...createArrowElements(topX + LOOP_RADIUS, n.y, endAngle, 'triangle', defaultStroke, edgeWidth, arrowSize - 2));

    if (r.label) {
      decoElements.push(
        <Text
          x={topX - 30}
          y={n.y - LOOP_RADIUS * 3 - 14}
          width={60}
          height={14}
          fontSize={12}
          fill={defaultStroke}
          backgroundColor={labelBg}
          alignHorizontal="center"
          alignVertical="middle"
        >
          {String(r.label)}
        </Text>,
      );
    }
  });

  // Initial/final state markers
  nodeLayouts.forEach((n) => {
    const attrs = n.datum.attributes ?? {};

    if (attrs.initial) {
      const mx = n.x - INITIAL_OFFSET;
      const my = n.centerY;
      // Filled black dot
      decoElements.push(
        <Ellipse cx={mx} cy={my} rx={INITIAL_CIRCLE_RADIUS} ry={INITIAL_CIRCLE_RADIUS} fill={defaultStroke} data-marker="initial" />,
      );
      // Line from dot to node
      decoElements.push(
        <Path d={`M ${mx + INITIAL_CIRCLE_RADIUS} ${my} L ${n.x} ${my}`} stroke={defaultStroke} strokeWidth={edgeWidth} fill="none" />,
      );
      // Arrow at node entry
      const angle = Math.atan2(0, n.x - (mx + INITIAL_CIRCLE_RADIUS));
      decoElements.push(
        ...createArrowElements(n.x, my, angle, 'triangle', defaultStroke, edgeWidth, arrowSize - 2),
      );
    }

    if (attrs.final) {
      // Outer ring = slightly larger ellipse around the node
      const ringPad = 6;
      const rx = n.width / 2 + ringPad;
      const ry = n.height / 2 + ringPad;
      decoElements.push(
        <Ellipse
          cx={n.centerX}
          cy={n.centerY}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={defaultStroke}
          strokeWidth={2}
          data-marker="final"
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

registerStructure('state-machine', {
  component: StateMachine,
  composites: ['title', 'item'],
});
