import { useDataStore } from '@/store/dataStore/data.store';
import { isMultiCellRange, normalizeRange } from '../cellRange';
import { useMemo } from 'react';

export function useRowStateLookup() {
  const editedRows = useDataStore((state) => state.editedRows);
  const removedRows = useDataStore((state) => state.removedRows);
  const unsavedRows = useDataStore((state) => state.unSavedRows);
  const selectedRows = useDataStore((state) => state.selectedRows);
  const cellRange = useDataStore((state) => state.cellRange);

  const range = useMemo(() => (isMultiCellRange(cellRange) ? normalizeRange(cellRange) : null), [cellRange]);

  const removedRowsSet = useMemo(() => {
    const set = new Set<number>();
    for (const row of removedRows) {
      set.add(row.dbo_index);
    }
    return set;
  }, [removedRows]);

  const unsavedRowsSet = useMemo(() => {
    const set = new Set<number>();
    for (const row of unsavedRows) {
      set.add(row.dbo_index);
    }
    return set;
  }, [unsavedRows]);

  const editedRowsSet = useMemo(() => {
    const set = new Set<number>();
    for (const row of editedRows) {
      set.add(row.dboIndex);
    }
    return set;
  }, [editedRows]);

  const selectedRowsMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const row of selectedRows) {
      map.set(row.index, row.selectedColumn);
    }
    return map;
  }, [selectedRows]);

  const getRowState = useMemo(
    () => (dboIndex: number, rowIndex: number) => ({
      isRemoved: removedRowsSet.has(dboIndex),
      isUnsaved: unsavedRowsSet.has(dboIndex),
      isEdited: editedRowsSet.has(dboIndex),
      isSelected: selectedRowsMap.has(rowIndex),
      selectedColumn: selectedRowsMap.get(rowIndex) ?? '',
      // Only rows inside the range get range props, so a drag re-renders just those rows.
      rangeStart: range && rowIndex >= range.r1 && rowIndex <= range.r2 ? range.c1 : -1,
      rangeEnd: range && rowIndex >= range.r1 && rowIndex <= range.r2 ? range.c2 : -1,
      rangeEdges: range ? (rowIndex === range.r1 ? 1 : 0) | (rowIndex === range.r2 ? 2 : 0) : 0
    }),
    [removedRowsSet, unsavedRowsSet, editedRowsSet, selectedRowsMap, range]
  );

  return {
    getRowState,
    removedRowsSet,
    unsavedRowsSet,
    editedRowsSet,
    selectedRowsMap
  };
}
