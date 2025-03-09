import ObjectTreeView from '@/components/common/ObjectTreeView/ObjectTreeView.tsx';
import { useWindowSize } from '@/hooks/useWindowSize.hook';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Tab, Tabs } from '@mui/material';
import { type SyntheticEvent, useMemo, useState } from 'react';
import ResizableXBox from '../../base/ResizableBox/ResizableXBox';
import Histories from '../../common/Histories/Histories';
import SavedQueries from '../../common/SavedQueries/SavedQueries';
import { ExplorerContainerStyled } from './Container.styled';

const tabs = [
  {
    id: 0,
    content: <ObjectTreeView />
  },
  {
    id: 1,
    content: <SavedQueries />
  },
  {
    id: 2,
    content: <Histories />
  }
];

export default function ExplorerContainer() {
  const windowSize = useWindowSize();
  const [selectedTabId, setSelectedTabId] = useState(0);
  const { sidebar, updateSidebar } = useSettingStore();

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === Number(selectedTabId))?.content;
  }, [selectedTabId]);

  const onSelectedTabChanged = (_: SyntheticEvent, id: number) => {
    setSelectedTabId(id);
  };

  return (
    <ResizableXBox
      onChange={(width: number) => updateSidebar({ leftWidth: width })}
      width={sidebar.leftWidth}
      direction='rtl'
      maxWidth={500}
    >
      <ExplorerContainerStyled maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
        <Tabs value={selectedTabId} onChange={onSelectedTabChanged}>
          <Tab label={locales.fields} />
          <Tab label={locales.queries} />
          <Tab label={locales.history} />
        </Tabs>

        <Box role='tabpanel'>{selectedTabContent}</Box>
      </ExplorerContainerStyled>
    </ResizableXBox>
  );
}
