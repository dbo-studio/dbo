import type { ColumnType, EditedRow, RowType } from '@/types';
import { indexedDBService } from '../indexedDB/indexedDB.service';

export const debouncedSaveToIndexedDB = async (
  tabId: string,
  rows: RowType[],
  columns: ColumnType[]
): Promise<void> => {
  if (!tabId) return;
  try {
    await Promise.all([indexedDBService.saveRows(tabId, rows), indexedDBService.saveColumns(tabId, columns)]);
  } catch (error) {
    console.error('Error saving data to IndexedDB:', error);
  }
};

export const debouncedSaveRows = async (tabId: string, rows: RowType[]): Promise<void> => {
  if (!tabId) return;
  try {
    await indexedDBService.saveRows(tabId, rows);
  } catch (error) {
    console.error('Error saving rows to IndexedDB:', error);
  }
};

export const debouncedSaveColumns = async (tabId: string, columns: ColumnType[]): Promise<void> => {
  if (!tabId) return;
  try {
    await indexedDBService.saveColumns(tabId, columns);
  } catch (error) {
    console.error('Error saving columns to IndexedDB:', error);
  }
};

export const debouncedSaveEditedAndUnsaved = async (
  tabId: string,
  editedRowsToSave: EditedRow[],
  unsavedRowsToSave: RowType[]
): Promise<void> => {
  if (!tabId) return;
  try {
    await Promise.all([
      indexedDBService.saveEditedRows(tabId, editedRowsToSave),
      indexedDBService.saveUnsavedRows(tabId, unsavedRowsToSave)
    ]);
  } catch (error) {
    console.error('Error saving edited and unsaved rows to IndexedDB:', error);
  }
};

export const debouncedSaveRowsAndEditedRows = async (
  tabId: string,
  rowsToSave: RowType[],
  editedRowsToSave: EditedRow[]
): Promise<void> => {
  if (!tabId) return;
  try {
    await Promise.all([
      indexedDBService.saveRows(tabId, rowsToSave),
      indexedDBService.saveEditedRows(tabId, editedRowsToSave)
    ]);
  } catch (error) {
    console.error('Error saving rows and edited rows to IndexedDB:', error);
  }
};

export const debouncedSaveRemovedRows = async (tabId: string, removedRowsToSave: RowType[]): Promise<void> => {
  if (!tabId) return;
  try {
    await indexedDBService.saveRemovedRows(tabId, removedRowsToSave);
  } catch (error) {
    console.error('Error saving removed rows to IndexedDB:', error);
  }
};

export const debouncedSaveRowsAndRemovedRows = async (
  tabId: string,
  rowsToSave: RowType[],
  removedRowsToSave: RowType[]
): Promise<void> => {
  if (!tabId) return;
  try {
    await Promise.all([
      indexedDBService.saveRows(tabId, rowsToSave),
      indexedDBService.saveRemovedRows(tabId, removedRowsToSave)
    ]);
  } catch (error) {
    console.error('Error saving rows and removed rows to IndexedDB:', error);
  }
};

export const debouncedSaveUnsavedRows = async (tabId: string, unsavedRowsToSave: RowType[]): Promise<void> => {
  if (!tabId) return;
  try {
    await indexedDBService.saveUnsavedRows(tabId, unsavedRowsToSave);
  } catch (error) {
    console.error('Error saving unsaved rows to IndexedDB:', error);
  }
};
