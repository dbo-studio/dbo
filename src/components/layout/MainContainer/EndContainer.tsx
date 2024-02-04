import DBFelids from '@/src/components/common/DBFelids/DBFelids';
import locales from '@/src/locales';
import { useSettingStore } from '@/src/store/settingStore/setting.store';
import { Box, Tab, Tabs } from '@mui/material';
import React, { useMemo, useState } from 'react';
import ResizableXBox from '../../base/ResizableBox/ResizableXBox';
import { EndContainerStyled } from './Container.styled';

const tabs = [
  {
    id: 0,
    name: locales.tables,
    content: (
      <>
        <DBFelids />
      </>
    )
  },
  {
    id: 1,
    name: locales.ddl,
    content: (
      <>
        <p>DDL</p>
      </>
    )
  },
  {
    id: 2,
    name: locales.info,
    content: (
      <>
        <p>Info</p>
      </>
    )
  }
];

export default function EndContainer() {
  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);
  const { sidebar, updateSidebar } = useSettingStore();

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId]);

  const onSelectedTabChanged = (event: React.SyntheticEvent, id: number) => {
    setSelectedTabId(id);
  };

  return (
    <ResizableXBox
      onChange={(width: number) => updateSidebar({ rightWidth: width })}
      width={sidebar.rightWidth}
      direction='ltr'
      maxWidth={500}
    >
      <EndContainerStyled>
        <Tabs value={selectedTabId} onChange={onSelectedTabChanged}>
          <Tab label='Fields' />
          <Tab label='DDL' />
          <Tab label='Info' />
        </Tabs>

        <Box role='tabpanel'>{selectedTabContent}</Box>
      </EndContainerStyled>
    </ResizableXBox>
  );
}
