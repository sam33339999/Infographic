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
