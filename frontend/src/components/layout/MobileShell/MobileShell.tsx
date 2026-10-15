import AddConnection from '@/components/common/AddConnection/AddConnection';
import AiChatProvider from '@/components/common/AiChatPanel/AiChatProvider/AiChatProvider';
import EditConnection from '@/components/common/AddConnection/EditConnection';
import ConnectionPasswordPromptModal from '@/components/common/Connections/ConnectionPasswordPrompt/ConnectionPasswordPrompt';
import { useConnectionsList } from '@/components/common/Connections/useConnectionsList';
import { withMobileDensity } from '@/core/theme/mobileDensity';
import { useCurrentConnection, useDesktopIntentBridge, useHardwareBack } from '@/hooks';
import { useMobileNavStore } from '@/store/mobileNavStore/mobileNav.store';
import type { MobileTab } from '@/store/mobileNavStore/types';
import { ThemeProvider } from '@mui/material';
import type { JSX } from 'react';
import AppHosts from '../AppHosts';
import ConnectionsSheet from './ConnectionsSheet/ConnectionsSheet';
import MobileHeader from './MobileHeader/MobileHeader';
import { MobileShellStyled, TabPaneStyled } from './MobileShell.styled';
import ScreenStack from './ScreenStack/ScreenStack';
import AiScreen from './screens/AiScreen/AiScreen';
import ExploreScreen from './screens/ExploreScreen/ExploreScreen';
import HistoryScreen from './screens/HistoryScreen/HistoryScreen';
import NoConnectionScreen from './screens/NoConnectionScreen/NoConnectionScreen';
import QueryScreen from './screens/QueryScreen/QueryScreen';
import SavedQueriesScreen from './screens/SavedQueriesScreen/SavedQueriesScreen';
import TreeNodeScreen from './screens/TreeNodeScreen/TreeNodeScreen';
import TabBar from './TabBar/TabBar';
import type { PushedScreen, RootScreen } from './types';

const tabs: MobileTab[] = ['explore', 'query', 'ai'];

const rootScreens: Record<MobileTab, RootScreen> = {
  explore: ExploreScreen,
  query: QueryScreen,
  ai: AiScreen
};

const pushedScreens: Record<string, PushedScreen> = {
  treeNode: TreeNodeScreen,
  savedQueries: SavedQueriesScreen,
  history: HistoryScreen
};

export default function MobileShell(): JSX.Element {
  const activeTab = useMobileNavStore((state) => state.activeTab);
  const currentConnection = useCurrentConnection();

  // Keeps the connection list loaded and a current connection selected, whether or not a list is on screen.
  useConnectionsList();
  useHardwareBack();
  useDesktopIntentBridge();

  return (
    <ThemeProvider theme={withMobileDensity}>
      <AiChatProvider active={activeTab === 'ai'}>
        <MobileShellStyled data-testid='mobile-shell'>
          <AppHosts />
          <AddConnection />
          <EditConnection />
          <ConnectionPasswordPromptModal />
          <ConnectionsSheet />
          <MobileHeader />
          {currentConnection ? (
            <>
              {/* Every tab stays mounted so editor text, scroll and chat state survive tab switches. */}
              {tabs.map((tab) => (
                <TabPaneStyled key={tab} active={tab === activeTab} hidden={tab !== activeTab}>
                  <ScreenStack tab={tab} root={rootScreens[tab]} screens={pushedScreens} />
                </TabPaneStyled>
              ))}
              <TabBar />
            </>
          ) : (
            <NoConnectionScreen />
          )}
        </MobileShellStyled>
      </AiChatProvider>
    </ThemeProvider>
  );
}
