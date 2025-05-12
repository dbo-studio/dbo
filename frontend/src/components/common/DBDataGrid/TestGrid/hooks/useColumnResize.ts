import { useState, useCallback, useRef, useEffect } from 'react';
import type { ColumnType } from '@/types';

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
  isResizing: boolean;
  resizingColumnId: string | null;
}

export function useColumnResize({
  columns,
  defaultColumnWidth = 150,
  minColumnWidth = 50,
  maxColumnWidth = 400,
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
    const columnNames = columns.map(c => c.name);

    columns.forEach(column => {
      // Use existing size if available, otherwise use default
      initialSizes[column.name] = columnSizesRef.current[column.name] || defaultColumnWidth;
    });

    setColumnSizes(initialSizes);
  }, [columns, defaultColumnWidth]);

  // Event handlers
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isResizingRef.current || !resizingColumnIdRef.current) return;

    const deltaX = event.clientX - startXRef.current;
    const newWidth = Math.max(minColumnWidth, Math.min(maxColumnWidth, startWidthRef.current + deltaX));

    setColumnSizes(prev => ({
      ...prev,
      [resizingColumnIdRef.current!]: newWidth
    }));
  }, [minColumnWidth, maxColumnWidth]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!isResizingRef.current || !resizingColumnIdRef.current) return;

    const deltaX = event.touches[0].clientX - startXRef.current;
    const newWidth = Math.max(minColumnWidth, Math.min(maxColumnWidth, startWidthRef.current + deltaX));

    setColumnSizes(prev => ({
      ...prev,
      [resizingColumnIdRef.current!]: newWidth
    }));
  }, [minColumnWidth, maxColumnWidth]);

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
  const startResize = useCallback((columnId: string, event: React.MouseEvent | React.TouchEvent) => {
    // Skip resize for checkbox column
    if (columnId === 'select') return;

    // Get initial position
    const clientX = 'touches' in event 
      ? event.touches[0].clientX 
      : event.clientX;

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
  }, [defaultColumnWidth, handleMouseMove, handleMouseUp, handleTouchMove]);

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove]);

  return {
    columnSizes,
    startResize,
    isResizing,
    resizingColumnId
  };
}
