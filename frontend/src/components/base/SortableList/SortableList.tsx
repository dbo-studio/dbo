'use no memo';

import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core';
import { restrictToHorizontalAxis, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import SortableItem from './SortableItem/SortableItem';
import { SortableListContainerStyled, SortableOverlayStyled } from './SortableList.styled';
import type { SortableListProps } from './types';

function clearDragCursor(): void {
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
}

const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    return pointerHits;
  }
  return closestCenter(args);
};

function SortableList<T>({
  items,
  onReorder,
  renderItem,
  getItemId,
  direction = 'horizontal',
  activationDistance = 8,
  className,
  onDragStart,
  onDragEnd,
  onDragCancel
}: SortableListProps<T>): JSX.Element {
  const [activeId, setActiveId] = useState<string | null>(null);
  const itemIds = items.map((item) => getItemId(item));
  const activeIndex = activeId ? items.findIndex((item) => getItemId(item) === activeId) : -1;
  const activeItem = activeIndex >= 0 ? items[activeIndex] : undefined;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: activationDistance
      }
    })
  );

  const strategy = direction === 'horizontal' ? horizontalListSortingStrategy : verticalListSortingStrategy;
  const axisModifier = direction === 'horizontal' ? restrictToHorizontalAxis : restrictToVerticalAxis;

  const handleDragStart = useCallback(
    (event: DragStartEvent): void => {
      setActiveId(String(event.active.id));
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      onDragStart?.();
    },
    [onDragStart]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      clearDragCursor();
      setActiveId(null);

      const { active, over } = event;

      if (over && active.id !== over.id) {
        onReorder(String(active.id), String(over.id));
      }

      onDragEnd?.(event);
    },
    [onReorder, onDragEnd]
  );

  const handleDragCancel = useCallback((): void => {
    clearDragCursor();
    setActiveId(null);
    onDragCancel?.();
  }, [onDragCancel]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[axisModifier]}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always
        }
      }}
      autoScroll={{
        layoutShiftCompensation: direction === 'horizontal' ? { x: true, y: false } : { x: false, y: true },
        threshold: direction === 'horizontal' ? { x: 0.2, y: 0 } : { x: 0, y: 0.2 }
      }}
    >
      <SortableContext items={itemIds} strategy={strategy}>
        <SortableListContainerStyled className={className} direction={direction}>
          {items.map((item, index) => {
            const id = getItemId(item);
            return (
              <SortableItem key={id} id={id} direction={direction}>
                {renderItem(item, index, { overlay: false })}
              </SortableItem>
            );
          })}
        </SortableListContainerStyled>
      </SortableContext>
      <DragOverlay dropAnimation={null} modifiers={[axisModifier]}>
        {activeItem ? (
          <SortableOverlayStyled data-sortable-overlay=''>
            {renderItem(activeItem, activeIndex, { overlay: true })}
          </SortableOverlayStyled>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

SortableList.displayName = 'SortableList';

export default SortableList;
