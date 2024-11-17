import { getConnectionList } from '@/api/connection';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import axios from 'axios';
import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import useNavigate from './useNavigate.hook';

export const useParamParser = () => {
  const { getTabs, getSelectedTab } = useTabStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams, _] = useSearchParams();
  const { updateSelectedTab, tabs, reset } = useTabStore();
  const { updateCurrentConnection, updateConnections, connections, updateLoading } = useConnectionStore();

  async function parseParams() {
    const tabId = searchParams.get('tabId');
    const connectionId = searchParams.get('connectionId');
    let connectionList = connections;
    if (!connectionList) {
      updateLoading('loading');
      try {
        connectionList = await getConnectionList();
        updateConnections(connectionList);
        updateLoading('finished');
      } catch (e) {
        updateLoading('error');
        if (axios.isAxiosError(e)) {
          toast.error(e.message);
        }
        console.log('🚀 ~ parseParams ~ err:', e);
      }
    }

    if (!connectionId || connectionId === '') {
      return;
    }

    if (!connectionList || connectionList.length === 0) {
      console.log('adasd');
      reset();
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
