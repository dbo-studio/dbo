import ObjectTreeView from '@/components/common/ObjectTreeView/ObjectTreeView.tsx';
import { getSidebarMaxWidth, useLayoutMode, useWindowSize } from '@/hooks';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Tab, Tabs } from '@mui/material';
import React, { type JSX, type SyntheticEvent, useMemo, useState } from 'react';
import ResizableXBox from '../../base/ResizableBox/ResizableXBox';
import Histories from '../../common/Histories/Histories';
import SavedQueries from '../../common/SavedQueries/SavedQueries';
import { ExplorerContainerStyled, ExplorerTabPanelStyled } from './Container.styled';

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

  const onSelectedTabChanged = (_: SyntheticEvent, id: number): void => {
    setSelectedTabId(id);
  };

  const maxWidth = isCompact && windowSize.widthNumber ? getSidebarMaxWidth(windowSize.widthNumber) : 500;

  const content = (
    <ExplorerContainerStyled fullPage={fullPage}>
      <Tabs variant='fullWidth' value={selectedTabId} onChange={onSelectedTabChanged}>
        <Tab label={locales.items} />
        <Tab label={locales.queries} />
        <Tab label={locales.history} />
      </Tabs>

      <ExplorerTabPanelStyled role='tabpanel'>{selectedTabContent}</ExplorerTabPanelStyled>
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
