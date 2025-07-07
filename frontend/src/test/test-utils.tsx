import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

import type { JSX, ReactNode } from 'react';

// Create a fresh QueryClient for each test
const createTestQueryClient = (): QueryClient => new QueryClient({
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
  const queryClient = createTestQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function renderWithProviders(ui: ReactNode, options = {}): any {
  return render(ui, { wrapper: TestWrapper, ...options });
}

// Re-export from new test helpers for backward compatibility
export {
  createMockData, createSpy, createTestEnvironment, createTestUser, mockApiResponse,
  mockWindowProperty, resetAllMocks, setupStoreMocks, waitFor
} from './utils/test-helpers.tsx';

