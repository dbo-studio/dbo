import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNavigate as use_navigate } from 'react-router-dom';

export type NavigationParamsType = {
  tabId?: string;
  connectionId?: number;
  route?: 'data' | 'query' | 'design' | '/';
};

export default function useNavigate() {
  const [searchParams, setSearchParams] = useSearchParams();
  const routeNavigate = use_navigate();

  const navigate = useMemo(
    () => (route: NavigationParamsType) => {
      const params = { ...Object.fromEntries([...searchParams]) };

      if (route.tabId) {
        params.tabId = route.tabId;
      }

      if (route.connectionId) {
        params.connectionId = String(route.connectionId);
      }

      if (route.route === '/') {
        params.tabId = '';
      }

      if (route.route) {
        routeNavigate(route.route);
      }

      setSearchParams(params);
    },
    [searchParams, routeNavigate]
  );

  return navigate;
}
