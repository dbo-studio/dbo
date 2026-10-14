import BottomSheet from '@/components/base/BottomSheet/BottomSheet';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import ListRow from '@/components/base/ListRow/ListRow';
import { useConnectionTabs } from '@/hooks';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { IconButton } from '@mui/material';
import type { JSX, MouseEvent } from 'react';
import type { TabSwitcherSheetProps } from './types';
import { tabTitle } from './utils';

/** Open workspace tabs for the current connection, replacing the desktop tab strip. */
export default function TabSwitcherSheet({ onClose }: TabSwitcherSheetProps): JSX.Element {
  const tabs = useConnectionTabs();
  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const switchTab = useTabStore((state) => state.switchTab);
  const removeTab = useTabStore((state) => state.removeTab);

  const handleSelect = (tab: TabType): void => {
    switchTab(tab.id);
    onClose();
  };

  const handleClose = (event: MouseEvent, tab: TabType): void => {
    event.stopPropagation();
    removeTab(tab.id);
    if (tabs.length === 1) {
      onClose();
    }
  };

  return (
    <BottomSheet open onClose={onClose} title={locales.mobile_open_tabs}>
      {tabs.map((tab) => (
        <ListRow
          key={tab.id}
          title={tabTitle(tab)}
          subtitle={tab.mode}
          selected={tab.id === selectedTabId}
          onClick={(): void => handleSelect(tab)}
          trailing={
            <IconButton component='span' aria-label={locales.close} onClick={(event): void => handleClose(event, tab)}>
              <CustomIcon type='close' size='s' />
            </IconButton>
          }
        />
      ))}
    </BottomSheet>
  );
}
