import { tools } from '@/core/utils';
import type { StateCreator } from 'zustand';
import type { TabQuerySlice, TabStore } from '../types';

const STORAGE_KEY = 'dbo_tab_queries';

const getStoredQueries = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const setStoredQueries = (queries: Record<string, string>): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
  } catch (error) {
    console.error('Failed to store queries:', error);
  }
};

export const createTabQuerySlice: StateCreator<TabStore & TabQuerySlice, [], [], TabQuerySlice> = (_, get) => ({
  getQuery: (tabId?: string): string => {
    const tab = tabId ?? get().selectedTabId;
    if (!tab) return '';

    const storedQueries = getStoredQueries();
    const storedQuery = storedQueries[tab];

    if (storedQuery && tools.isValidJSON(storedQuery)) {
      return JSON.parse(storedQuery);
    }

    return storedQuery ?? '';
  },
  updateQuery: (query: string): void => {
    const tabId = get().selectedTabId;
    if (!tabId) return;

    const storedQueries = getStoredQueries();
    storedQueries[tabId] = query;
    setStoredQueries(storedQueries);
  },
  removeQuery: (tabId: string): void => {
    const storedQueries = getStoredQueries();
    delete storedQueries[tabId];
    setStoredQueries(storedQueries);
  },
  clearStoredQueries: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  }
});
