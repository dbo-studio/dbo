import { useMemo } from 'react';
import { useSearchParams, useNavigate as use_navigate } from 'react-router-dom';

export type NavigationParamsType = {
  tabId?: string;
  connectionId?: number;
  route?: 'data' | 'query' | 'design' | '/' | '404';
};

export default function useNavigate() {
  const [searchParams, setSearchParams] = useSearchParams();
  const routeNavigate = use_navigate();

  return useMemo(
    () => (route: NavigationParamsType) => {
      if (route.route === '404') {
        routeNavigate('/404');
        return;
      }

      const params = { ...Object.fromEntries([...searchParams]) };

      if (route.connectionId) {
        params.connectionId = String(route.connectionId);
      }

      if (route.route === '/') {
        routeNavigate('/');
        setSearchParams({
          connectionId: params.connectionId
        });
        return;
      }

      if (route.tabId || route.tabId === '') {
        params.tabId = route.tabId;
      }

      if (route.route && route.route.length > 0) {
        routeNavigate(`/${route.route}`);
      }

      setSearchParams(params);
    },
    [searchParams, routeNavigate]
  );
}
