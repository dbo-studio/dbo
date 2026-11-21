import type { MenuType } from '@/components/base/ContextMenu/types';
import locales from '@/locales';

type SharedGridArgs = {
  writesBlocked: boolean;
  writeReason: string | undefined;
  fetching: boolean;
  addRow: () => Promise<void>;
  refreshOrStop: () => void;
};

export function buildSharedGridMenuItems({
  writesBlocked,
  writeReason,
  fetching,
  addRow,
  refreshOrStop
}: SharedGridArgs): MenuType[] {
  return [
    {
      name: locales.add_row,
      closeBeforeAction: true,
      disabled: writesBlocked || fetching,
      disabledReason: writeReason,
      action: (): void => {
        void addRow();
      }
    },
    {
      name: fetching ? locales.stop_query : locales.refresh,
      closeBeforeAction: true,
      action: (): void => {
        refreshOrStop();
      }
    }
  ];
}
