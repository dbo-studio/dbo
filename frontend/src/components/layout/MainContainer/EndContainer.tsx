import AiChatPanel from '@/components/common/AiChatPanel/AiChatPanel';
import DBFields from '@/components/common/DBFields/DBFields';
import SidebarSectionTabs from '@/components/base/SidebarSectionTabs/SidebarSectionTabs';
import { SidebarTabPanelStyled } from '@/components/base/SidebarSectionTabs/SidebarSectionTabs.styled';
import { getSidebarMaxWidth, useLayoutMode, useWindowSize } from '@/hooks';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { type JSX, useMemo } from 'react';
import ResizableXBox from '../../base/ResizableBox/ResizableXBox';
import { EndContainerStyled } from './Container.styled';
import type { EndContainerProps } from './types';

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

const sectionTabs = [
  { id: 0, label: locales.assistant },
  { id: 1, label: locales.fields }
] as const;

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

  const maxWidth = isCompact && windowSize.widthNumber ? getSidebarMaxWidth(windowSize.widthNumber) : 500;

  const content = (
    <EndContainerStyled fullPage={fullPage}>
      <SidebarSectionTabs
        value={selectedTabId}
        onChange={(id): void => updateUI({ sidebar: { ...sidebar, rightSidebarTab: id } })}
        tabs={[...sectionTabs]}
      />
      <SidebarTabPanelStyled role='tabpanel'>{selectedTabContent}</SidebarTabPanelStyled>
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
