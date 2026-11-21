import type { MenuType } from '@/components/base/ContextMenu/types';
import { useDataGridRowActions } from '@/components/common/DataGrid/hooks/useDataGridRowActions';
import { PgsqlFilterNext } from '@/core/constants';
import { constants } from '@/core/constants/appDetails';
import { handleRowChangeLog, tools } from '@/core/utils';
import { useCurrentConnection, useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { DataTabType, FilterType, TabType } from '@/types';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import { applyCells } from '../gridCellActions';
import { isMultiCellRange, normalizeRange, rangeColumnNames } from '../cellRange';
import { serializeCellsForClipboard } from './clipboard';
import { buildCellRangeMenuItems } from './CellRangeMenuItems/CellRangeMenuItems';
import { NO_COLUMNS, filterOperator, writeDisabledReason } from './contextMenuUtils';
import { buildHeaderMenuItems } from './HeaderMenuItems/HeaderMenuItems';
import type { DataGridMenuDeps } from './menuBuildTypes';
import { buildMultiRowMenuItems } from './MultiRowMenuItems/MultiRowMenuItems';
import { buildSharedGridMenuItems } from './SharedGridMenuItems/SharedGridMenuItems';
import { buildSingleCellMenuItems } from './SingleCellMenuItems/SingleCellMenuItems';
import type { DataGridContextTarget } from './types';

export function useDataGridContextMenu(target: DataGridContextTarget | null): MenuType[] {
  const selectedTab = useSelectedTab<DataTabType>();
  const currentConnection = useCurrentConnection();
  const selectedRows = useDataStore((state) => state.selectedRows);
  const cellRange = useDataStore((state) => state.cellRange);
  const editedRows = useDataStore((state) => state.editedRows);
  const columns = useDataStore((state) => state.columns ?? NO_COLUMNS);
  const updateEditedRows = useDataStore((state) => state.updateEditedRows);
  const updateRow = useDataStore((state) => state.updateRow);
  const updateColumns = useDataStore((state) => state.updateColumns);
  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);
  const isDataFetching = useDataStore((state) => state.isDataFetching);

  const updateUI = useSettingStore((state) => state.updateUI);
  const updateSorts = useTabStore((state) => state.updateSorts);
  const updateTabColumns = useTabStore((state) => state.updateColumns);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);

  const {
    canEditGrid,
    addRow,
    duplicateRow,
    removeSelectedRows,
    refreshOrStop,
    isDataFetching: fetching
  } = useDataGridRowActions();

  const [, copy] = useCopyToClipboard();

  const safeModeBlocks =
    (currentConnection?.safeMode === 'safe' || currentConnection?.safeMode === 'safe_write') &&
    !currentConnection?.safeModeUnlocked;

  const writesBlocked = !canEditGrid || safeModeBlocks;
  const writeReason = writeDisabledReason(canEditGrid, safeModeBlocks);

  const focusedSelection = selectedRows[selectedRows.length - 1];
  const focusedColumnName =
    target?.type === 'cell'
      ? target.columnName
      : target?.type === 'header'
        ? target.columnName
        : focusedSelection?.selectedColumn;
  const focusedRow = focusedSelection?.row;
  const rowsToCopy =
    selectedRows.length > 0 ? selectedRows.map((s) => s.row) : focusedRow ? [focusedRow] : [];
  const focusedColumn = columns.find((c) => c.name === focusedColumnName);

  const resetPaginationIfNeeded = (): void => {
    if ((selectedTab?.pagination?.page ?? 0) <= 1) return;
    const pagination = { ...(selectedTab?.pagination ?? { page: 1, limit: 100 }), page: 1 };
    updateSelectedTab({
      ...(selectedTab ?? ({} as TabType)),
      pagination
    });
  };

  const copyText = (text: string): void => {
    void copy(text).then(() => toast.success(locales.copied));
  };

  const valueReplacer = (newValue: string | null | undefined): void => {
    if (!selectedTab?.id) return;

    const selectedColumn = focusedColumnName;
    const column = columns.find((item) => item.name === selectedColumn);
    if (!selectedColumn || column?.editable === false) {
      return;
    }

    let nextEditedRows = editedRows;
    for (const row of selectedRows) {
      if (!row.row || !row.selectedColumn) continue;
      const col = columns.find((item) => item.name === row.selectedColumn);
      if (col?.editable === false) continue;

      const newRow = { ...row.row };
      nextEditedRows = handleRowChangeLog(
        nextEditedRows,
        row.row,
        row.selectedColumn,
        row.row[row.selectedColumn],
        newValue,
        columns
      );
      newRow[row.selectedColumn] = newValue;
      updateRow(newRow).catch((error) => {
        console.error('Error updating row:', error);
      });
    }
    updateEditedRows(nextEditedRows).catch((error) => {
      console.error('Error updating edited rows:', error);
    });
  };

  const rangeReplacer = (newValue: string | null): void => {
    if (!isMultiCellRange(cellRange) || !selectedTab?.id) return;
    const { r1, r2 } = normalizeRange(cellRange);
    applyCells(useDataStore.getState(), r1, r2, rangeColumnNames(cellRange), () => newValue);
  };

  const rangeText = (format: 'tsv' | 'csv'): string => {
    if (!isMultiCellRange(cellRange)) return '';
    const allRows = useDataStore.getState().rows ?? [];
    const { r1, r2 } = normalizeRange(cellRange);
    return serializeCellsForClipboard(allRows.slice(r1, r2 + 1), rangeColumnNames(cellRange), format);
  };

  const applyFilter = (operator: string, value: string): void => {
    if (!focusedColumnName || !selectedTab) return;

    const filter: FilterType = {
      index: tools.uuid(),
      column: focusedColumnName,
      operator: filterOperator(operator),
      value,
      isActive: true,
      next: PgsqlFilterNext[0]
    };

    const pagination =
      (selectedTab.pagination?.page ?? 0) > 1
        ? { ...(selectedTab.pagination ?? { page: 1, limit: 100 }), page: 1 }
        : selectedTab.pagination;

    updateSelectedTab({
      ...selectedTab,
      filters: [filter],
      showFilters: true,
      showSorts: false,
      showQuery: false,
      pagination
    });
    toggleReRunQuery();
  };

  const applySort = (operator: string): void => {
    if (!focusedColumnName) return;
    updateSorts([
      {
        index: tools.uuid(),
        column: focusedColumnName,
        operator,
        isActive: true
      }
    ]);
    resetPaginationIfNeeded();
    toggleReRunQuery();
  };

  const hideColumn = async (): Promise<void> => {
    if (!focusedColumnName || isDataFetching) return;
    const column = columns.find((c) => c.name === focusedColumnName);
    if (!column || column.name === 'select') return;

    const newColumns = columns.map((c) => (c.name === focusedColumnName ? { ...c, isActive: false } : c));
    await updateColumns(newColumns);
    updateTabColumns(newColumns.filter((c) => c.isActive).map((c) => c.name));
    toggleReRunQuery();
  };

  const openFields = (): void => {
    const sidebar = useSettingStore.getState().ui.sidebar;
    updateUI({
      sidebar: {
        ...sidebar,
        showRight: true,
        rightSidebarTab: 1,
        rightWidth: sidebar.rightWidth || constants.defaultSidebarWidth
      }
    });
  };

  const buildSharedGridItems = (): MenuType[] =>
    buildSharedGridMenuItems({
      writesBlocked,
      writeReason,
      fetching,
      addRow,
      refreshOrStop
    });

  const menuDeps: DataGridMenuDeps = {
    writesBlocked,
    writeReason,
    fetching,
    isDataFetching,
    focusedColumnName,
    focusedRow,
    focusedColumn,
    rowsToCopy,
    columns,
    copyText,
    applySort,
    applyFilter,
    hideColumn: (): void => {
      void hideColumn();
    },
    openFields,
    valueReplacer,
    rangeReplacer,
    rangeText,
    addRow,
    duplicateRow,
    removeSelectedRows,
    refreshOrStop,
    showQuickLookEditor: (): void => {
      updateUI({ showQuickLookEditor: true });
    },
    buildSharedGridItems
  };

  if (target?.type === 'empty') {
    return buildSharedGridItems();
  }
  if (target?.type === 'header') {
    return buildHeaderMenuItems(menuDeps);
  }
  if (target?.type === 'cell' && isMultiCellRange(cellRange)) {
    return buildCellRangeMenuItems(menuDeps);
  }
  if (target?.type === 'cell' && selectedRows.length > 1) {
    return buildMultiRowMenuItems(menuDeps);
  }
  if (target?.type === 'cell') {
    return buildSingleCellMenuItems(menuDeps);
  }

  return [];
}