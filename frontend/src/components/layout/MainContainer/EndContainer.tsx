import AiChatPanel from '@/components/common/AiChatPanel/AiChatPanel';
import DBFields from '@/components/common/DBFields/DBFields';
import { useWindowSize } from '@/hooks/useWindowSize.hook';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Tab, Tabs } from '@mui/material';
import { type JSX, type SyntheticEvent, useMemo } from 'react';
import ResizableXBox from '../../base/ResizableBox/ResizableXBox';
import { EndContainerStyled } from './Container.styled';

const tabs = [
  {
    id: 0,
    component: AiChatPanel
  },
  {
    id: 1,
    component: DBFields
  }
];

export default function EndContainer(): JSX.Element {
  const windowSize = useWindowSize();
  const sidebar = useSettingStore((state) => state.ui.sidebar);
  const updateUI = useSettingStore((state) => state.updateUI);
  const selectedTabId = sidebar.rightSidebarTab ?? 0;

  const selectedTabContent = useMemo(() => {
    const Component = tabs.find((obj) => obj.id === Number(selectedTabId))?.component;
    return Component ? <Component /> : null;
  }, [selectedTabId]);

  const onSelectedTabChanged = (_: SyntheticEvent, id: number): void => {
    updateUI({ sidebar: { ...sidebar, rightSidebarTab: id } });
  };

  return (
    <ResizableXBox
      onChange={(width: number): void => updateUI({ sidebar: { ...sidebar, rightWidth: width } })}
      width={sidebar.rightWidth}
      direction='ltr'
      maxWidth={500}
    >
      <EndContainerStyled containerHeight={windowSize.heightNumber}>
        <Tabs variant='fullWidth' value={selectedTabId} onChange={onSelectedTabChanged}>
          <Tab label={locales.assistant} />
          <Tab label={locales.fields} />
        </Tabs>
        <Box
          role='tabpanel'
          sx={{
            flex: 1,
            minHeight: 0
          }}
        >
          {selectedTabContent}
        </Box>
      </EndContainerStyled>
    </ResizableXBox>
  );
}
