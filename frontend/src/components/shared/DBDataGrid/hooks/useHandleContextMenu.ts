import Handsontable from 'handsontable';
import type { Settings } from 'handsontable/plugins/contextMenu';
import ContextMenu = Handsontable.plugins.ContextMenu;

export const useHandleContextMenu = (): Settings => {
  // const { setSelectedRows } = useDataStore();

  return {
    items: {
      quick_look: {
        name: 'Quick look editor',
        callback: () => {}
      },
      sp1: ContextMenu.SEPARATOR,
      add_row: {
        name: 'Add row',
        callback: () => {}
      },
      duplicate_row: {
        name: 'Duplicate row',
        callback: () => {}
      },
      sp2: ContextMenu.SEPARATOR,
      set_value: {
        name: 'Set value',
        submenu: {
          items: [
            {
              key: 'set_value:empty',
              name: 'Empty',
              callback: () => {}
            },
            {
              key: 'set_value:null',
              name: 'Null',
              callback: () => {}
            },
            {
              key: 'set_value:default',
              name: 'Default',
              callback: () => {}
            }
          ]
        }
      },
      sp3: ContextMenu.SEPARATOR,
      copy: {
        name: 'Copy',
        callback: () => {}
      },
      copy_sell_value: {
        name: 'Copy sell value',
        callback: () => {}
      },
      copy_row_as: {
        name: 'Copy row as',
        callback: () => {}
      },
      sp4: ContextMenu.SEPARATOR,
      quick_filter: {
        name: 'Quick filter',
        callback: () => {}
      },
      sp5: ContextMenu.SEPARATOR,
      delete: {
        name: 'Delete',
        callback: () => {}
      }
    }
  };
};
