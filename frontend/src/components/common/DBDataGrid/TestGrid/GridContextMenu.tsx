import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import { handleRowChangeLog } from '@/core/utils';
import locales from '@/locales';
import { useTableData } from '@/contexts/TableDataContext';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ContextMenuType } from '@/types';
import type { JSX } from 'react';

export default function GridContextMenu({
  contextMenu,
  onClose
}: {
  contextMenu: ContextMenuType;
  onClose: () => void;
}): JSX.Element {
  const { toggleShowQuickLookEditor } = useSettingStore();
  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const { selectedRows, updateEditedRows, editedRows, updateRow } = useTableData();

  const valueReplacer = (newValue: any): void => {
    if (!selectedTabId) return;

    for (const row of selectedRows) {
      if (!row.row) continue;
      const newRow = { ...row.row };

      const newEditedRows = handleRowChangeLog(
        editedRows,
        row.row,
        row.selectedColumn,
        row.row[row.selectedColumn],
        newValue
      );
      updateEditedRows(newEditedRows).catch(error => {
        console.error('Error updating edited rows:', error);
      });
      newRow[row.selectedColumn] = newValue;
      updateRow(newRow).catch(error => {
        console.error('Error updating row:', error);
      });
    }
  };

  const menu: MenuType[] = [
    {
      name: locales.quick_look_editor,
      action: (): void => {
        toggleShowQuickLookEditor(true);
        onClose();
      }
    },

    {
      name: locales.set_empty,
      action: (): void => {
        valueReplacer('');
        onClose();
      }
    },
    {
      name: locales.set_null,
      action: (): void => {
        valueReplacer(null);
        onClose();
      }
    },
    {
      name: locales.set_default,
      action: (): void => {
        valueReplacer('@DEFAULT');
        onClose();
      }
    }
  ];

  return <ContextMenu menu={menu} contextMenu={contextMenu} onClose={onClose} />;
}
