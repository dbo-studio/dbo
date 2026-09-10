import { useVirtualizer, type VirtualItem, type Virtualizer } from '@tanstack/react-virtual';
import { type RefObject, useRef } from 'react';

export type UseVirtualListOptions = {
  count: number;
  estimateSize: number;
  gap?: number;
  overscan?: number;
  enabled?: boolean;
  scrollElementRef?: RefObject<HTMLElement | null>;
};

export type UseVirtualListReturn = {
  parentRef: RefObject<HTMLDivElement | null>;
  virtualItems: VirtualItem[];
  paddingTop: number;
  paddingBottom: number;
  totalSize: number;
  virtualizer: Virtualizer<HTMLElement, Element>;
};

export function useVirtualList({
  count,
  estimateSize,
  gap = 0,
  overscan = 10,
  enabled = true,
  scrollElementRef
}: UseVirtualListOptions): UseVirtualListReturn {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer<HTMLElement, Element>({
    count,
    gap,
    overscan,
    enabled: enabled && count > 0,
    estimateSize: () => estimateSize,
    getScrollElement: () => scrollElementRef?.current ?? parentRef.current
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0;
  const paddingBottom = virtualItems.length > 0 ? totalSize - (virtualItems[virtualItems.length - 1]?.end ?? 0) : 0;

  return {
    parentRef,
    virtualItems,
    paddingTop,
    paddingBottom,
    totalSize,
    virtualizer
  };
}

/** ponytail: flat sibling lists only; nested tree folders use per-node cap + search instead. */
export const VIRTUAL_LIST_THRESHOLD = 30;
