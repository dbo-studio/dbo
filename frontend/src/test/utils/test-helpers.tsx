import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderOptions, render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';


import {
  createConfirmModalStoreMock,
  createConnectionStoreMock,
  createDataStoreMock,
  createSettingStoreMock,
  createTabStoreMock,
  createTreeStoreMock
} from '../mocks/stores';

// Create a fresh QueryClient for each test
const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        staleTime: Number.POSITIVE_INFINITY
      },
      mutations: {
        retry: false
      }
    }
  });

// Simple test wrapper
interface TestWrapperProps {
  children: ReactNode;
}

export function TestWrapper({ children }: TestWrapperProps): ReactElement {
  const queryClient = createTestQueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

// Enhanced render function with store mocks
export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}): ReturnType<typeof render> {
  return render(ui, {
    wrapper: TestWrapper,
    ...options
  });
}

// Store mock setup helpers using vi.spyOn
export const setupStoreMocks = {
  settingStore: async (overrides = {}): Promise<any> => {
    const settingStore = await import('../../store/settingStore/setting.store.ts');
    const mock = createSettingStoreMock(overrides);
    vi.spyOn(settingStore, 'useSettingStore').mockReturnValue(mock);
    return mock;
  },
  dataStore: async (overrides = {}): Promise<any> => {
    const dataStore = await import('../../store/dataStore/data.store.ts');
    vi.spyOn(dataStore, 'useDataStore').mockReturnValue(createDataStoreMock(overrides));
  },
  tabStore: async (overrides = {}): Promise<any> => {
    const tabStore = await import('../../store/tabStore/tab.store.ts');
    vi.spyOn(tabStore, 'useTabStore').mockReturnValue(createTabStoreMock(overrides));
  },
  treeStore: async (overrides = {}): Promise<any> => {
    const treeStore = await import('../../store/treeStore/tree.store.ts');
    vi.spyOn(treeStore, 'useTreeStore').mockReturnValue(createTreeStoreMock(overrides));
  },
  connectionStore: async (overrides = {}): Promise<any> => {
    const connectionStore = await import('../../store/connectionStore/connection.store.ts');
    vi.spyOn(connectionStore, 'useConnectionStore').mockReturnValue(createConnectionStoreMock(overrides));
  },
  confirmModalStore: async (overrides = {}): Promise<any> => {
    const confirmModalStore = await import('../../store/confirmModal/confirmModal.store.ts');
    vi.spyOn(confirmModalStore, 'useConfirmModalStore').mockReturnValue(createConfirmModalStoreMock(overrides));
  }
};

export const createMockData = {
  tableData: (
    rows = 5,
    columns = 3
  ): {
    rows: { id: number; name: string; value: number; date: string }[];
    columns: { id: string; name: string; type: string; isActive: boolean }[];
  } => ({
    rows: Array.from({ length: rows }, (_, i) => ({
      id: i + 1,
      name: `Row ${i + 1}`,
      value: Math.random() * 100,
      date: new Date().toISOString()
    })),
    columns: Array.from({ length: columns }, (_, i) => ({
      id: `col_${i}`,
      name: `Column ${i + 1}`,
      type: 'string',
      isActive: true
    }))
  }),

  connection: (
    id = 1
  ): {
    id: number;
    name: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    type: string;
  } => ({
    id,
    name: `Connection ${id}`,
    host: 'localhost',
    port: 5432,
    database: 'testdb',
    username: 'testuser',
    password: 'testpass',
    type: 'postgresql'
  }),

  tab: (
    id = 'tab1',
    title = 'Test Tab'
  ): { id: string; title: string; type: string; query: string; filters: any[]; sorts: any[]; columns: any[] } => ({
    id,
    title,
    type: 'table',
    query: 'SELECT * FROM test',
    filters: [],
    sorts: [],
    columns: []
  }),

  treeNode: (
    id = 'node1',
    name = 'Test Node'
  ): { id: string; name: string; type: string; children: any[]; isExpanded: boolean } => ({
    id,
    name,
    type: 'table',
    children: [],
    isExpanded: false
  })
};

export const waitFor = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const mockApiResponse = {
  success: <T,>(data: T): Promise<{ data: T; status: number }> => Promise.resolve({ data, status: 200 }),
  error: (message = 'API Error', status = 500): Promise<never> => Promise.reject({ message, status })
};

export const createSpy = <T extends (...args: any[]) => any>(fn?: T): ReturnType<typeof vi.fn> => vi.fn(fn);

export const resetAllMocks = (): void => {
  vi.clearAllMocks();
  vi.resetAllMocks();
  vi.restoreAllMocks();
};

export const mockWindowProperty = (property: string, value: any): (() => void) => {
  const originalProperty = (window as any)[property];
  delete (window as any)[property];
  (window as any)[property] = value;

  return (): void => {
    delete (window as any)[property];
    if (originalProperty !== undefined) {
      (window as any)[property] = originalProperty;
    }
  };
};

export const createTestUser = (): { id: number; name: string; email: string; role: string } => {
  return {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'user'
  };
};

export const createTestEnvironment = (): { cleanup: () => void; addCleanup: (fn: () => void) => void } => {
  const cleanupFunctions: (() => void)[] = [];

  return {
    cleanup: (): void => {
      for (const fn of cleanupFunctions) {
        fn();
      }
      cleanupFunctions.length = 0;
    },
    addCleanup: (fn: () => void): void => {
      cleanupFunctions.push(fn);
    }
  };
};

export const setupDOMMocks = (): void => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(document, 'createRange', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      setStart: vi.fn(),
      setEnd: vi.fn(),
      commonAncestorContainer: {
        nodeName: 'BODY',
        ownerDocument: document,
      },
      cloneRange: vi.fn().mockReturnValue({
        setStart: vi.fn(),
        setEnd: vi.fn(),
        commonAncestorContainer: {
          nodeName: 'BODY',
          ownerDocument: document,
        },
      }),
    })),
  });

  Object.defineProperty(window, 'getSelection', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      removeAllRanges: vi.fn(),
      addRange: vi.fn(),
      toString: vi.fn().mockReturnValue(''),
    })),
  });
};

export function createZustandSelectorMock<T extends object>(state: T): (selector: (s: T) => any) => any {
  // biome-ignore lint/nursery/useExplicitType: <explanation>
  return (selector: (s: T) => any) => selector(state);
}
