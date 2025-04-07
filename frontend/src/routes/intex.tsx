import BaseLayout from '@/components/layout/BaseLayout.tsx';
import { type JSX, createElement } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import NotFound from './404/404';

export const router = createBrowserRouter([
  {
    path: '*',
    element: <NotFound />
  },
  {
    path: '/',
    element: <BaseLayout />
  }
]);

export function Router(): JSX.Element {
  return createElement(RouterProvider, { router });
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => router.dispose());
}
