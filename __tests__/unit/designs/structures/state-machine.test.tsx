/** @jsxImportSource ../../../../src */
import { describe, expect, it } from 'vitest';
import type { ComponentType, ParsedInfographicOptions } from '../../../../src';
import { Rect, renderSVG } from '../../../../src';
import type { BaseItemProps } from '../../../../src/designs/items';
import { StateMachine } from '../../../../src/designs/structures/state-machine';
import type { ParsedData } from '../../../../src/types';
import { minifySvg } from '../../../utils';

const Item: ComponentType<
  Omit<BaseItemProps, 'themeColors'> & Partial<Pick<BaseItemProps, 'themeColors'>>
> = ({ x = 0, y = 0 }) => <Rect x={x} y={y} width={80} height={40} />;

const data: ParsedData = {
  items: [
    { id: 'idle', label: 'Idle', attributes: { initial: true } },
    { id: 'running', label: 'Running' },
    { id: 'done', label: 'Done', attributes: { final: true } },
  ],
  relations: [
    { from: 'idle', to: 'running', label: 'start' },
    { from: 'running', to: 'done', label: 'finish' },
    { from: 'running', to: 'running', label: 'loop' },
  ],
} as unknown as ParsedData;

const options = {
  data,
  themeConfig: { colorBg: '#ffffff', colorPrimary: '#1677ff' },
} as ParsedInfographicOptions;

describe('StateMachine', () => {
  it('renders all state items', () => {
    const svg = minifySvg(renderSVG(<StateMachine Item={Item} Items={[]} data={data} options={options} />));
    const rects = svg.match(/width="80"/g) ?? [];
    expect(rects.length).toBeGreaterThanOrEqual(3);
  });

  it('renders initial state marker', () => {
    const svg = minifySvg(renderSVG(<StateMachine Item={Item} Items={[]} data={data} options={options} />));
    expect(svg).toContain('data-marker="initial"');
  });

  it('renders final state double ring', () => {
    const svg = minifySvg(renderSVG(<StateMachine Item={Item} Items={[]} data={data} options={options} />));
    expect(svg).toContain('data-marker="final"');
  });

  it('renders without crashing on empty data', () => {
    const emptyData = { items: [], relations: [] } as unknown as ParsedData;
    const svg = renderSVG(<StateMachine Item={Item} Items={[]} data={emptyData} options={options} />);
    expect(svg).toBeTruthy();
  });
});
