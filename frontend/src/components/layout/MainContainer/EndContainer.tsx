import AiChatPanel from '@/components/common/AiChatPanel/AiChatPanel';
import DBFields from '@/components/common/DBFields/DBFields';
import { getSidebarMaxWidth, useLayoutMode, useWindowSize } from '@/hooks';
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

type EndContainerProps = {
  overlay?: boolean;
  fullPage?: boolean;
};

export default function EndContainer({ overlay = false, fullPage = false }: EndContainerProps): JSX.Element {
  const windowSize = useWindowSize();
  const { isCompact } = useLayoutMode();
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

  const maxWidth = isCompact && windowSize.widthNumber ? getSidebarMaxWidth(windowSize.widthNumber) : 500;

  const content = (
    <EndContainerStyled fullPage={fullPage}>
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
  );

  if (overlay) {
    return content;
  }

  return (
    <ResizableXBox
      onChange={(width: number): void => updateUI({ sidebar: { ...sidebar, rightWidth: width } })}
      width={sidebar.rightWidth}
      direction='ltr'
      maxWidth={maxWidth}
    >
      {content}
    </ResizableXBox>
  );
}
