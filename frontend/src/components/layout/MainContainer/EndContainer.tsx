import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import { useFeaturePermissions } from '@/hooks/useFeaturePermissions';
import { isNoSQLType } from '@/core/db/connectionAliases';
import SidebarSectionTabs from '@/components/base/SidebarSectionTabs/SidebarSectionTabs';
import { SidebarTabPanelStyled } from '@/components/base/SidebarSectionTabs/SidebarSectionTabs.styled';
import AiChatPanel from '@/components/common/AiChatPanel/AiChatPanel';
import DBFields from '@/components/common/DBFields/DBFields';
import SqlSnippets from '@/components/common/SqlSnippets/SqlSnippets';
import DiagramSource from '@/components/common/DiagramSource/DiagramSource';
import { TabMode } from '@/core/enums';
import { getSidebarMaxWidth, useLayoutMode, useSelectedTab, useWindowSize } from '@/hooks';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { type JSX, useMemo } from 'react';
import ResizableXBox from '../../base/ResizableBox/ResizableXBox';
import { EndContainerStyled } from './Container.styled';
import type { EndContainerProps } from './types';

export default function EndContainer({ overlay = false, fullPage = false }: EndContainerProps): JSX.Element {
  const windowSize = useWindowSize();
  const { isCompact } = useLayoutMode();
  const sidebar = useSettingStore((state) => state.ui.sidebar);
  const updateUI = useSettingStore((state) => state.updateUI);
  const selectedTab = useSelectedTab();
  const selectedTabId = sidebar.rightSidebarTab ?? 0;
  const isDiagram = selectedTab?.mode === TabMode.Diagram;
  const workspaceOpen = useSettingStore((state) => state.ui.agentWorkspaceOpen);
  // Fields describe SQL columns, so MongoDB and Redis get only the assistant and snippets.
  const noSql = isNoSQLType(useCurrentConnection()?.type);
  const aiAllowed = useFeaturePermissions().ai;

  const sectionTabs = useMemo(
    () =>
      [
        { id: 0, label: locales.assistant },
        { id: 1, label: isDiagram ? locales.source : locales.fields },
        { id: 2, label: locales.snippets }
      ].filter((tab) => !noSql || tab.id !== 1),
    [isDiagram, noSql]
  );

  // A stored Fields tab does not exist on a NoSQL connection; show the assistant instead.
  const activeTabId = noSql && Number(selectedTabId) === 1 ? 0 : Number(selectedTabId);

  const selectedTabContent = useMemo(() => {
    if (!aiAllowed) return null;

    if (activeTabId === 0) {
      // The agent workspace drives the same chat while it is open.
      return workspaceOpen ? null : <AiChatPanel />;
    }

    if (activeTabId === 2) return <SqlSnippets />;

    return isDiagram ? <DiagramSource /> : <DBFields />;
  }, [activeTabId, isDiagram, workspaceOpen, aiAllowed]);

  const maxWidth = isCompact && windowSize.widthNumber ? getSidebarMaxWidth(windowSize.widthNumber) : 500;

  const content = (
    <EndContainerStyled fullPage={fullPage}>
      <SidebarSectionTabs
        value={activeTabId}
        onChange={(id): void => updateUI({ sidebar: { ...sidebar, rightSidebarTab: id } })}
        tabs={sectionTabs}
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
