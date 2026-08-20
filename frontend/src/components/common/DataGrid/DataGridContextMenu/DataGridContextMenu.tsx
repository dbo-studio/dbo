import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import { useDataGridRowActions } from '@/components/common/DataGrid/hooks/useDataGridRowActions';
import { PgsqlFilterNext, PgsqlSorts } from '@/core/constants';
import { constants } from '@/core/constants/appDetails';
import { handleRowChangeLog, tools } from '@/core/utils';
import { useCurrentConnection, useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ContextMenuType, DataTabType, FilterType, RowType, TabType } from '@/types';
import type { JSX } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import { cellValueForFilter, serializeRowForClipboard } from './clipboard';
import type { DataGridContextTarget } from './types';

type Props = {
  contextMenu: ContextMenuType;
  onClose: () => void;
  target: DataGridContextTarget | null;
};

function writeDisabledReason(canEdit: boolean, safeModeBlocks: boolean): string | undefined {
  if (!canEdit) {
    return locales.grid_menu_read_only;
  }
  if (safeModeBlocks) {
    return locales.grid_menu_safe_mode;
  }
  return undefined;
}

export default function DataGridContextMenu({ contextMenu, onClose, target }: Props): JSX.Element {
  const selectedTab = useSelectedTab<DataTabType>();
  const currentConnection = useCurrentConnection();
  const selectedRows = useDataStore((state) => state.selectedRows);
  const editedRows = useDataStore((state) => state.editedRows);
  const columns = useDataStore((state) => state.columns ?? []);
  const updateEditedRows = useDataStore((state) => state.updateEditedRows);
  const updateRow = useDataStore((state) => state.updateRow);
  const updateColumns = useDataStore((state) => state.updateColumns);
  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);
  const isDataFetching = useDataStore((state) => state.isDataFetching);

  const updateUI = useSettingStore((state) => state.updateUI);
  const upsertFilters = useTabStore((state) => state.upsertFilters);
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
  const focusedRow: RowType | undefined = focusedSelection?.row;
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

  const applyFilter = (operator: string, value: string): void => {
    if (!focusedColumnName) return;

    const filter: FilterType = {
      index: tools.uuid(),
      column: focusedColumnName,
      operator,
      value,
      isActive: true,
      next: PgsqlFilterNext[0]
    };
    upsertFilters(filter);
    resetPaginationIfNeeded();
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
    updateTabColumns(newColumns.filter((c) => c.isActive !== false).map((c) => c.name));
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

  const sharedGridItems = (): MenuType[] => [
    {
      name: locales.add_row,
      closeBeforeAction: true,
      disabled: writesBlocked || fetching,
      disabledReason: writeReason,
      action: (): void => {
        void addRow();
      }
    },
    {
      name: fetching ? locales.stop_query : locales.refresh,
      closeBeforeAction: true,
      action: (): void => {
        refreshOrStop();
      }
    }
  ];

  let menu: MenuType[] = [];

  if (target?.type === 'empty') {
    menu = sharedGridItems();
  } else if (target?.type === 'header') {
    menu = [
      {
        name: locales.sort_asc,
        closeBeforeAction: true,
        action: (): void => applySort(PgsqlSorts[0])
      },
      {
        name: locales.sort_desc,
        closeBeforeAction: true,
        action: (): void => applySort(PgsqlSorts[1])
      },
      { name: 'separator', separator: true },
      {
        name: locales.copy_column_name,
        closeAfterAction: true,
        action: (): void => {
          if (focusedColumnName) copyText(focusedColumnName);
        }
      },
      {
        name: locales.hide_column,
        closeBeforeAction: true,
        disabled: isDataFetching,
        action: (): void => {
          void hideColumn();
        }
      }
    ];
  } else if (target?.type === 'cell') {
    const columnEditable = focusedColumn?.editable !== false;
    const cellWriteReason = !columnEditable ? locales.grid_menu_column_not_editable : writeReason;
    const cellWritesBlocked = writesBlocked || !columnEditable;
    const cellValue = focusedRow && focusedColumnName ? focusedRow[focusedColumnName] : undefined;

    menu = [
      {
        name: locales.open_fields,
        closeBeforeAction: true,
        action: openFields
      },
      {
        name: locales.quick_look_editor,
        closeBeforeAction: true,
        action: (): void => {
          updateUI({ showQuickLookEditor: true });
        }
      },
      { name: 'separator', separator: true },
      {
        name: locales.copy,
        children: [
          {
            name: locales.copy_cell,
            closeAfterAction: true,
            action: (): void => {
              if (focusedRow && focusedColumnName) {
                copyText(cellValueForFilter(focusedRow[focusedColumnName]));
              }
            }
          },
          {
            name: locales.copy_row_tsv,
            closeAfterAction: true,
            action: (): void => {
              if (focusedRow) {
                copyText(serializeRowForClipboard(focusedRow, columns, 'tsv'));
              }
            }
          },
          {
            name: locales.copy_row_csv,
            closeAfterAction: true,
            action: (): void => {
              if (focusedRow) {
                copyText(serializeRowForClipboard(focusedRow, columns, 'csv'));
              }
            }
          },
          {
            name: locales.copy_column_name,
            closeAfterAction: true,
            action: (): void => {
              if (focusedColumnName) copyText(focusedColumnName);
            }
          }
        ]
      },
      { name: 'separator', separator: true },
      {
        name: locales.set_empty,
        closeBeforeAction: true,
        disabled: cellWritesBlocked,
        disabledReason: cellWriteReason,
        action: (): void => valueReplacer('')
      },
      {
        name: locales.set_null,
        closeBeforeAction: true,
        disabled: cellWritesBlocked,
        disabledReason: cellWriteReason,
        action: (): void => valueReplacer(null)
      },
      {
        name: locales.set_default,
        closeBeforeAction: true,
        disabled: cellWritesBlocked,
        disabledReason: cellWriteReason,
        action: (): void => valueReplacer('@DEFAULT')
      },
      { name: 'separator', separator: true },
      {
        name: locales.duplicate_row,
        closeBeforeAction: true,
        disabled: writesBlocked || fetching,
        disabledReason: writeReason,
        action: (): void => {
          void duplicateRow(focusedRow);
        }
      },
      {
        name: locales.delete_row,
        closeBeforeAction: true,
        disabled: writesBlocked || fetching,
        disabledReason: writeReason,
        destructive: true,
        action: (): void => {
          void removeSelectedRows();
        }
      },
      { name: 'separator', separator: true },
      {
        name: locales.filter,
        children: [
          {
            name: locales.filter_equals,
            closeBeforeAction: true,
            action: (): void => applyFilter('=', cellValueForFilter(cellValue))
          },
          {
            name: locales.filter_not_equals,
            closeBeforeAction: true,
            action: (): void => applyFilter('!=', cellValueForFilter(cellValue))
          },
          {
            name: locales.filter_is_null,
            closeBeforeAction: true,
            action: (): void => applyFilter('IS NULL', '')
          }
        ]
      },
      {
        name: locales.sort_asc,
        closeBeforeAction: true,
        action: (): void => applySort(PgsqlSorts[0])
      },
      {
        name: locales.sort_desc,
        closeBeforeAction: true,
        action: (): void => applySort(PgsqlSorts[1])
      },
      { name: 'separator', separator: true },
      ...sharedGridItems()
    ];
  }

  return <ContextMenu menu={menu} contextMenu={contextMenu} onClose={onClose} />;
}
