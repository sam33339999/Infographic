/** @jsxImportSource ../../../../src */
import { describe, expect, it } from 'vitest';
import type { ComponentType, ParsedInfographicOptions } from '../../../../src';
import { Rect, renderSVG } from '../../../../src';
import type { BaseItemProps } from '../../../../src/designs/items';
import { C4 } from '../../../../src/designs/structures/c4';
import type { ParsedData } from '../../../../src/types';
import { minifySvg } from '../../../utils';

const Item: ComponentType<
  Omit<BaseItemProps, 'themeColors'> & Partial<Pick<BaseItemProps, 'themeColors'>>
> = ({ x = 0, y = 0 }) => <Rect x={x} y={y} width={120} height={60} />;

const data: ParsedData = {
  items: [
    { id: 'u1', label: 'User', group: 'external', attributes: { nodeType: 'person' } },
    { id: 's1', label: 'WebApp', group: 'system', attributes: { nodeType: 'system' } },
    { id: 's2', label: 'Database', group: 'system', attributes: { nodeType: 'database', external: false } },
  ],
  relations: [{ from: 'u1', to: 's1', label: 'HTTPS' }],
} as unknown as ParsedData;

const options = {
  data,
  themeConfig: { colorBg: '#ffffff', colorPrimary: '#1677ff' },
} as ParsedInfographicOptions;

describe('C4', () => {
  it('renders system boundary boxes', () => {
    const svg = minifySvg(renderSVG(<C4 Item={Item} Items={[]} data={data} options={options} />));
    // 2 boundaries: 'external' group + 'system' group
    const boundaries = svg.match(/data-role="c4-boundary"/g) ?? [];
    expect(boundaries.length).toBeGreaterThanOrEqual(2);
  });

  it('renders person head marker', () => {
    const svg = minifySvg(renderSVG(<C4 Item={Item} Items={[]} data={data} options={options} />));
    expect(svg).toContain('data-role="person-head"');
  });

  it('renders item boxes', () => {
    const svg = minifySvg(renderSVG(<C4 Item={Item} Items={[]} data={data} options={options} />));
    // 3 nodes each render a width=120 rect
    const rects = svg.match(/width="120"/g) ?? [];
    expect(rects.length).toBeGreaterThanOrEqual(3);
  });

  it('renders without crashing on empty data', () => {
    const emptyData = { items: [], relations: [] } as unknown as ParsedData;
    const svg = renderSVG(<C4 Item={Item} Items={[]} data={emptyData} options={options} />);
    expect(svg).toBeTruthy();
  });
});
