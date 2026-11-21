import type { MenuType } from '@/components/base/ContextMenu/types';
import locales from '@/locales';
import type { DataGridMenuDeps } from '../menuBuildTypes';

export function buildCellRangeMenuItems(deps: DataGridMenuDeps): MenuType[] {
  const { writesBlocked, writeReason, copyText, rangeText, rangeReplacer, buildSharedGridItems } = deps;

  return [
    {
      name: locales.copy,
      children: [
        {
          name: locales.copy_cells_tsv,
          closeAfterAction: true,
          action: (): void => copyText(rangeText('tsv'))
        },
        {
          name: locales.copy_cells_csv,
          closeAfterAction: true,
          action: (): void => copyText(rangeText('csv'))
        }
      ]
    },
    { name: 'separator', separator: true },
    {
      name: locales.set_empty,
      closeBeforeAction: true,
      disabled: writesBlocked,
      disabledReason: writeReason,
      action: (): void => rangeReplacer('')
    },
    {
      name: locales.set_null,
      closeBeforeAction: true,
      disabled: writesBlocked,
      disabledReason: writeReason,
      action: (): void => rangeReplacer(null)
    },
    {
      name: locales.set_default,
      closeBeforeAction: true,
      disabled: writesBlocked,
      disabledReason: writeReason,
      action: (): void => rangeReplacer('@DEFAULT')
    },
    { name: 'separator', separator: true },
    ...buildSharedGridItems()
  ];
}
