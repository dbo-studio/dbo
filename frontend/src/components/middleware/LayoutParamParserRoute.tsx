import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ConnectionType } from '@/types';
import { useEffect, useState } from 'react';
import { Navigate, useLoaderData, useLocation, useSearchParams } from 'react-router-dom';

export default function ParamParserRoute({ children }: { children: JSX.Element }) {
  const [searchParams, _] = useSearchParams();
  const location = useLocation();
  const { updateSelectedTab, tabs } = useTabStore();
  const { updateCurrentConnection, updateConnections } = useConnectionStore();
  const [isValidRoute, setIsValidRoute] = useState(true);
  const connections = useLoaderData() as ConnectionType[];

  function parseParams() {
    const tabId = searchParams.get('tabId');
    const connectionId = searchParams.get('connectionId');

    if (!tabId || tabId === '') {
      setIsValidRoute(false);
      return;
    }

    if (!connectionId || connectionId === '') {
      setIsValidRoute(false);
      return;
    }

    //check connection id is valid
    const currentConnection = connections?.find((c) => c.id === Number(connectionId));
    if (!currentConnection || !Object.prototype.hasOwnProperty.call(tabs, connectionId)) {
      setIsValidRoute(false);
      return;
    }

    //find selected tab
    const connectionTabs = tabs[connectionId];
    const selectedTab = connectionTabs.find((t) => t.id === tabId);
    if (!selectedTab) {
      setIsValidRoute(false);
      return;
    }

    updateSelectedTab(selectedTab);
    updateCurrentConnection(currentConnection);
    updateConnections(connections);
  }

  useEffect(() => {
    parseParams();
  }, [location]);

  useEffect(() => {
    parseParams();
  }, []);

  return isValidRoute ? children : <Navigate to={'/'} />;
}
