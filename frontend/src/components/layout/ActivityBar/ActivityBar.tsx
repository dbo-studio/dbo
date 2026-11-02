import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import ConnectionsHost from '@/components/common/Connections/ConnectionsHost';
import locales from '@/locales';
import { type ExplorerArea, useExplorerAreaStore } from '@/store/explorerArea/explorerArea.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Tooltip } from '@mui/material';
import type { JSX } from 'react';
import { ActivityBarStyled, ActivityItemStyled } from './ActivityBar.styled';

const AREAS: { id: ExplorerArea; label: string; icon: keyof typeof IconTypes; testId: string }[] = [
  { id: 'explorer', label: locales.rail_explorer, icon: 'layoutList', testId: 'activity-explorer' },
  { id: 'boards', label: locales.boards, icon: 'layout', testId: 'sidebar-tab-boards' },
  { id: 'backup', label: locales.rail_backup, icon: 'backup', testId: 'activity-backup' }
];

/**
 * Areas of the app, icons only. Every area is a list in the left sidebar with its detail in the
 * centre; a new feature gets an entry here instead of a header icon. The connection is not an
 * area: it is the scope of the explorer and is chosen in the sidebar (ConnectionSwitcher).
 */
export default function ActivityBar(): JSX.Element {
  const area = useExplorerAreaStore((s) => s.area);
  const setArea = useExplorerAreaStore((s) => s.setArea);
  const showLeft = useSettingStore((s) => s.ui.sidebar.showLeft);
  const updateUI = useSettingStore((s) => s.updateUI);

  const select = (next: ExplorerArea): void => {
    const sidebar = useSettingStore.getState().ui.sidebar;
    // Picking the area that is already open folds the sidebar, like the toggle in the header.
    if (sidebar.showLeft && area === next) {
      updateUI({ sidebar: { ...sidebar, showLeft: false } });
      return;
    }
    setArea(next);
    if (!sidebar.showLeft) updateUI({ sidebar: { ...sidebar, showLeft: true } });
  };

  return (
    <ActivityBarStyled role='navigation' aria-label={locales.rail_areas}>
      <ConnectionsHost />
      {AREAS.map((a) => {
        const selected = showLeft && area === a.id;

        return (
          <Tooltip key={a.id} title={a.label} placement='right'>
            <ActivityItemStyled
              selected={selected}
              aria-label={a.label}
              aria-pressed={selected}
              data-testid={a.testId}
              onClick={() => select(a.id)}
            >
              <CustomIcon type={a.icon} size='m' />
            </ActivityItemStyled>
          </Tooltip>
        );
      })}
    </ActivityBarStyled>
  );
}
