import { handelRowChangeLog } from '@/core/utils';
import { useDataStore } from '@/store/dataStore/data.store.ts';
// @ts-ignore
import type Core from 'handsontable/core';
import { ContextMenu, type Settings } from 'handsontable/plugins/contextMenu';
import { useSearchParams } from 'react-router-dom';

export const useHandleContextMenu = (editable?: boolean): Settings => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { getSelectedRows, updateEditedRows, getEditedRows, updateRow } = useDataStore();

  const valueReplacer = (newValue: any) => {
    const rows = getSelectedRows();
    if (rows.length === 1 && rows[0].selectedCell !== undefined && rows[0].selectedColumn !== undefined) {
      const editedRows = handelRowChangeLog(
        getEditedRows(),
        rows[0].data,
        rows[0].selectedColumn,
        rows[0].selectedCell,
        newValue
      );
      updateEditedRows(editedRows);
      const newRow = { ...rows[0].data };
      newRow[rows[0].selectedColumn] = newValue;
      updateRow(newRow);
      return;
    }

    for (const row of rows) {
      if (!row.data) continue;
      const newRow = { ...row.data };
      for (const key of Object.keys(row.data)) {
        if (key === 'dbo_index') continue;
        const editedRows = handelRowChangeLog(getEditedRows(), row.data, key, row.data[key], newValue);
        updateEditedRows(editedRows);
        newRow[key] = newValue;
        updateRow(newRow);
      }
    }
  };

  // @ts-ignore
  return {
    items: {
      quick_look: {
        name: 'Quick look editor',
        callback: (): void => {
          searchParams.set('quick-look-editor', 'true');
          setSearchParams(searchParams);
        }
      },
      // sp1: ContextMenu.SEPARATOR,
      // add_row: {
      //   name: 'Add row',
      //   callback: () => {}
      // },
      // duplicate_row: {
      //   name: 'Duplicate row',
      //   callback: () => {}
      // },
      sp2: ContextMenu.SEPARATOR,
      set_value: {
        name: 'Set value',
        submenu: {
          items: [
            {
              key: 'set_value:empty',
              name: 'Empty',
              callback: (): void => valueReplacer('')
            },
            {
              key: 'set_value:null',
              name: 'Null',
              callback: (): void => valueReplacer(null)
            },
            {
              key: 'set_value:default',
              name: 'Default',
              callback: (): void => valueReplacer('@DEFAULT')
            }
          ]
        },
        disabled: !editable
      }
      //   sp3: ContextMenu.SEPARATOR,
      //   copy: {
      //     name: 'Copy',
      //     callback: () => {}
      //   },
      //   copy_sell_value: {
      //     name: 'Copy sell value',
      //     callback: () => {}
      //   },
      //   copy_row_as: {
      //     name: 'Copy row as',
      //     callback: () => {}
      //   },
      //   sp4: ContextMenu.SEPARATOR,
      //   quick_filter: {
      //     name: 'Quick filter',
      //     callback: () => {}
      //   },
      //   sp5: ContextMenu.SEPARATOR,
      //   delete: {
      //     name: 'Delete',
      //     callback: () => {}
      //   }
    }
  };
};
