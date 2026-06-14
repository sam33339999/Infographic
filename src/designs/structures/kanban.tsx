import type { ComponentType, JSXElement } from '../../jsx';
import { getElementBounds, Group, Rect, Text } from '../../jsx';
import { BtnAdd, BtnRemove, BtnsGroup, ItemsGroup, ShapesGroup } from '../components';
import { FlexLayout } from '../layouts';
import { getColorPrimary, getPaletteColor, getThemeColors } from '../utils';
import { registerStructure } from './registry';
import type { BaseStructureProps } from './types';

export interface KanbanProps extends BaseStructureProps {
  columnGap?: number;
  itemGap?: number;
  headerHeight?: number;
  columnPadding?: number;
}

export const Kanban: ComponentType<KanbanProps> = (props) => {
  const {
    Title,
    Item,
    data,
    options,
    columnGap = 20,
    itemGap = 12,
    headerHeight = 40,
    columnPadding = 12,
  } = props;
  const { title, desc, items = [] } = data;
  const titleContent = Title ? <Title title={title} desc={desc} /> : null;

  if (!Item || items.length === 0) {
    return (
      <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
        {titleContent}
        <Group><BtnAdd indexes={[0]} x={0} y={0} /></Group>
      </FlexLayout>
    );
  }

  // Group items by category, preserving insertion order
  const categoryOrder: string[] = [];
  const grouped = new Map<string, typeof items>();
  items.forEach((item) => {
    const cat = String((item as any).category ?? 'Backlog');
    if (!grouped.has(cat)) {
      grouped.set(cat, []);
      categoryOrder.push(cat);
    }
    grouped.get(cat)!.push(item);
  });

  const itemBounds = getElementBounds(
    <Item indexes={[0]} data={data} datum={items[0]} positionH="center" />,
  );
  const btnBounds = getElementBounds(<BtnAdd indexes={[0]} />);
  const columnWidth = itemBounds.width + columnPadding * 2;

  const itemElements: JSXElement[] = [];
  const decoElements: JSXElement[] = [];
  const btnElements: JSXElement[] = [];

  const itemIndexMap = new Map<(typeof items)[number], number>();
  items.forEach((item, i) => itemIndexMap.set(item, i));

  let colX = 0;
  categoryOrder.forEach((cat, colIndex) => {
    const colItems = grouped.get(cat)!;
    const primary = getPaletteColor(options, [colIndex]) ?? getColorPrimary(options);
    const themeColors = getThemeColors({ colorPrimary: primary }, options);

    // Column header background
    decoElements.push(
      <Rect x={colX} y={0} width={columnWidth} height={headerHeight} fill={primary} rx={6} ry={6} />,
    );
    // Column header text
    decoElements.push(
      <Text
        x={colX}
        y={0}
        width={columnWidth}
        height={headerHeight}
        fontSize={14}
        fontWeight="bold"
        fill={themeColors?.colorBg ?? '#ffffff'}
        alignHorizontal="center"
        alignVertical="middle"
      >
        {cat}
      </Text>,
    );

    let itemY = headerHeight + itemGap;
    colItems.forEach((item) => {
      const flatIndex = itemIndexMap.get(item) ?? 0;
      itemElements.push(
        <Item
          indexes={[flatIndex]}
          datum={item}
          data={data}
          x={colX + columnPadding}
          y={itemY}
          positionH="center"
          themeColors={themeColors}
        />,
      );
      btnElements.push(
        <BtnRemove
          indexes={[flatIndex]}
          x={colX + columnWidth - btnBounds.width - 4}
          y={itemY + (itemBounds.height - btnBounds.height) / 2}
        />,
      );
      itemY += itemBounds.height + itemGap;
    });

    // Add button at bottom of column
    btnElements.push(
      <BtnAdd
        indexes={[items.length]}
        x={colX + (columnWidth - btnBounds.width) / 2}
        y={itemY}
      />,
    );

    colX += columnWidth + columnGap;
  });

  return (
    <FlexLayout id="infographic-container" flexDirection="column" justifyContent="center" alignItems="center">
      {titleContent}
      <Group>
        <ShapesGroup>{decoElements}</ShapesGroup>
        <ItemsGroup>{itemElements}</ItemsGroup>
        <BtnsGroup>{btnElements}</BtnsGroup>
      </Group>
    </FlexLayout>
  );
};

registerStructure('kanban', {
  component: Kanban,
  composites: ['title', 'item'],
});
