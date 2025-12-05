import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { restrictToHorizontalAxis, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Box } from '@mui/material';
import type { JSX } from 'react';
import { memo, useCallback, useMemo } from 'react';
import type { SortableListProps } from './types';

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
    const itemIds = useMemo(() => items.map((item) => getItemId(item)), [items, getItemId]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: activationDistance
            }
        })
    );

    const strategy = direction === 'horizontal' ? horizontalListSortingStrategy : verticalListSortingStrategy;
    const modifier = direction === 'horizontal' ? restrictToHorizontalAxis : restrictToVerticalAxis;

    const handleDragStart = useCallback((): void => {
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        onDragStart?.();
    }, [onDragStart]);

    const handleDragEnd = useCallback(
        (event: DragEndEvent): void => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            const { active, over } = event;

            if (over && active.id !== over.id) {
                onReorder(active.id as string, over.id as string);
            }

            onDragEnd?.(event);
        },
        [onReorder, onDragEnd]
    );

    const handleDragCancel = useCallback((): void => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        onDragCancel?.();
    }, [onDragCancel]);

    const renderedItems = useMemo(
        () => items.map((item, index) => renderItem(item, index)),
        [items, renderItem]
    );

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            modifiers={[modifier]}
        >
            <SortableContext items={itemIds} strategy={strategy}>
                <Box
                    className={className}
                    sx={{
                        display: 'flex',
                        flexDirection: direction === 'horizontal' ? 'row' : 'column',
                        touchAction: direction === 'horizontal' ? 'pan-x' : 'pan-y',
                        contain: 'layout style'
                    }}
                >
                    {renderedItems}
                </Box>
            </SortableContext>
        </DndContext>
    );
}

SortableList.displayName = 'SortableList';

export default memo(SortableList) as typeof SortableList;

