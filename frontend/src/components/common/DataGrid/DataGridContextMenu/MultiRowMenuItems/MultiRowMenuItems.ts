import type { MenuType } from '@/components/base/ContextMenu/types';
import locales from '@/locales';
import { serializeRowsForClipboard } from '../clipboard';
import type { DataGridMenuDeps } from '../menuBuildTypes';

export function buildMultiRowMenuItems(deps: DataGridMenuDeps): MenuType[] {
  const {
    writesBlocked,
    writeReason,
    fetching,
    rowsToCopy,
    columns,
    copyText,
    removeSelectedRows,
    buildSharedGridItems
  } = deps;

  return [
    {
      name: locales.copy,
      children: [
        {
          name: locales.copy_rows_tsv,
          closeAfterAction: true,
          action: (): void => copyText(serializeRowsForClipboard(rowsToCopy, columns, 'tsv'))
        },
        {
          name: locales.copy_rows_csv,
          closeAfterAction: true,
          action: (): void => copyText(serializeRowsForClipboard(rowsToCopy, columns, 'csv'))
        }
      ]
    },
    { name: 'separator', separator: true },
    {
      name: locales.delete_rows,
      closeBeforeAction: true,
      disabled: writesBlocked || fetching,
      disabledReason: writeReason,
      destructive: true,
      action: (): void => {
        void removeSelectedRows();
      }
    },
    { name: 'separator', separator: true },
    ...buildSharedGridItems()
  ];
}