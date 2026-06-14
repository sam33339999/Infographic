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
    // 3 unique categories → 3 column header rects with rx="6"
    const headerRects = svg.match(/rx="6"/g) ?? [];
    expect(headerRects).toHaveLength(3);
  });

  it('renders all items', () => {
    const svg = minifySvg(renderSVG(<Kanban Item={Item} Items={[]} data={data} options={options} />));
    // 4 item rects (width="120" from mock Item)
    const itemRects = svg.match(/width="120"/g) ?? [];
    expect(itemRects.length).toBeGreaterThanOrEqual(4);
  });

  it('renders without crashing on empty data', () => {
    const emptyData = { items: [], relations: [] } as unknown as ParsedData;
    const svg = renderSVG(<Kanban Item={Item} Items={[]} data={emptyData} options={options} />);
    expect(svg).toBeTruthy();
  });
});
