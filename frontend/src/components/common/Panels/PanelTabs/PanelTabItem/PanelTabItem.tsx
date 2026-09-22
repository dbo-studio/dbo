'use no memo';

import ContextMenu from '@/components/base/ContextMenu/ContextMenu.tsx';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import {
  PanelTabContentStyled,
  PanelTabIconStyled,
  PanelTabItemStyled,
  PanelTabNameStyled
} from '@/components/common/Panels/PanelTabs/PanelTabItem/PanelTabItem.styled.ts';
import { TabMode } from '@/core/enums';
import { shortcuts } from '@/core/utils';
import { useContextMenu, useShortcut } from '@/hooks';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { TabType } from '@/types';
import { Tooltip } from '@mui/material';
import type { JSX } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { usePanelTabMenu } from '../../hooks/usePanelTabMenu';
import { useRemoveTab } from '../../hooks/useRemoveTab';
import { useSwitchTab } from '../../hooks/useSwitchTab';

const toTestIdSlug = (name: string): string => name.toLowerCase().replace(/\s+/g, '-');

const TAB_MODE_ICON: Record<TabMode, keyof typeof IconTypes> = {
  [TabMode.Data]: 'sheet',
  [TabMode.Query]: 'sql',
  [TabMode.Object]: 'pen',
  [TabMode.ObjectDetail]: 'pen',
  [TabMode.Diagram]: 'layout',
  [TabMode.Settings]: 'settings'
};

export default function PanelTabItem({ tab, overlay = false }: { tab: TabType; overlay?: boolean }): JSX.Element {
  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const tabRef = useRef<HTMLDivElement | null>(null);
  const isSettings = tab.mode === TabMode.Settings;
  const selected = selectedTabId === tab.id;

  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();
  const { handleSwitchTab } = useSwitchTab();
  const { handleRemoveTab } = useRemoveTab();

  const menu = usePanelTabMenu(tab);

  const handleTabClick = useCallback((): void => {
    handleSwitchTab(tab.id);
  }, [handleSwitchTab, tab.id]);

  const handleCloseClick = useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();
      handleRemoveTab(tab.id).catch(() => undefined);
    },
    [handleRemoveTab, tab.id]
  );

  useShortcut(shortcuts.closeTab, () => {
    if (overlay || !selected) {
      return;
    }
    void handleRemoveTab(selectedTabId ?? '');
  });

  useEffect(() => {
    if (overlay || !selected) {
      return;
    }
    tabRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  }, [overlay, selected]);

  return (
    <>
      <PanelTabItemStyled
        ref={tabRef}
        selected={selected}
        compact={isSettings}
        data-testid={`workspace-tab-${toTestIdSlug(tab.name)}`}
        data-tab-id={tab.id}
        onContextMenu={overlay ? undefined : handleContextMenu}
        onClick={overlay ? undefined : handleTabClick}
      >
        <PanelTabContentStyled>
          <PanelTabIconStyled data-testid={`workspace-tab-icon-${tab.mode}`}>
            <CustomIcon type={TAB_MODE_ICON[tab.mode]} size='xs' color='currentColor' />
          </PanelTabIconStyled>
          <Tooltip title={tab.name} placement={'bottom'}>
            <PanelTabNameStyled component={'span'} variant='subtitle2'>
              {tab.name}
            </PanelTabNameStyled>
          </Tooltip>
        </PanelTabContentStyled>
        <CustomIcon type='close' size='s' onClick={overlay ? undefined : handleCloseClick} />
      </PanelTabItemStyled>
      {!overlay && <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />}
    </>
  );
}
