import type { MenuType } from '@/components/base/ContextMenu/types';
import { PgsqlSorts } from '@/core/constants';
import locales from '@/locales';
import { cellValueForFilter, serializeRowsForClipboard } from '../clipboard';
import { filterOperator } from '../contextMenuUtils';
import type { DataGridMenuDeps } from '../menuBuildTypes';

export function buildSingleCellMenuItems(deps: DataGridMenuDeps): MenuType[] {
  const {
    writesBlocked,
    writeReason,
    fetching,
    focusedColumnName,
    focusedRow,
    focusedColumn,
    rowsToCopy,
    columns,
    copyText,
    openFields,
    showQuickLookEditor,
    valueReplacer,
    duplicateRow,
    removeSelectedRows,
    applyFilter,
    applySort,
    buildSharedGridItems
  } = deps;

  const columnEditable = focusedColumn?.editable !== false;
  const cellWriteReason = !columnEditable ? locales.grid_menu_column_not_editable : writeReason;
  const cellWritesBlocked = writesBlocked || !columnEditable;
  const cellValue = focusedRow && focusedColumnName ? focusedRow[focusedColumnName] : undefined;

  return [
    {
      name: locales.quick_look_editor,
      closeBeforeAction: true,
      action: showQuickLookEditor
    },
    {
      name: locales.open_fields,
      closeBeforeAction: true,
      action: openFields
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
            if (rowsToCopy.length > 0) {
              copyText(serializeRowsForClipboard(rowsToCopy, columns, 'tsv'));
            }
          }
        },
        {
          name: locales.copy_row_csv,
          closeAfterAction: true,
          action: (): void => {
            if (rowsToCopy.length > 0) {
              copyText(serializeRowsForClipboard(rowsToCopy, columns, 'csv'));
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
          action: (): void => applyFilter(filterOperator('='), cellValueForFilter(cellValue))
        },
        {
          name: locales.filter_not_equals,
          closeBeforeAction: true,
          action: (): void => applyFilter(filterOperator('!='), cellValueForFilter(cellValue))
        },
        {
          name: locales.filter_is_null,
          closeBeforeAction: true,
          action: (): void => applyFilter(filterOperator('IS NULL'), '')
        },
        {
          name: locales.filter_is_not_null,
          closeBeforeAction: true,
          action: (): void => applyFilter(filterOperator('IS NOT NULL'), '')
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
    ...buildSharedGridItems()
  ];
}