import type { ColumnType } from '@/types';
import { type RefObject, useEffect, useMemo, useState } from 'react';

/** Below this many columns every column is rendered, as before. */
export const COLUMN_VIRTUALIZATION_THRESHOLD = 30;
const COLUMN_OVERSCAN = 4;

export type ColumnWindow = {
  /** First rendered column index (inclusive). */
  start: number;
  /** Last rendered column index (exclusive). */
  end: number;
  /** Width of the skipped columns before `start` and after `end`. */
  leftPad: number;
  rightPad: number;
};

type Props = {
  columns: ColumnType[];
  columnSizes: Record<string, number>;
  tableContainerRef: RefObject<HTMLDivElement | null>;
  defaultColumnWidth: number;
};

export function useDataGridColumnWindow({
  columns,
  columnSizes,
  tableContainerRef,
  defaultColumnWidth
}: Props): ColumnWindow {
  const enabled = columns.length > COLUMN_VIRTUALIZATION_THRESHOLD;
  const [viewport, setViewport] = useState({ left: 0, width: 0 });

  const offsets = useMemo(() => {
    const result: number[] = [0];
    for (const column of columns) {
      result.push(result[result.length - 1] + (columnSizes[column.name] ?? defaultColumnWidth));
    }
    return result;
  }, [columns, columnSizes, defaultColumnWidth]);

  useEffect(() => {
    const element = tableContainerRef.current;
    if (!enabled || !element) return;

    let frame = 0;
    const read = (): void => {
      frame = 0;
      setViewport((prev) =>
        prev.left === element.scrollLeft && prev.width === element.clientWidth
          ? prev
          : { left: element.scrollLeft, width: element.clientWidth }
      );
    };
    const schedule = (): void => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    read();
    element.addEventListener('scroll', schedule, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(element);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      element.removeEventListener('scroll', schedule);
      observer?.disconnect();
    };
  }, [enabled, tableContainerRef]);

  return useMemo(() => {
    const total = columns.length;
    if (!enabled || viewport.width === 0) return { start: 0, end: total, leftPad: 0, rightPad: 0 };

    let first = 0;
    while (first < total - 1 && offsets[first + 1] <= viewport.left) first++;
    let last = first;
    while (last < total && offsets[last] < viewport.left + viewport.width) last++;

    const start = Math.max(0, first - COLUMN_OVERSCAN);
    const end = Math.min(total, last + COLUMN_OVERSCAN);
    return { start, end, leftPad: offsets[start], rightPad: offsets[total] - offsets[end] };
  }, [columns.length, enabled, offsets, viewport]);
}
