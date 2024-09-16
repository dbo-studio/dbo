import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { getConnectionList } from '@/api/connection';
import { useSetupDesktop, useWindowSize } from '@/hooks';
import useNavigate from '@/hooks/useNavigate.hook';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Grid } from '@mui/material';
import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Fragment } from 'react/jsx-runtime';
import ConfirmModal from '../base/Modal/ConfirmModal';
import AppHeader from './AppHeader/AppHeader';
import { LayoutStyled } from './Layout.styled';
import CenterContainer from './MainContainer/CenterContainer';
import EndContainer from './MainContainer/EndContainer';
import ExplorerContainer from './MainContainer/ExplorerContainer';
import StartContainer from './MainContainer/StartContainer';

export default function Layout() {
  const windowSize = useWindowSize(true);
  const done = useSetupDesktop();
  const { sidebar } = useSettingStore();
  const { getTabs, getSelectedTab } = useTabStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams, _] = useSearchParams();
  const { updateSelectedTab, tabs } = useTabStore();
  const { updateCurrentConnection, updateConnections, connections } = useConnectionStore();

  async function parseParams() {
    const tabId = searchParams.get('tabId');
    const connectionId = searchParams.get('connectionId');
    let connectionList = connections;
    if (!connectionList) {
      connectionList = await getConnectionList();
    }
    updateConnections(connectionList);

    if (!tabId || tabId === '') {
      return;
    }

    if (!connectionId || connectionId === '') {
      return;
    }

    //check connection id is valid
    const currentConnection = connectionList?.find((c) => c.id === Number(connectionId));
    if (!currentConnection || !tabs[connectionId]) {
      updateCurrentConnection(undefined);
      navigate({ route: '/', connectionId: undefined, tabId: undefined });
      return;
    }

    //find selected tab
    const selectedTab = tabs[connectionId]?.find((t) => t.id === tabId);
    if (!selectedTab) {
      navigate({ route: '/', connectionId: undefined, tabId: undefined });
      return;
    }

    updateSelectedTab(selectedTab);
  }

  useEffect(() => {
    parseParams();
  }, [location]);

  return done ? (
    <Fragment>
      <LayoutStyled maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
        <ConfirmModal />
        <AppHeader />
        <Grid container spacing={0}>
          <Grid>
            <StartContainer />
          </Grid>
          {sidebar.showLeft && (
            <Grid>
              <ExplorerContainer />
            </Grid>
          )}
          <Grid flex={1} minWidth={0}>
            <CenterContainer selectedTab={getSelectedTab()} tabs={getTabs()} />
          </Grid>
          {sidebar.showRight && (
            <Grid>
              <EndContainer />
            </Grid>
          )}
        </Grid>
      </LayoutStyled>
    </Fragment>
  ) : null;
}
