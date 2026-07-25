import ObjectTreeView from '@/components/common/ObjectTreeView/ObjectTreeView.tsx';
import SidebarSectionTabs from '@/components/base/SidebarSectionTabs/SidebarSectionTabs';
import { SidebarTabPanelStyled } from '@/components/base/SidebarSectionTabs/SidebarSectionTabs.styled';
import { getSidebarMaxWidth, useLayoutMode, useWindowSize } from '@/hooks';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import React, { type JSX, useMemo, useState } from 'react';
import ResizableXBox from '../../base/ResizableBox/ResizableXBox';
import Histories from '../../common/Histories/Histories';
import SavedQueries from '../../common/SavedQueries/SavedQueries';
import { ExplorerContainerStyled } from './Container.styled';

const tabs = [
  {
    id: 0,
    component: ObjectTreeView
  },
  {
    id: 1,
    component: SavedQueries
  },
  {
    id: 2,
    component: Histories
  }
];

const sectionTabs = [
  { id: 0, label: locales.items },
  { id: 1, label: locales.queries },
  { id: 2, label: locales.history }
] as const;

type ExplorerContainerProps = {
  overlay?: boolean;
  fullPage?: boolean;
};

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
    const Component = tabs.find((obj) => obj.id === Number(selectedTabId))?.component;
    return Component ? <Component /> : null;
  }, [selectedTabId]);

  const maxWidth = isCompact && windowSize.widthNumber ? getSidebarMaxWidth(windowSize.widthNumber) : 500;

  const content = (
    <ExplorerContainerStyled fullPage={fullPage}>
      <SidebarSectionTabs value={selectedTabId} onChange={setSelectedTabId} tabs={[...sectionTabs]} />

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
