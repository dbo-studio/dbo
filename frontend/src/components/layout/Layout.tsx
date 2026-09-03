import { TabMode } from '@/core/enums';
import { shortcuts } from '@/core/utils';
import { useCurrentConnection, useResponsiveSidebar, useShortcut } from '@/hooks';
import { useAiBridge } from '@/hooks/useAiBridge';
import { useDesktopMenu } from '@/hooks/useDesktopMenu.hook';
import { useLayoutMode } from '@/hooks/useLayoutMode.hook';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { JSX } from 'react';
import ConfirmModal from '../base/Modal/ConfirmModal/ConfirmModal.tsx';
import Settings from '../common/Settings/Settings';
import UpdateDialog from '../common/UpdateDialog/UpdateDialog';
import SafeModePasswordHost from '../common/SafeModePasswordPrompt/SafeModePasswordHost';
import AppHeader from './AppHeader/AppHeader';
import { LayoutBodyStyled, LayoutMainStyled, LayoutStyled } from './Layout.styled';
import CenterContainer from './MainContainer/CenterContainer.tsx';
import EndContainer from './MainContainer/EndContainer.tsx';
import ExplorerContainer from './MainContainer/ExplorerContainer.tsx';
import StartContainer from './MainContainer/StartContainer';
import MobileConnectionsPanel from './MobileConnectionsPanel/MobileConnectionsPanel';
import SidebarDrawer from './SidebarDrawer/SidebarDrawer';

export default function Layout(): JSX.Element {
  const { useSidebarOverlay, showConnectionsRail, isMobile } = useLayoutMode();
  const sidebar = useSettingStore((state) => state.ui.sidebar);
  const showSettings = useSettingStore((state) => state.ui.showSettings);
  const showConnectionsDrawer = useSettingStore((state) => state.ui.showConnectionsDrawer);
  const updateUI = useSettingStore((state) => state.updateUI);
  const currentConnection = useCurrentConnection();
  const { openAssistant, prefillChat } = useAiBridge();

  useResponsiveSidebar();
  useDesktopMenu();

  useShortcut(shortcuts.openAssistant, () => {
    const selectedTab = useTabStore.getState().selectedTab();
    if (selectedTab?.mode === TabMode.Query) {
      const query = useTabStore.getState().getQuery();
      if (query) {
        prefillChat('', false, { querySnippet: query });
      }
    }
    openAssistant(0);
  });

  useShortcut(shortcuts.openShortcuts, () => {
    updateUI({ showSettings: { open: true, tab: 2 } });
  });

  const closeLeftSidebar = (): void => {
    updateUI({ sidebar: { ...sidebar, showLeft: false } });
  };

  const closeRightSidebar = (): void => {
    updateUI({ sidebar: { ...sidebar, showRight: false } });
  };

  const closeConnectionsDrawer = (): void => {
    updateUI({ showConnectionsDrawer: false });
  };

  const showExplorer = Boolean(currentConnection && sidebar.showLeft);
  const showAssistant = Boolean(currentConnection && sidebar.showRight);

  const renderMain = (): JSX.Element => {
    if (useSidebarOverlay) {
      return (
        <>
          <SidebarDrawer open={showConnectionsDrawer} onClose={closeConnectionsDrawer} anchor='left'>
            <MobileConnectionsPanel />
          </SidebarDrawer>
          <SidebarDrawer open={showExplorer} onClose={closeLeftSidebar} anchor='left'>
            <ExplorerContainer overlay fullPage={isMobile} />
          </SidebarDrawer>
          <CenterContainer />
          <SidebarDrawer open={showAssistant} onClose={closeRightSidebar} anchor='right'>
            <EndContainer overlay fullPage={isMobile} />
          </SidebarDrawer>
        </>
      );
    }

    return (
      <>
        {showExplorer && <ExplorerContainer />}
        <CenterContainer />
        {showAssistant && <EndContainer />}
      </>
    );
  };

  return (
    <LayoutStyled>
      <ConfirmModal />
      <SafeModePasswordHost />
      <UpdateDialog />
      <Settings open={showSettings.open} />
      <AppHeader />
      <LayoutBodyStyled>
        {showConnectionsRail && <StartContainer />}
        <LayoutMainStyled>{renderMain()}</LayoutMainStyled>
      </LayoutBodyStyled>
    </LayoutStyled>
  );
}
