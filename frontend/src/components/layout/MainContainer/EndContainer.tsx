import AIChatPanel from '@/components/common/AIChatPanel/AIChatPanel';
import DBFields from '@/components/common/DBFields/DBFields';
import { useWindowSize } from '@/hooks/useWindowSize.hook';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Tab, Tabs } from '@mui/material';
import { type JSX, type SyntheticEvent, useMemo, useState } from 'react';
import ResizableXBox from '../../base/ResizableBox/ResizableXBox';
import { EndContainerStyled } from './Container.styled';

const tabs = [
  {
    id: 0,
    component: AIChatPanel
  },
  {
    id: 1,
    component: DBFields
  }
];

export default function EndContainer(): JSX.Element {
  const windowSize = useWindowSize();
  const sidebar = useSettingStore((state) => state.sidebar);
  const updateSidebar = useSettingStore((state) => state.updateSidebar);
  const [selectedTabId, setSelectedTabId] = useState(0);

  const selectedTabContent = useMemo(() => {
    const Component = tabs.find((obj) => obj.id === Number(selectedTabId))?.component;
    return Component ? <Component /> : null;
  }, [selectedTabId]);

  const onSelectedTabChanged = (_: SyntheticEvent, id: number): void => {
    setSelectedTabId(id);
  };

  return (
    <ResizableXBox
      onChange={(width: number): void => updateSidebar({ rightWidth: width })}
      width={sidebar.rightWidth}
      direction='ltr'
      maxWidth={500}
    >
      <EndContainerStyled maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
        <Tabs variant='fullWidth' value={selectedTabId} onChange={onSelectedTabChanged}>
          <Tab label={locales.assistant} />
          <Tab label={locales.fields} />
        </Tabs>
        <Box role='tabpanel' flex={1}>
          {selectedTabContent}
        </Box>
      </EndContainerStyled>
    </ResizableXBox>
  );
}
