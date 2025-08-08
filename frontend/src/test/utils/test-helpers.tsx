import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderOptions, render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';
import * as confirmModalStore from '../../store/confirmModal/confirmModal.store.ts';
import * as connectionStore from '../../store/connectionStore/connection.store.ts';
import * as dataStore from '../../store/dataStore/data.store.ts';
import * as settingStore from '../../store/settingStore/setting.store.ts';
import * as tabStore from '../../store/tabStore/tab.store.ts';
import * as treeStore from '../../store/treeStore/tree.store.ts';

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
  settingStore: (overrides = {}): any => {
    const mock = createSettingStoreMock(overrides as any);
    vi.spyOn(settingStore, 'useSettingStore').mockImplementation(
      createZustandSelectorMock(mock) as unknown as typeof settingStore.useSettingStore
    );
    return mock;
  },
  dataStore: (overrides = {}): any => {
    // Backward-compat mapping for legacy overrides
    const mapped = { ...overrides } as any;
    if (mapped.getColumns && !mapped.columns) {
      try {
        mapped.columns = mapped.getColumns();
      } catch {}
    }
    if (mapped.getSelectedRows && !mapped.selectedRows) {
      try {
        const legacyRows = mapped.getSelectedRows();
        mapped.selectedRows = Array.isArray(legacyRows)
          ? legacyRows.map((r: any) => ({
              index: r.index,
              selectedColumn: r.selectedColumn ?? '',
              row: r.data ?? r.row
            }))
          : [];
      } catch {}
    }
    const mock = createDataStoreMock(mapped);
    vi.spyOn(dataStore, 'useDataStore').mockImplementation(
      createZustandSelectorMock(mock) as unknown as typeof dataStore.useDataStore
    );
    return mock;
  },
  tabStore: (overrides = {}): any => {
    const mock = createTabStoreMock(overrides as any);
    vi.spyOn(tabStore, 'useTabStore').mockImplementation(
      createZustandSelectorMock(mock) as unknown as typeof tabStore.useTabStore
    );
    return mock;
  },
  treeStore: (overrides = {}): any => {
    const mock = createTreeStoreMock(overrides as any);
    vi.spyOn(treeStore, 'useTreeStore').mockImplementation(
      createZustandSelectorMock(mock) as unknown as typeof treeStore.useTreeStore
    );
    return mock;
  },
  connectionStore: (overrides = {}): any => {
    const mock = createConnectionStoreMock(overrides as any);
    vi.spyOn(connectionStore, 'useConnectionStore').mockImplementation(
      createZustandSelectorMock(mock) as unknown as typeof connectionStore.useConnectionStore
    );
    return mock;
  },
  confirmModalStore: (overrides = {}): any => {
    const mock = createConfirmModalStoreMock(overrides as any);
    vi.spyOn(confirmModalStore, 'useConfirmModalStore').mockImplementation(
      createZustandSelectorMock(mock) as unknown as typeof confirmModalStore.useConfirmModalStore
    );
    return mock;
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
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });

  Object.defineProperty(document, 'createRange', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      setStart: vi.fn(),
      setEnd: vi.fn(),
      commonAncestorContainer: {
        nodeName: 'BODY',
        ownerDocument: document
      },
      cloneRange: vi.fn().mockReturnValue({
        setStart: vi.fn(),
        setEnd: vi.fn(),
        commonAncestorContainer: {
          nodeName: 'BODY',
          ownerDocument: document
        }
      })
    }))
  });

  Object.defineProperty(window, 'getSelection', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      removeAllRanges: vi.fn(),
      addRange: vi.fn(),
      toString: vi.fn().mockReturnValue('')
    }))
  });
};

export function createZustandSelectorMock<T extends object>(state: T): unknown {
  // Return a function compatible with Zustand's hook signature: useStore(selector?, equalityFn?)
  return (selector?: (s: any) => any): any => {
    if (typeof selector === 'function') return selector(state as any);
    return state;
  };
}
