'use no memo';

import ContextMenu from '@/components/base/ContextMenu/ContextMenu.tsx';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import SortableItem from '@/components/base/SortableList/SortableItem/SortableItem';
import {
  PanelTabContentStyled,
  PanelTabItemStyled,
  PanelTabNameStyled
} from '@/components/common/Panels/PanelTabs/PanelTabItem/PanelTabItem.styled.ts';
import { shortcuts } from '@/core/utils';
import { useContextMenu, useShortcut } from '@/hooks';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { TabType } from '@/types';
import { Box, Tooltip } from '@mui/material';
import type { JSX } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { usePanelTabMenu } from '../../hooks/usePanelTabMenu';
import { useRemoveTab } from '../../hooks/useRemoveTab';
import { useSwitchTab } from '../../hooks/useSwitchTab';

const toTestIdSlug = (name: string): string => name.toLowerCase().replace(/\s+/g, '-');

export default function PanelTabItem({ tab }: { tab: TabType }): JSX.Element {
  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const tabRefsRef = useRef<Record<string, HTMLElement>>({});

  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();
  const { handleSwitchTab } = useSwitchTab();
  const { handleRemoveTab } = useRemoveTab();

  const menu = usePanelTabMenu(tab);

  const handleTabClick = useCallback((): void => {
    handleSwitchTab(tab.id);
  }, [handleSwitchTab, tab.id]);

  const handleCloseClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>): void => {
      e.stopPropagation();
      e.preventDefault();
      handleRemoveTab(tab.id).catch((e) => console.log('🚀 ~ PanelTabItem ~ e:', e));
    },
    [handleRemoveTab, tab.id]
  );

  useShortcut(shortcuts.closeTab, () => void handleRemoveTab(selectedTabId ?? ''));

  useEffect(() => {
    const tabId = selectedTabId;
    if (tabId && tabRefsRef.current?.[tabId]) {
      tabRefsRef.current[tabId].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [selectedTabId]);

  return (
    <Box
      onContextMenu={handleContextMenu}
      ref={(el: HTMLElement): void => {
        tabRefsRef.current[tab.id] = el;
      }}
    >
      <SortableItem id={tab.id} onClick={handleTabClick}>
        <PanelTabItemStyled selected={selectedTabId === tab.id} data-testid={`workspace-tab-${toTestIdSlug(tab.name)}`}>
          <PanelTabContentStyled>
            <Tooltip title={tab.name} placement={'bottom'}>
              <PanelTabNameStyled component={'span'} variant='subtitle2'>
                {tab.name}
              </PanelTabNameStyled>
            </Tooltip>
          </PanelTabContentStyled>
          <CustomIcon type='close' size='s' onClick={handleCloseClick} />
        </PanelTabItemStyled>
      </SortableItem>
      <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </Box>
  );
}
