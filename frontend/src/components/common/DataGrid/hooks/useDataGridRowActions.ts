import { TabMode } from '@/core/enums';
import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { createEmptyRow } from '@/core/utils';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useDataStore } from '@/store/dataStore/data.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { DataTabType, RowType } from '@/types';
import { useCallback } from 'react';

export type DataGridRowActions = {
  canEditGrid: boolean;
  isDataFetching: boolean;
  addRow: () => Promise<void>;
  duplicateRow: (sourceRow?: RowType) => Promise<void>;
  removeSelectedRows: () => Promise<void>;
  discardChanges: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshOrStop: () => void;
};

/**
 * Shared add / duplicate / remove / refresh used by StatusBar and grid context menus.
 */
export function useDataGridRowActions(): DataGridRowActions {
  const selectedTab = useSelectedTab();
  const isDataFetching = useDataStore((state) => state.isDataFetching);
  const gridEditable = useDataStore((state) => state.gridEditable);
  const updatableNodeId = useDataStore((state) => state.updatableNodeId);

  const updateEditor = useSettingStore((state) => state.updateEditor);
  const addUnsavedRows = useDataStore((state) => state.addUnsavedRows);
  const updateSelectedRows = useDataStore((state) => state.updateSelectedRows);
  const updateRows = useDataStore((state) => state.updateRows);
  const updateRemovedRows = useDataStore((state) => state.updateRemovedRows);
  const restoreEditedRows = useDataStore((state) => state.restoreEditedRows);
  const updateUnsavedRows = useDataStore((state) => state.updateUnsavedRows);
  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);
  const runRawQuery = useDataStore((state) => state.runRawQuery);
  const cancelRunningQuery = useDataStore((state) => state.cancelRunningQuery);

  const canEditGrid =
    selectedTab?.mode === TabMode.Data
      ? (selectedTab as DataTabType).editable
      : selectedTab?.mode === TabMode.Query && gridEditable && !!updatableNodeId;

  const discardChanges = useCallback(async (): Promise<void> => {
    if (!canEditGrid || !selectedTab) {
      return;
    }

    const rows = await indexedDBService.getRows(selectedTab.id);
    const unsavedRows = await indexedDBService.getUnsavedRows(selectedTab.id);

    await updateUnsavedRows([]);

    if (unsavedRows.length > 0) {
      const unsavedIndexes = new Set(unsavedRows.map((row) => row.dbo_index));
      const updatedRows = rows && rows.length > 0 ? rows.filter((row) => !unsavedIndexes.has(row.dbo_index)) : [];
      await updateRows(updatedRows);
    }

    await Promise.all([updateRemovedRows([]), restoreEditedRows()]);

    updateSelectedRows([], true);
  }, [
    canEditGrid,
    selectedTab,
    updateUnsavedRows,
    updateRows,
    updateRemovedRows,
    restoreEditedRows,
    updateSelectedRows
  ]);

  const addRow = useCallback(async (): Promise<void> => {
    if (!canEditGrid || !selectedTab) {
      return;
    }

    const columns = await indexedDBService.getColumns(selectedTab.id);
    const rows = await indexedDBService.getRows(selectedTab.id);
    const activeColumns = (columns ?? []).filter((column) => column.isActive !== false);
    const canInsertRows =
      selectedTab.mode !== TabMode.Query || activeColumns.every((column) => column.editable !== false);

    if (!canInsertRows) {
      return;
    }

    const emptyRow = createEmptyRow(activeColumns);
    emptyRow.dbo_index = rows.length === 0 ? 0 : rows[rows.length - 1].dbo_index + 1;

    rows.push(emptyRow);

    await updateRows(rows);
    addUnsavedRows(emptyRow);

    updateEditor({ scrollToBottom: true });
  }, [canEditGrid, selectedTab, updateRows, addUnsavedRows, updateEditor]);

  const duplicateRow = useCallback(
    async (sourceRow?: RowType): Promise<void> => {
      if (!canEditGrid || !selectedTab || !sourceRow) {
        return;
      }

      const columns = await indexedDBService.getColumns(selectedTab.id);
      const rows = await indexedDBService.getRows(selectedTab.id);
      const activeColumns = (columns ?? []).filter((column) => column.isActive !== false);
      const canInsertRows =
        selectedTab.mode !== TabMode.Query || activeColumns.every((column) => column.editable !== false);

      if (!canInsertRows) {
        return;
      }

      const cloned: RowType = { dbo_index: 0 };
      for (const column of activeColumns) {
        cloned[column.name] = sourceRow[column.name];
      }
      cloned.dbo_index = rows.length === 0 ? 0 : rows[rows.length - 1].dbo_index + 1;

      rows.push(cloned);
      await updateRows(rows);
      addUnsavedRows(cloned);
      updateEditor({ scrollToBottom: true });
    },
    [canEditGrid, selectedTab, updateRows, addUnsavedRows, updateEditor]
  );

  const removeSelectedRows = useCallback(async (): Promise<void> => {
    if (!canEditGrid) {
      return;
    }

    await updateRemovedRows(undefined);
  }, [canEditGrid, updateRemovedRows]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!selectedTab) {
      return;
    }

    if (selectedTab.mode === TabMode.Query) {
      await discardChanges();
      await runRawQuery();
      return;
    }

    await discardChanges();
    toggleReRunQuery();
  }, [selectedTab, discardChanges, runRawQuery, toggleReRunQuery]);

  const refreshOrStop = useCallback((): void => {
    if (isDataFetching) {
      cancelRunningQuery();
      return;
    }
    void refresh();
  }, [isDataFetching, cancelRunningQuery, refresh]);

  return {
    canEditGrid: Boolean(canEditGrid),
    isDataFetching,
    addRow,
    duplicateRow,
    removeSelectedRows,
    discardChanges,
    refresh,
    refreshOrStop
  };
}
