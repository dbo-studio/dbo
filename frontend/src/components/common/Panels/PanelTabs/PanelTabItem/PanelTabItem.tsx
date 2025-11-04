import ContextMenu from '@/components/base/ContextMenu/ContextMenu.tsx';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import { PanelTabItemStyled } from '@/components/common/Panels/PanelTabs/PanelTabItem/PanelTabItem.styled.ts';
import { shortcuts } from '@/core/utils';
import { useContextMenu, useShortcut } from '@/hooks';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { TabType } from '@/types';
import { Box, Tooltip, Typography } from '@mui/material';
import type { JSX } from 'react';
import { memo, useCallback, useEffect, useRef } from 'react';
import { usePanelTabMenu } from '../../hooks/usePanelTabMenu';
import { useRemoveTab } from '../../hooks/useRemoveTab';
import { useSwitchTab } from '../../hooks/useSwitchTab';

const PanelTabItem: React.FC<{ tab: TabType }> = memo(({ tab }): JSX.Element => {
  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const tabRefs = useRef<Record<string, HTMLElement>>({});

  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();
  const { handleSwitchTab } = useSwitchTab();
  const { handleRemoveTab } = useRemoveTab();

  const menu = usePanelTabMenu(tab);

  useEffect(() => {
    const tabId = selectedTabId;
    if (tabId && tabRefs.current?.[tabId]) {
      tabRefs.current[tabId].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [selectedTabId]);

  const handleTabClick = useCallback((): void => {
    handleSwitchTab(tab.id);
  }, [handleSwitchTab, tab.id]);

  const handleCloseClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>): void => {
      e.stopPropagation();
      handleRemoveTab(tab.id);
    },
    [handleRemoveTab, tab.id]
  );

  useShortcut(shortcuts.closeTab, () => handleRemoveTab(selectedTabId ?? ''));

  return (
    <Box
      onContextMenu={handleContextMenu}
      ref={(el: HTMLElement): void => {
        tabRefs.current[tab.id] = el;
      }}
    >
      <PanelTabItemStyled selected={selectedTabId === tab.id} onClick={handleTabClick}>
        <Box display={'flex'} overflow={'hidden'} flexGrow={1} justifyContent={'center'} alignItems={'center'}>
          <Tooltip title={tab.name} placement={'bottom'} key={tab.id}>
            <Typography
              display={'inline-block'}
              component={'span'}
              overflow={'hidden'}
              textOverflow={'ellipsis'}
              maxWidth={'100px'}
              variant='subtitle2'
            >
              {tab.name}
            </Typography>
          </Tooltip>
        </Box>
        <CustomIcon type='close' size='s' onClick={handleCloseClick} />
      </PanelTabItemStyled>
      <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </Box>
  );
});

PanelTabItem.displayName = 'PanelTabItem';

export default PanelTabItem;
