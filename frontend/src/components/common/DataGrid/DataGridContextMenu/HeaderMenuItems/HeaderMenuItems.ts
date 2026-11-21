import type { MenuType } from '@/components/base/ContextMenu/types';
import { PgsqlSorts } from '@/core/constants';
import locales from '@/locales';
import type { DataGridMenuDeps } from '../menuBuildTypes';

export function buildHeaderMenuItems(deps: DataGridMenuDeps): MenuType[] {
  const { focusedColumnName, isDataFetching, copyText, applySort, hideColumn } = deps;

  return [
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
}