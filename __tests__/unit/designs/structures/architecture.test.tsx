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
