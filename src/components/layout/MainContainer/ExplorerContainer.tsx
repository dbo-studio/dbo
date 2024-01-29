import DBTreeView from '@/src/components/common/DBTreeView/DBTreeView';
import { useSettingStore } from '@/src/store/settingStore/setting.store';
import { Box, Tab, Tabs } from '@mui/material';
import { useMemo, useState } from 'react';
import ResizableXBox from '../../base/ResizableBox/ResizableXBox';
import { ExplorerContainerStyled } from './Container.styled';

const tabs = [
  {
    id: 0,
    name: 'Items',
    content: (
      <>
        <DBTreeView />
      </>
    )
  },
  {
    id: 1,
    name: 'Queries',
    content: (
      <>
        <p>Queries</p>
      </>
    )
  },
  {
    id: 2,
    name: 'History',
    content: (
      <>
        <p>History</p>
      </>
    )
  }
];

export default function ExplorerContainer() {
  const [selectedTabId, setSelectedTabId] = useState(0);
  const { sidebar, updateSidebar } = useSettingStore();

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === Number(selectedTabId))?.content;
  }, [selectedTabId]);

  const onSelectedTabChanged = (event: React.SyntheticEvent, id: number) => {
    setSelectedTabId(id);
  };

  return (
    <ResizableXBox
      onChange={(width: number) => updateSidebar({ leftWidth: width })}
      width={sidebar.leftWidth}
      direction='rtl'
      maxWidth={500}
    >
      <ExplorerContainerStyled>
        <Tabs value={selectedTabId} onChange={onSelectedTabChanged}>
          <Tab label='Tables' />
          <Tab label='Queries' />
          <Tab label='History' />
        </Tabs>

        <Box role='tabpanel'>{selectedTabContent}</Box>
      </ExplorerContainerStyled>
    </ResizableXBox>
  );
}
