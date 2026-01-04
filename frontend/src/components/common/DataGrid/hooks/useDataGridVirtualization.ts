import { useVirtualizer, type VirtualItem, type Virtualizer } from '@tanstack/react-virtual';
import { type RefObject, useEffect, useState } from 'react';

const ROW_HEIGHT = 22;
const DEFAULT_OVERSCAN = 30;
const OVERSCAN_MULTIPLIER = 3;

export type UseDataGridVirtualizationProps = {
  rowsCount: number;
  loading: boolean;
  tableContainerRef: RefObject<HTMLDivElement | null>;
};

export type UseDataGridVirtualizationReturn = {
  virtualRows: VirtualItem[];
  paddingTop: number;
  paddingBottom: number;
  totalSize: number;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
};

export function useDataGridVirtualization({
  rowsCount,
  loading,
  tableContainerRef
}: UseDataGridVirtualizationProps): UseDataGridVirtualizationReturn {
  const [overScan, setOverScan] = useState<number>(DEFAULT_OVERSCAN);

  useEffect(() => {
    const element = tableContainerRef.current;
    if (!element) {
      setOverScan(DEFAULT_OVERSCAN);
      return;
    }

    const calculateOverScan = (): number => {
      const containerHeight = element.clientHeight;
      if (containerHeight <= 0) return DEFAULT_OVERSCAN;

      const estimatedVisibleRows = Math.ceil(containerHeight / ROW_HEIGHT);
      return Math.max(DEFAULT_OVERSCAN, estimatedVisibleRows * OVERSCAN_MULTIPLIER);
    };

    const updateOverScan = (): void => {
      setOverScan(calculateOverScan());
    };

    updateOverScan();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      updateOverScan();
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [tableContainerRef]);

  const rowVirtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: rowsCount,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: overScan,
    enabled: rowsCount > 0 && !loading
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0) : 0;

  return {
    virtualRows,
    paddingTop,
    paddingBottom,
    totalSize,
    rowVirtualizer
  };
}
