import ObjectTreeView from '@/components/common/ObjectTreeView/ObjectTreeView.tsx';
import { useWindowSize } from '@/hooks/useWindowSize.hook';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Tab, Tabs } from '@mui/material';
import React, { type JSX, type SyntheticEvent, useMemo, useState } from 'react';
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

export default React.memo(function ExplorerContainer(): JSX.Element {
  const windowSize = useWindowSize();
  const [selectedTabId, setSelectedTabId] = useState(0);
  const sidebar = useSettingStore((state) => state.sidebar);
  const updateSidebar = useSettingStore((state) => state.updateSidebar);

  const selectedTabContent = useMemo(() => {
    const Component = tabs.find((obj) => obj.id === Number(selectedTabId))?.component;
    return Component ? <Component /> : null;
  }, [selectedTabId]);

  const onSelectedTabChanged = (_: SyntheticEvent, id: number): void => {
    setSelectedTabId(id);
  };

  return (
    <ResizableXBox
      onChange={(width: number): void => updateSidebar({ leftWidth: width })}
      width={sidebar.leftWidth}
      direction='rtl'
      maxWidth={500}
    >
      <ExplorerContainerStyled maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
        <Tabs variant='fullWidth' value={selectedTabId} onChange={onSelectedTabChanged}>
          <Tab label={locales.items} />
          <Tab label={locales.queries} />
          <Tab label={locales.history} />
        </Tabs>

        <Box role='tabpanel' flex={1} minHeight={0} display={'flex'} flexDirection={'column'}>
          {selectedTabContent}
        </Box>
      </ExplorerContainerStyled>
    </ResizableXBox>
  );
});
