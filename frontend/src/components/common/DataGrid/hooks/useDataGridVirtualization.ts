import { useVirtualizer, type VirtualItem, type Virtualizer } from '@tanstack/react-virtual';

const ROW_HEIGHT = 22;

export type UseDataGridVirtualizationProps = {
  rowsCount: number;
  loading: boolean;
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
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
  const rowVirtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: rowsCount,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    enabled: rowsCount > 0 && !loading
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0) : 0;

  return {
    virtualRows,
    paddingTop,
    paddingBottom,
    totalSize,
    rowVirtualizer
  };
}

