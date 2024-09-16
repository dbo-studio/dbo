import { getConnectionList } from '@/api/connection';
import Layout from '@/components/layout/Layout';
import LayoutParamParserRoute from '@/components/middleware/LayoutParamParserRoute';
import { createElement } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import Data from './Data/Data';
import Design from './Design/Design';
import Query from './Query/Query';

export const router = createBrowserRouter([
  {
    path: '',
    element: (
      <LayoutParamParserRoute>
        <Layout />
      </LayoutParamParserRoute>
    ),
    loader: async () => {
      return await getConnectionList();
    },
    children: [
      {
        path: 'data',
        element: <Data />
        // loader: async () => {
        //   return await getConnectionList();
        // }
      },
      {
        path: 'query',
        element: <Query />
        // loader: async () => {
        //   return await getConnectionList();
        // }
      },
      {
        path: 'design',
        element: <Design />
        // loader: async () => {
        //   return await getConnectionList();
        // }
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
