import { useDataStore } from '@/store/dataStore/data.store';
import { useMemo } from 'react';


export function useRowStateLookup() {
    const editedRows = useDataStore((state) => state.editedRows);
    const removedRows = useDataStore((state) => state.removedRows);
    const unsavedRows = useDataStore((state) => state.unSavedRows);
    const selectedRows = useDataStore((state) => state.selectedRows);

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

    // Use Map for selected rows to allow column lookup
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
            selectedColumn: selectedRowsMap.get(rowIndex) ?? ''
        }),
        [removedRowsSet, unsavedRowsSet, editedRowsSet, selectedRowsMap]
    );

    return {
        getRowState,
        removedRowsSet,
        unsavedRowsSet,
        editedRowsSet,
        selectedRowsMap
    };
}

