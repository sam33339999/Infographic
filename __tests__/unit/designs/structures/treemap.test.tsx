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

const data = {
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
    // 3 leaf nodes → at least 3 colored rects
    const rects = svg.match(/<rect[^/]*\/>/g) ?? [];
    expect(rects.length).toBeGreaterThanOrEqual(3);
  });

  it('renders label text for leaf nodes with enough space', () => {
    const svg = minifySvg(renderSVG(<Treemap Item={Item} Items={[]} data={data} options={options} />));
    expect(svg).toContain('>A<');
    expect(svg).toContain('>B<');
    expect(svg).toContain('>C<');
  });

  it('renders without crashing on empty data', () => {
    const emptyData = { items: [] } as unknown as ParsedData;
    const svg = renderSVG(<Treemap Item={Item} Items={[]} data={emptyData} options={options} />);
    expect(svg).toBeTruthy();
  });
});
