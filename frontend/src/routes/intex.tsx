import BaseLayout from '@/components/layout/BaseLayout.tsx';
import { type JSX, createElement } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import NotFound from './404/404';
import Data from './Data/Data';
import Design from './Design/Design';
import ObjectFormDetail from './ObjectDetail/ObjectDetail';
import ObjectForm from './ObjectForm/ObjectForm';
import Query from './Query/Query';

export const router = createBrowserRouter([
  {
    path: '*',
    element: <NotFound />
  },
  {
    path: '/',
    element: <BaseLayout />,
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
        path: 'object',
        element: <ObjectForm />
      },
      {
        path: 'object-detail',
        element: <ObjectFormDetail />
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
