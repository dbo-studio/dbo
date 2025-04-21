import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

import type { JSX, ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false
    }
  }
});

interface TestWrapperProps {
  children: ReactNode;
  initialEntries?: string[];
}

export function TestWrapper({ children }: TestWrapperProps): JSX.Element {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function renderWithProviders(ui: ReactNode, options = {}): any {
  return render(ui, { wrapper: TestWrapper, ...options });
}
