import { handleRowChangeLog } from '@/core/utils';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useSettingStore } from '@/store/settingStore/setting.store';
// @ts-ignore
import { ContextMenu, type Settings } from 'handsontable/plugins/contextMenu';

export const useHandleContextMenu = (editable?: boolean): Settings => {
  const selectedTab = useSelectedTab();
  const { getSelectedRows, updateEditedRows, getEditedRows, updateRow, toggleDataFetching } = useDataStore();
  const { toggleShowQuickLookEditor } = useSettingStore();

  const valueReplacer = (newValue: any): void => {
    if (!selectedTab) return;

    const rows = getSelectedRows();
    for (const row of rows) {
      if (!row.data) continue;
      const newRow = { ...row.data };

      for (const column of row.selectedColumns) {
        const editedRows = handleRowChangeLog(getEditedRows(), row.data, column, row.data[column], newValue);
        updateEditedRows(editedRows);
        newRow[column] = newValue;
        updateRow(newRow);
        toggleDataFetching();
      }
    }
  };

  // @ts-ignore
  return {
    items: {
      quick_look: {
        name: 'Quick look editor',
        callback: (): void => {
          toggleShowQuickLookEditor(true);
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
