import { TabMode } from '@/core/enums';
import { shortcuts } from '@/core/utils';
import { useCurrentConnection, useShortcut, useWindowSize } from '@/hooks';
import { useAiBridge } from '@/hooks/useAiBridge';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Grid } from '@mui/material';
import type { JSX } from 'react';
import ConfirmModal from '../base/Modal/ConfirmModal/ConfirmModal.tsx';
import UpdateDialog from '../common/UpdateDialog/UpdateDialog';
import AppHeader from './AppHeader/AppHeader';
import { LayoutStyled } from './Layout.styled';
import CenterContainer from './MainContainer/CenterContainer.tsx';
import EndContainer from './MainContainer/EndContainer.tsx';
import ExplorerContainer from './MainContainer/ExplorerContainer.tsx';
import StartContainer from './MainContainer/StartContainer';

export default function Layout(): JSX.Element {
  const windowSize = useWindowSize(true);
  const sidebar = useSettingStore((state) => state.ui.sidebar);
  const currentConnection = useCurrentConnection();
  const { openAssistant, prefillChat } = useAiBridge();

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

  return (
    <LayoutStyled containerHeight={windowSize.heightNumber}>
      <ConfirmModal />
      <UpdateDialog />
      <AppHeader />
      <Grid container spacing={0}>
        <Grid>
          <StartContainer />
        </Grid>
        {sidebar.showLeft && currentConnection && (
          <Grid>
            <ExplorerContainer />
          </Grid>
        )}
        {currentConnection && (
          <Grid
            sx={{
              flex: 1,
              minWidth: 0
            }}
          >
            <CenterContainer />
          </Grid>
        )}

        {sidebar.showRight && currentConnection && (
          <Grid>
            <EndContainer />
          </Grid>
        )}
      </Grid>
    </LayoutStyled>
  );
}
