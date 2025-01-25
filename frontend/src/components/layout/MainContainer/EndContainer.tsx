import CodeEditor from '@/components/base/CodeEditor/CodeEditor.tsx';
import DBFields from '@/components/common/DBFields/DBFields';
import Histories from '@/components/common/Histories/Histories.tsx';
import {useWindowSize} from '@/hooks/useWindowSize.hook';
import locales from '@/locales';
import {useSettingStore} from '@/store/settingStore/setting.store';
import {Box, Tab, Tabs} from '@mui/material';
import {type SyntheticEvent, useMemo, useState} from 'react';
import ResizableXBox from '../../base/ResizableBox/ResizableXBox';
import {ExplorerContainerStyled} from './Container.styled';

const tabs = [
  {
    id: 0,
    content: <DBFields />
  },
  {
    id: 1,
    content: (
      <Box height={'100%'} flex={1}>
        <CodeEditor
          autocomplete={{
            databases: [],
            views: [],
            schemas: [],
            tables: [],
            columns: {}
          }}
          value={''}
          onChange={(value: string): void => {
            console.log(value);
          }}
        />
      </Box>
    )
  },
  {
    id: 2,
    content: <Histories />
  }
];

export default function EndContainer() {
  const windowSize = useWindowSize();
  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);
  const { sidebar, updateSidebar } = useSettingStore();

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId]);

  const onSelectedTabChanged = (_: SyntheticEvent, id: number) => {
    setSelectedTabId(id);
  };

  return (
    <ResizableXBox
      onChange={(width: number) => updateSidebar({ rightWidth: width })}
      width={sidebar.rightWidth}
      direction='ltr'
      maxWidth={500}
    >
      <ExplorerContainerStyled maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
        <Tabs value={selectedTabId} onChange={onSelectedTabChanged}>
          <Tab label={locales.record} />
          <Tab label={locales.queries} />
          <Tab label={locales.history} />
        </Tabs>

        <Box height={'100%'} role='tabpanel'>
          {selectedTabContent}
        </Box>
      </ExplorerContainerStyled>
    </ResizableXBox>
  );
}
