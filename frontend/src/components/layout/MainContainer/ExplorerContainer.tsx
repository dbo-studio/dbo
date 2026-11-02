import Boards from '@/components/common/Boards/Boards';
import ObjectTreeView from '@/components/common/ObjectTreeView/ObjectTreeView.tsx';
import SidebarSectionTabs from '@/components/base/SidebarSectionTabs/SidebarSectionTabs';
import type { SidebarSectionTab } from '@/components/base/SidebarSectionTabs/types';
import { SidebarTabPanelStyled } from '@/components/base/SidebarSectionTabs/SidebarSectionTabs.styled';
import { getSidebarMaxWidth, useLayoutMode, useWindowSize } from '@/hooks';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import React, { type JSX, useMemo, useState } from 'react';
import ResizableXBox from '../../base/ResizableBox/ResizableXBox';
import Histories from '../../common/Histories/Histories';
import SavedQueries from '../../common/SavedQueries/SavedQueries';
import { ExplorerContainerStyled } from './Container.styled';
import type { ExplorerContainerProps } from './types';

/** Sidebar views: lists the user picks from. Full-page tools get a TabMode instead (see frontend/AGENTS.md). */
const explorerViews: (SidebarSectionTab & { component: React.ComponentType })[] = [
  { id: 0, label: locales.items, component: ObjectTreeView },
  { id: 1, label: locales.queries, component: SavedQueries },
  { id: 2, label: locales.history, component: Histories },
  { id: 3, label: locales.boards, component: Boards, data: { testid: 'sidebar-tab-boards' } }
];

export default React.memo(function ExplorerContainer({
  overlay = false,
  fullPage = false
}: ExplorerContainerProps): JSX.Element {
  const windowSize = useWindowSize();
  const { isCompact } = useLayoutMode();
  const [selectedTabId, setSelectedTabId] = useState(0);
  const sidebar = useSettingStore((state) => state.ui.sidebar);
  const updateUI = useSettingStore((state) => state.updateUI);

  const selectedTabContent = useMemo(() => {
    const Component = explorerViews.find((view) => view.id === selectedTabId)?.component;
    return Component ? <Component /> : null;
  }, [selectedTabId]);

  const maxWidth = isCompact && windowSize.widthNumber ? getSidebarMaxWidth(windowSize.widthNumber) : 500;

  const content = (
    <ExplorerContainerStyled fullPage={fullPage}>
      <SidebarSectionTabs value={selectedTabId} onChange={setSelectedTabId} tabs={explorerViews} />

      <SidebarTabPanelStyled role='tabpanel'>{selectedTabContent}</SidebarTabPanelStyled>
    </ExplorerContainerStyled>
  );

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
