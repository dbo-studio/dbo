import type { ColumnType, RowType } from '@/types';
import { debounce } from 'lodash';
import { indexedDBService } from '../indexedDB/indexedDB.service';

export const debouncedSaveToIndexedDB = debounce(
  async (tabId: string, rows: RowType[], columns: ColumnType[]): Promise<void> => {
    if (!tabId) return;
    try {
      await Promise.all([indexedDBService.saveRows(tabId, rows), indexedDBService.saveColumns(tabId, columns)]);
    } catch (error) {
      console.error('Error saving data to IndexedDB:', error);
    }
  },
  300
);

export const debouncedSaveRows = debounce(async (tabId: string, rows: RowType[]): Promise<void> => {
  if (!tabId) return;
  try {
    await indexedDBService.saveRows(tabId, rows);
  } catch (error) {
    console.error('Error saving rows to IndexedDB:', error);
  }
}, 300);

export const debouncedSaveColumns = debounce(async (tabId: string, columns: ColumnType[]): Promise<void> => {
  if (!tabId) return;
  try {
    await indexedDBService.saveColumns(tabId, columns);
  } catch (error) {
    console.error('Error saving columns to IndexedDB:', error);
  }
}, 300);
