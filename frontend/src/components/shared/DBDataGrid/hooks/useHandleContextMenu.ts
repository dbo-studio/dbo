import Handsontable from 'handsontable';
// @ts-ignore
import type Core from 'handsontable/core';
import type { Selection, Settings } from 'handsontable/plugins/contextMenu';
import { useSearchParams } from 'react-router-dom';
import ContextMenu = Handsontable.plugins.ContextMenu;

export const useHandleContextMenu = (): Settings => {
  const [searchParams, setSearchParams] = useSearchParams();

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
              callback: (core: Core, key: string, selection: Selection[], clickEvent: MouseEvent): void => {
                console.log('=>(useHandleContextMenu.ts:15) clickEvent', clickEvent);
                console.log('=>(useHandleContextMenu.ts:15) selection', selection);
                console.log('=>(useHandleContextMenu.ts:15) key', key);
                console.log('=>(useHandleContextMenu.ts:15) core', core);
              }
            },
            {
              key: 'set_value:null',
              name: 'Null',
              callback: (core: Core, key: string, selection: Selection[], clickEvent: MouseEvent): void => {
                console.log('=>(useHandleContextMenu.ts:15) clickEvent', clickEvent);
                console.log('=>(useHandleContextMenu.ts:15) selection', selection);
                console.log('=>(useHandleContextMenu.ts:15) key', key);
                console.log('=>(useHandleContextMenu.ts:15) core', core);
              }
            },
            {
              key: 'set_value:default',
              name: 'Default',
              callback: (core: Core, key: string, selection: Selection[], clickEvent: MouseEvent): void => {
                console.log('=>(useHandleContextMenu.ts:15) clickEvent', clickEvent);
                console.log('=>(useHandleContextMenu.ts:15) selection', selection);
                console.log('=>(useHandleContextMenu.ts:15) key', key);
                console.log('=>(useHandleContextMenu.ts:15) core', core);
              }
            }
          ]
        }
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
