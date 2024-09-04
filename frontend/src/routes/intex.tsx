import Layout from '@/components/layout/Layout';
import { createElement } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Data from './Data/Data';
import Design from './Design/Design';
import Query from './Query/Query';

export const router = createBrowserRouter([
  {
    path: '',
    element: <Layout />,
    // errorElement: <RootError />,
    children: [
      { path: 'data/:tabId/:connectionId', element: <Data /> },
      { path: 'query/:tabId/:connectionId', element: <Query /> },
      { path: 'design/:tabId/:connectionId', element: <Design /> }
    ]
  }
]);

export function Router(): JSX.Element {
  return createElement(RouterProvider, { router });
}

// Clean up on module reload (HMR)
// https://vitejs.dev/guide/api-hmr
if (import.meta.hot) {
  import.meta.hot.dispose(() => router.dispose());
}

// ('query/{tabId}/{connectionid}');
// ('design/{tabId}/{connectionid}');
// ('design/{tabId}/{connectionid}/tables/create');
// ('data/{tabId}/{connectionid}');
// ('setting/{tabId}/');
