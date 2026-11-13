import { VIRTUAL_LIST_THRESHOLD, useVirtualList } from '@/hooks/useVirtualList';
import { Box } from '@mui/material';
import { type JSX, type ReactNode, type RefObject, useEffect } from 'react';

type VirtualListProps<T> = {
  items: T[];
  estimateSize: number;
  gap?: number;
  scrollElementRef: RefObject<HTMLElement | null>;
  getItemKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  /** Scrolls this row into view when it changes, for keyboard navigation. */
  activeIndex?: number;
};

export default function VirtualList<T>({
  items,
  estimateSize,
  gap = 8,
  scrollElementRef,
  getItemKey,
  renderItem,
  activeIndex
}: VirtualListProps<T>): JSX.Element {
  if (items.length < VIRTUAL_LIST_THRESHOLD) {
    return (
      <>
        {items.map((item, index) => (
          <Box
            key={getItemKey(item, index)}
            ref={(el: HTMLDivElement | null): void => {
              if (el && index === activeIndex) el.scrollIntoView({ block: 'nearest' });
            }}
            sx={{ mb: index < items.length - 1 ? gap / 8 : 0 }}
          >
            {renderItem(item, index)}
          </Box>
        ))}
      </>
    );
  }

  return (
    <VirtualizedList
      items={items}
      estimateSize={estimateSize + gap}
      gap={gap}
      scrollElementRef={scrollElementRef}
      getItemKey={getItemKey}
      renderItem={renderItem}
      activeIndex={activeIndex}
    />
  );
}

function VirtualizedList<T>({
  items,
  estimateSize,
  gap,
  scrollElementRef,
  getItemKey,
  renderItem,
  activeIndex
}: VirtualListProps<T>): JSX.Element {
  const { parentRef, virtualItems, virtualizer } = useVirtualList({
    count: items.length,
    estimateSize,
    gap,
    overscan: 12,
    scrollElementRef
  });

  // A row far outside the window is not rendered, so the virtualizer has to bring it in.
  useEffect(() => {
    if (activeIndex !== undefined && activeIndex >= 0) virtualizer.scrollToIndex(activeIndex, { align: 'auto' });
  }, [activeIndex, virtualizer]);

  return (
    <Box ref={parentRef}>
      <Box sx={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        {virtualItems.map((virtualRow) => {
          const item = items[virtualRow.index];
          if (!item) return null;

          return (
            <Box
              key={getItemKey(item, virtualRow.index)}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              {renderItem(item, virtualRow.index)}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
