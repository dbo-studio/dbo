import { getConnectionList } from '@/api/connection';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import useNavigate from './useNavigate.hook';

export const useParamParser = () => {
  const { getTabs, getSelectedTab } = useTabStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams, _] = useSearchParams();
  const { updateSelectedTab, tabs } = useTabStore();
  const { updateCurrentConnection, updateConnections, connections } = useConnectionStore();

  async function parseParams() {
    console.log(location);
    const tabId = searchParams.get('tabId');
    const connectionId = searchParams.get('connectionId');
    let connectionList = connections;
    if (!connectionList) {
      connectionList = await getConnectionList();
      updateConnections(connectionList);
    }

    if (!connectionId || connectionId === '') {
      return;
    }

    if (!tabId || tabId === '') {
      if (getSelectedTab()) {
        navigate({ route: getSelectedTab()?.mode, tabId: getSelectedTab()?.id });
        return;
      }

      if (getTabs().length > 0) {
        const tab = getTabs()[0];
        navigate({ route: tab.mode, tabId: tab.id });
        return;
      }
      return;
    }

    //check connection id is valid
    const currentConnection = connectionList?.find((c) => c.id === Number(connectionId));
    if (!currentConnection || !tabs[connectionId]) {
      updateCurrentConnection(undefined);
      navigate({ route: '/' });
      return;
    }

    //find selected tab
    const selectedTab = tabs[connectionId]?.find((t) => t.id === tabId);
    if (!selectedTab) {
      navigate({ route: '/' });
      return;
    }

    if (!getSelectedTab() || getSelectedTab()?.id !== tabId) {
      updateSelectedTab(selectedTab);
    }
  }

  useEffect(() => {
    parseParams().then();
  }, [location]);
};
