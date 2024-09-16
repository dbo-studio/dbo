import Layout from '@/components/layout/Layout';
import { createElement } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import Data from './Data/Data';
import Design from './Design/Design';
import Query from './Query/Query';

export const router = createBrowserRouter([
  {
    path: '',
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
