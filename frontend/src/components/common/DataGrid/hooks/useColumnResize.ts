import type { ColumnType } from '@/types';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

type UseColumnResizeProps = {
  columns: ColumnType[];
  defaultColumnWidth?: number;
  onColumnResize?: (columnSizes: Record<string, number>) => void;
};

interface UseColumnResizeReturn {
  columnSizes: Record<string, number>;
  startResize: (columnId: string, event: React.MouseEvent | React.TouchEvent) => void;
  resizingColumnId: string | null;
}

export function useColumnResize({
  columns,
  defaultColumnWidth = 200,
  onColumnResize
}: UseColumnResizeProps): UseColumnResizeReturn {
  const [resizedColumnSizes, setResizedColumnSizes] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);

  const columnSizes = useMemo(() => {
    const sizes: Record<string, number> = { select: 30 };
    for (const column of columns) {
      sizes[column.name] = resizedColumnSizes[column.name] ?? defaultColumnWidth;
    }
    return sizes;
  }, [columns, defaultColumnWidth, resizedColumnSizes]);

  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Event handlers close over refs so a document listener does not see a stale render.
  const isResizingRef = useRef(isResizing);
  const resizingColumnIdRef = useRef(resizingColumnId);
  const columnSizesRef = useRef(columnSizes);

  useEffect(() => {
    isResizingRef.current = isResizing;
    resizingColumnIdRef.current = resizingColumnId;
    columnSizesRef.current = columnSizes;
  }, [isResizing, resizingColumnId, columnSizes]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isResizingRef.current || !resizingColumnIdRef.current) return;

    const deltaX = event.clientX - startXRef.current;
    const newWidth = startWidthRef.current + deltaX;

    setResizedColumnSizes((prev) => ({
      ...prev,
      [resizingColumnIdRef.current as string]: newWidth
    }));
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!isResizingRef.current || !resizingColumnIdRef.current) return;

    const deltaX = event.touches[0].clientX - startXRef.current;
    const newWidth = startWidthRef.current + deltaX;

    setResizedColumnSizes((prev) => ({
      ...prev,
      [resizingColumnIdRef.current as string]: newWidth
    }));
  }, []);

  const onEndResizeRef = useRef<() => void>(() => {});
  const onEndResize = useMemo(() => () => onEndResizeRef.current(), []);

  useLayoutEffect(() => {
    onEndResizeRef.current = (): void => {
      if (isResizingRef.current && resizingColumnIdRef.current && onColumnResize) {
        onColumnResize(columnSizesRef.current);
      }

      setIsResizing(false);
      setResizingColumnId(null);

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', onEndResize);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', onEndResize);
    };
  }, [handleMouseMove, handleTouchMove, onColumnResize, onEndResize]);

  const startResize = useCallback(
    (columnId: string, event: React.MouseEvent | React.TouchEvent) => {
      if (columnId === 'select') return;

      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;

      startXRef.current = clientX;
      startWidthRef.current = columnSizesRef.current[columnId] || defaultColumnWidth;

      setIsResizing(true);
      setResizingColumnId(columnId);

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', onEndResize);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', onEndResize);

      event.preventDefault();
    },
    [defaultColumnWidth, handleMouseMove, handleTouchMove, onEndResize]
  );

  useEffect(() => {
    return (): void => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', onEndResize);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', onEndResize);
    };
  }, [handleMouseMove, handleTouchMove, onEndResize]);

  return {
    columnSizes,
    startResize,
    resizingColumnId
  };
}
