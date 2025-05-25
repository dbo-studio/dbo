import type { ColumnType } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseColumnResizeProps {
  columns: ColumnType[];
  defaultColumnWidth?: number;
  minColumnWidth?: number;
  maxColumnWidth?: number;
  onColumnResize?: (columnSizes: Record<string, number>) => void;
}

interface UseColumnResizeReturn {
  columnSizes: Record<string, number>;
  startResize: (columnId: string, event: React.MouseEvent | React.TouchEvent) => void;
  resizingColumnId: string | null;
}

export function useColumnResize({
  columns,
  defaultColumnWidth = 200,
  minColumnWidth = 200,
  maxColumnWidth = Number.MAX_SAFE_INTEGER,
  onColumnResize
}: UseColumnResizeProps): UseColumnResizeReturn {
  // Store column sizes in a state
  const [columnSizes, setColumnSizes] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);

  // Refs for tracking resize state
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Refs for event handlers to avoid stale closures
  const isResizingRef = useRef(isResizing);
  const resizingColumnIdRef = useRef(resizingColumnId);
  const columnSizesRef = useRef(columnSizes);

  // Update refs when state changes
  useEffect(() => {
    isResizingRef.current = isResizing;
    resizingColumnIdRef.current = resizingColumnId;
    columnSizesRef.current = columnSizes;
  }, [isResizing, resizingColumnId, columnSizes]);

  // Initialize column sizes on mount or when columns change
  useEffect(() => {
    const initialSizes: Record<string, number> = {};

    // First, preserve any existing column sizes
    for (const key in columnSizesRef.current) {
      initialSizes[key] = columnSizesRef.current[key];
    }

    // Then ensure all columns have a defined width
    for (const column of columns) {
      // If column doesn't have a size yet, set it to default
      if (!initialSizes[column.name]) {
        initialSizes[column.name] = defaultColumnWidth;
      }
    }

    // Also add the 'select' column if it's not already there
    if (!initialSizes.select) {
      initialSizes.select = 30; // Fixed width for checkbox column
    }

    setColumnSizes(initialSizes);
  }, [columns, defaultColumnWidth]);

  // Event handlers
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isResizingRef.current || !resizingColumnIdRef.current) return;

      const deltaX = event.clientX - startXRef.current;
      const newWidth = Math.max(minColumnWidth, Math.min(maxColumnWidth, startWidthRef.current + deltaX));

      // Only update the width of the column being resized
      setColumnSizes((prev) => ({
        ...prev,
        [resizingColumnIdRef.current as string]: newWidth
      }));
    },
    [minColumnWidth, maxColumnWidth]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!isResizingRef.current || !resizingColumnIdRef.current) return;

      const deltaX = event.touches[0].clientX - startXRef.current;
      const newWidth = Math.max(minColumnWidth, Math.min(maxColumnWidth, startWidthRef.current + deltaX));

      // Only update the width of the column being resized
      setColumnSizes((prev) => ({
        ...prev,
        [resizingColumnIdRef.current as string]: newWidth
      }));
    },
    [minColumnWidth, maxColumnWidth]
  );

  const handleMouseUp = useCallback(() => {
    if (isResizingRef.current && resizingColumnIdRef.current && onColumnResize) {
      onColumnResize(columnSizesRef.current);
    }

    setIsResizing(false);
    setResizingColumnId(null);

    // Remove document-level event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleMouseUp);
  }, [onColumnResize]);

  // Start resize handler
  const startResize = useCallback(
    (columnId: string, event: React.MouseEvent | React.TouchEvent) => {
      // Skip resize for checkbox column
      if (columnId === 'select') return;

      // Get initial position
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;

      startXRef.current = clientX;
      startWidthRef.current = columnSizesRef.current[columnId] || defaultColumnWidth;

      setIsResizing(true);
      setResizingColumnId(columnId);

      // Add document-level event listeners for resize tracking
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);

      // Prevent default to avoid text selection during resize
      event.preventDefault();
    },
    [defaultColumnWidth, handleMouseMove, handleMouseUp, handleTouchMove]
  );

  // Clean up event listeners on unmount
  useEffect(() => {
    return (): void => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove]);

  return {
    columnSizes,
    startResize,
    resizingColumnId
  };
}
