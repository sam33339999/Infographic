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

  it('renders edge label with satisfies text', () => {
    const svg = minifySvg(renderSVG(<Requirement Item={Item} Items={[]} data={data} options={options} />));
    expect(svg).toContain('satisfies');
  });

  it('renders without crashing on empty data', () => {
    const emptyData = { items: [], relations: [] } as unknown as ParsedData;
    const svg = renderSVG(<Requirement Item={Item} Items={[]} data={emptyData} options={options} />);
    expect(svg).toBeTruthy();
  });
});
