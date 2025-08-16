import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import { handleRowChangeLog } from '@/core/utils';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ContextMenuType } from '@/types';
import type { JSX } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';

export default function DataGridContextMenu({
  contextMenu,
  onClose
}: {
  contextMenu: ContextMenuType;
  onClose: () => void;
}): JSX.Element {
  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const selectedRows = useDataStore((state) => state.selectedRows);
  const editedRows = useDataStore((state) => state.editedRows);
  const updateEditedRows = useDataStore((state) => state.updateEditedRows);
  const updateRow = useDataStore((state) => state.updateRow);
  const toggleShowQuickLookEditor = useSettingStore((state) => state.toggleShowQuickLookEditor);
  const toggleReRender = useDataStore((state) => state.toggleReRender);

  const [_, copy] = useCopyToClipboard();

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
      updateEditedRows(newEditedRows).catch((error) => {
        console.error('Error updating edited rows:', error);
      });
      newRow[row.selectedColumn] = newValue;
      updateRow(newRow).catch((error) => {
        console.error('Error updating row:', error);
      });

      toggleReRender();
    }
  };

  const menu: MenuType[] = [
    {
      name: locales.quick_look_editor,
      closeBeforeAction: true,
      action: (): void => {
        toggleShowQuickLookEditor(true);
      }
    },
    {
      name: 'separator',
      separator: true
    },
    {
      name: locales.set_empty,
      closeBeforeAction: true,
      action: (): void => {
        valueReplacer('');
      }
    },
    {
      name: locales.set_null,
      closeBeforeAction: true,
      action: (): void => {
        valueReplacer(null);
      }
    },
    {
      name: locales.set_default,
      closeBeforeAction: true,
      action: (): void => {
        valueReplacer('@DEFAULT');
      }
    },
    {
      name: 'separator',
      separator: true
    },
    {
      name: 'Copy',
      closeAfterAction: true,
      action: async (): Promise<void> => {
        if (!selectedRows.length) return;
        const row = selectedRows[selectedRows.length - 1];
        if (!row || !row.row || !row.selectedColumn) return;

        try {
          await copy(row.row[row.selectedColumn]);
          toast.success(locales.copied);
        } catch (error) {
          console.log('🚀 ~ handleCopy ~ error:', error);
        }
      }
    }
  ];

  return <ContextMenu menu={menu} contextMenu={contextMenu} onClose={onClose} />;
}
