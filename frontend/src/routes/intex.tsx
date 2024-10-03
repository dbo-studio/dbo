import Layout from '@/components/layout/Layout';
import { createElement } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import NotFound from './404/404';
import Data from './Data/Data';
import Design from './Design/Design';
import Query from './Query/Query';
import Settings from './Settings/Settings';

export const router = createBrowserRouter([
  {
    path: '*',
    element: <NotFound />
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: 'data',
        element: <Data />
      },
      {
        path: 'query',
        element: <Query />
      },
      {
        path: 'design',
        element: <Design />
      },
      {
        path: 'settings',
        element: <Settings />
      }
    ]
  }
]);

export function Router(): JSX.Element {
  return createElement(RouterProvider, { router });
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => router.dispose());
}
