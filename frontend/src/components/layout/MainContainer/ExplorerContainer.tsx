import Boards from '@/components/common/Boards/Boards';
import ObjectTreeView from '@/components/common/ObjectTreeView/ObjectTreeView.tsx';
import SidebarSectionTabs from '@/components/base/SidebarSectionTabs/SidebarSectionTabs';
import type { SidebarSectionTab } from '@/components/base/SidebarSectionTabs/types';
import { SidebarTabPanelStyled } from '@/components/base/SidebarSectionTabs/SidebarSectionTabs.styled';
import { getSidebarMaxWidth, useLayoutMode, useWindowSize } from '@/hooks';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import BackupSidebar from '@/components/common/BackupSidebar/BackupSidebar';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import { useExplorerAreaStore } from '@/store/explorerArea/explorerArea.store';
import { Typography } from '@mui/material';
import React, { type JSX, useMemo, useState } from 'react';
import ResizableXBox from '../../base/ResizableBox/ResizableXBox';
import Histories from '../../common/Histories/Histories';
import SavedQueries from '../../common/SavedQueries/SavedQueries';
import ConnectionSwitcher from '../ConnectionSwitcher/ConnectionSwitcher';
import { ExplorerContainerStyled, SidebarAreaTitleStyled } from './Container.styled';
import type { ExplorerContainerProps } from './types';

/** Sidebar views: lists the user picks from. Full-page tools get a TabMode instead (see frontend/AGENTS.md). */
const explorerViews: (SidebarSectionTab & { component: React.ComponentType })[] = [
  { id: 0, label: locales.items, component: ObjectTreeView },
  { id: 1, label: locales.queries, component: SavedQueries },
  { id: 2, label: locales.history, component: Histories }
];

// Without the rail (phone, tablet) there is nowhere else to reach Boards, so it stays a tab there.
const boardsTab: SidebarSectionTab & { component: React.ComponentType } = {
  id: 3,
  label: locales.boards,
  component: Boards,
  data: { testid: 'sidebar-tab-boards' }
};

export default React.memo(function ExplorerContainer({
  overlay = false,
  fullPage = false
}: ExplorerContainerProps): JSX.Element {
  const windowSize = useWindowSize();
  const { isCompact, showConnectionsRail } = useLayoutMode();
  const [selectedTabId, setSelectedTabId] = useState(0);
  const area = useExplorerAreaStore((state) => state.area);
  const currentConnection = useCurrentConnection();
  const views = useMemo(
    () => (showConnectionsRail ? explorerViews : [...explorerViews, boardsTab]),
    [showConnectionsRail]
  );
  const sidebar = useSettingStore((state) => state.ui.sidebar);
  const updateUI = useSettingStore((state) => state.updateUI);

  const selectedTabContent = useMemo(() => {
    const Component = views.find((view) => view.id === selectedTabId)?.component;
    return Component ? <Component /> : null;
  }, [selectedTabId, views]);

  const maxWidth = isCompact && windowSize.widthNumber ? getSidebarMaxWidth(windowSize.widthNumber) : 500;

  const title = (text: string): JSX.Element => (
    <SidebarAreaTitleStyled>
      <Typography variant='caption' color='textText' sx={{ fontWeight: 500 }}>
        {text}
      </Typography>
    </SidebarAreaTitleStyled>
  );

  // With the activity bar, the sidebar shows one area at a time; without it (phone, tablet) it is the explorer.
  const body = (): JSX.Element => {
    if (showConnectionsRail && area === 'boards') {
      return (
        <>
          {title(locales.explorer_boards_title)}
          <SidebarTabPanelStyled role='tabpanel'>
            <Boards />
          </SidebarTabPanelStyled>
        </>
      );
    }

    if (showConnectionsRail && area === 'backup') {
      return (
        <>
          {title(locales.rail_backup)}
          <SidebarTabPanelStyled role='tabpanel'>
            <BackupSidebar />
          </SidebarTabPanelStyled>
        </>
      );
    }

    return (
      <>
        {showConnectionsRail && <ConnectionSwitcher />}
        {showConnectionsRail && !currentConnection ? (
          <EmptyState icon='connection' title={locales.explorer_pick_connection} />
        ) : (
          <>
            <SidebarSectionTabs value={selectedTabId} onChange={setSelectedTabId} tabs={views} />
            <SidebarTabPanelStyled role='tabpanel'>{selectedTabContent}</SidebarTabPanelStyled>
          </>
        )}
      </>
    );
  };

  const content = <ExplorerContainerStyled fullPage={fullPage}>{body()}</ExplorerContainerStyled>;

  if (overlay) {
    return content;
  }

  return (
    <ResizableXBox
      onChange={(width: number): void => updateUI({ sidebar: { ...sidebar, leftWidth: width } })}
      width={sidebar.leftWidth}
      direction='rtl'
      maxWidth={maxWidth}
    >
      {content}
    </ResizableXBox>
  );
});
