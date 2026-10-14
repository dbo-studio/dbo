import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useMobileNavStore } from '@/store/mobileNavStore/mobileNav.store';
import type { MobileTab } from '@/store/mobileNavStore/types';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useEffect } from 'react';

/**
 * Shared components still express navigation the desktop way (open a workspace tab, show a
 * sidebar, pick a connection). Translate those transitions into mobile tab switches and sheets so the
 * existing components work unchanged inside the mobile shell.
 */
export const useDesktopIntentBridge = (): void => {
  useEffect(() => {
    const go = (tab: MobileTab): void => useMobileNavStore.getState().setActiveTab(tab);

    const unsubTabs = useTabStore.subscribe((state, prev) => {
      if (state.selectedTabId && state.selectedTabId !== prev.selectedTabId) {
        go('query');
      }
    });

    const unsubConnection = useConnectionStore.subscribe((state, prev) => {
      if (state.currentConnectionId != null && state.currentConnectionId !== prev.currentConnectionId) {
        // The previous connection's drill-down no longer applies.
        const nav = useMobileNavStore.getState();
        nav.setConnectionsOpen(false);
        nav.resetTab('explore');
        go('explore');
      }
    });

    const unsubUi = useSettingStore.subscribe((state, prev) => {
      const { sidebar, showConnectionsDrawer } = state.ui;
      if (sidebar.showRight && !prev.ui.sidebar.showRight) {
        go('ai');
      } else if (sidebar.showLeft && !prev.ui.sidebar.showLeft) {
        go('explore');
      } else if (showConnectionsDrawer && !prev.ui.showConnectionsDrawer) {
        // Mobile shows connections in the header sheet; reset the flag so the next request fires again.
        useMobileNavStore.getState().setConnectionsOpen(true);
        useSettingStore.getState().updateUI({ showConnectionsDrawer: false });
      }
    });

    return (): void => {
      unsubTabs();
      unsubConnection();
      unsubUi();
    };
  }, []);
};
