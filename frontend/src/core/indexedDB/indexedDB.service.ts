import type { SelectedRow } from '@/store/dataStore/types';
import type { ColumnType, EditedRow, RowType } from '@/types';
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

// Define the database schema
interface TableDataDB extends DBSchema {
  rows: {
    key: string; // tabId + rowIndex
    value: {
      tabId: string;
      rowIndex: number;
      data: RowType;
    };
    indexes: { 'by-tab': string };
  };
  columns: {
    key: string; // tabId
    value: {
      tabId: string;
      columns: ColumnType[];
    };
  };
  editedRows: {
    key: string; // tabId + rowIndex
    value: {
      tabId: string;
      rowIndex: number;
      data: EditedRow;
    };
    indexes: { 'by-tab': string };
  };
  removedRows: {
    key: string; // tabId + rowIndex
    value: {
      tabId: string;
      rowIndex: number;
      data: RowType;
    };
    indexes: { 'by-tab': string };
  };
  unsavedRows: {
    key: string; // tabId + rowIndex
    value: {
      tabId: string;
      rowIndex: number;
      data: RowType;
    };
    indexes: { 'by-tab': string };
  };
  selectedRows: {
    key: string; // tabId + rowIndex
    value: {
      tabId: string;
      rowIndex: number;
      data: SelectedRow;
    };
    indexes: { 'by-tab': string };
  };
}

class IndexedDBService {
  private dbPromise: Promise<IDBPDatabase<TableDataDB>> | null = null;
  private readonly DB_NAME = 'table-data-db';
  private readonly DB_VERSION = 1;

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<IDBPDatabase<TableDataDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<TableDataDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db): void {
          // Create stores with indexes
          if (!db.objectStoreNames.contains('rows')) {
            const rowsStore = db.createObjectStore('rows', { keyPath: 'key' });
            rowsStore.createIndex('by-tab', 'tabId');
          }

          if (!db.objectStoreNames.contains('columns')) {
            db.createObjectStore('columns', { keyPath: 'tabId' });
          }

          if (!db.objectStoreNames.contains('editedRows')) {
            const editedRowsStore = db.createObjectStore('editedRows', { keyPath: 'key' });
            editedRowsStore.createIndex('by-tab', 'tabId');
          }

          if (!db.objectStoreNames.contains('removedRows')) {
            const removedRowsStore = db.createObjectStore('removedRows', { keyPath: 'key' });
            removedRowsStore.createIndex('by-tab', 'tabId');
          }

          if (!db.objectStoreNames.contains('unsavedRows')) {
            const unsavedRowsStore = db.createObjectStore('unsavedRows', { keyPath: 'key' });
            unsavedRowsStore.createIndex('by-tab', 'tabId');
          }

          if (!db.objectStoreNames.contains('selectedRows')) {
            const selectedRowsStore = db.createObjectStore('selectedRows', { keyPath: 'key' });
            selectedRowsStore.createIndex('by-tab', 'tabId');
          }
        }
      });
    }
    return this.dbPromise;
  }

  // Rows operations
  async saveRows(tabId: string, rows: RowType[]): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction('rows', 'readwrite');

    // First, delete all existing rows for this tab
    const tabRowsIndex = tx.store.index('by-tab');
    let cursor = await tabRowsIndex.openCursor(IDBKeyRange.only(tabId));

    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    // Then add the new rows
    for (const row of rows) {
      const key = `${tabId}-${row.dbo_index}`;
      await tx.store.put({
        key,
        tabId,
        rowIndex: row.dbo_index,
        data: row
      });
    }
    await tx.done;
  }

  async getRows(tabId: string): Promise<RowType[]> {
    const db = await this.initDB();
    const tabRowsIndex = db.transaction('rows').store.index('by-tab');
    const tabRows = await tabRowsIndex.getAll(IDBKeyRange.only(tabId));

    // Sort by rowIndex to maintain order
    return tabRows.sort((a, b) => a.rowIndex - b.rowIndex).map((item) => item.data);
  }

  // Columns operations
  async saveColumns(tabId: string, columns: ColumnType[]): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction('columns', 'readwrite');
    await tx.store.put({
      tabId,
      columns
    });
    await tx.done;
  }

  async getColumns(tabId: string): Promise<ColumnType[]> {
    const db = await this.initDB();
    const result = await db.transaction('columns').store.get(tabId);
    return result?.columns || [];
  }

  // Edited rows operations
  async saveEditedRows(tabId: string, rows: EditedRow[]): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction('editedRows', 'readwrite');

    // First, delete all existing edited rows for this tab
    const tabRowsIndex = tx.store.index('by-tab');
    let cursor = await tabRowsIndex.openCursor(IDBKeyRange.only(tabId));

    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    // Then add the new edited rows
    for (const row of rows) {
      const key = `${tabId}-${row.dboIndex}`;
      await tx.store.put({
        key,
        tabId,
        rowIndex: row.dboIndex,
        data: row
      });
    }

    await tx.done;
  }

  async getEditedRows(tabId: string): Promise<EditedRow[]> {
    const db = await this.initDB();
    const tabRowsIndex = db.transaction('editedRows').store.index('by-tab');
    const tabRows = await tabRowsIndex.getAll(IDBKeyRange.only(tabId));

    return tabRows.map((item) => item.data);
  }

  // Removed rows operations
  async saveRemovedRows(tabId: string, rows: RowType[]): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction('removedRows', 'readwrite');

    // First, delete all existing removed rows for this tab
    const tabRowsIndex = tx.store.index('by-tab');
    let cursor = await tabRowsIndex.openCursor(IDBKeyRange.only(tabId));

    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    // Then add the new removed rows
    for (const row of rows) {
      const key = `${tabId}-${row.dbo_index}`;
      await tx.store.put({
        key,
        tabId,
        rowIndex: row.dbo_index,
        data: row
      });
    }

    await tx.done;
  }

  async getRemovedRows(tabId: string): Promise<RowType[]> {
    const db = await this.initDB();
    const tabRowsIndex = db.transaction('removedRows').store.index('by-tab');
    const tabRows = await tabRowsIndex.getAll(IDBKeyRange.only(tabId));

    return tabRows.map((item) => item.data);
  }

  // Unsaved rows operations
  async saveUnsavedRows(tabId: string, rows: RowType[]): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction('unsavedRows', 'readwrite');

    // First, delete all existing unsaved rows for this tab
    const tabRowsIndex = tx.store.index('by-tab');
    let cursor = await tabRowsIndex.openCursor(IDBKeyRange.only(tabId));

    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    // Then add the new unsaved rows
    for (const row of rows) {
      const key = `${tabId}-${row.dbo_index}`;
      await tx.store.put({
        key,
        tabId,
        rowIndex: row.dbo_index,
        data: row
      });
    }
    await tx.done;
  }

  async getUnsavedRows(tabId: string): Promise<RowType[]> {
    const db = await this.initDB();
    const tabRowsIndex = db.transaction('unsavedRows').store.index('by-tab');
    const tabRows = await tabRowsIndex.getAll(IDBKeyRange.only(tabId));

    return tabRows.map((item) => item.data);
  }

  // Selected rows operations
  async saveSelectedRows(tabId: string, rows: SelectedRow[]): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction('selectedRows', 'readwrite');

    // First, delete all existing selected rows for this tab
    const tabRowsIndex = tx.store.index('by-tab');
    let cursor = await tabRowsIndex.openCursor(IDBKeyRange.only(tabId));

    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    // Then add the new selected rows
    for (const row of rows) {
      const key = `${tabId}-${row.index}`;
      await tx.store.put({
        key,
        tabId,
        rowIndex: row.index,
        data: row
      });
    }

    await tx.done;
  }

  async getSelectedRows(tabId: string): Promise<SelectedRow[]> {
    const db = await this.initDB();
    const tabRowsIndex = db.transaction('selectedRows').store.index('by-tab');
    const tabRows = await tabRowsIndex.getAll(IDBKeyRange.only(tabId));

    return tabRows.map((item) => item.data);
  }

  // Clear data for a specific tab
  async clearTabData(tabId: string): Promise<void> {
    const db = await this.initDB();

    // Clear rows
    const rowsTx = db.transaction('rows', 'readwrite');
    const rowsIndex = rowsTx.store.index('by-tab');
    let cursor = await rowsIndex.openCursor(IDBKeyRange.only(tabId));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await rowsTx.done;

    // Clear columns
    const columnsTx = db.transaction('columns', 'readwrite');
    await columnsTx.store.delete(tabId);
    await columnsTx.done;

    // Clear edited rows
    const editedRowsTx = db.transaction('editedRows', 'readwrite');
    const editedRowsIndex = editedRowsTx.store.index('by-tab');
    let editedRowsCursor = await editedRowsIndex.openCursor(IDBKeyRange.only(tabId));
    while (editedRowsCursor) {
      await editedRowsCursor.delete();
      editedRowsCursor = await editedRowsCursor.continue();
    }
    await editedRowsTx.done;

    // Clear removed rows
    const removedRowsTx = db.transaction('removedRows', 'readwrite');
    const removedRowsIndex = removedRowsTx.store.index('by-tab');
    let removedRowsCursor = await removedRowsIndex.openCursor(IDBKeyRange.only(tabId));
    while (removedRowsCursor) {
      await removedRowsCursor.delete();
      removedRowsCursor = await removedRowsCursor.continue();
    }
    await removedRowsTx.done;

    // Clear unsaved rows
    const unsavedRowsTx = db.transaction('unsavedRows', 'readwrite');
    const unsavedRowsIndex = unsavedRowsTx.store.index('by-tab');
    let unsavedRowsCursor = await unsavedRowsIndex.openCursor(IDBKeyRange.only(tabId));
    while (unsavedRowsCursor) {
      await unsavedRowsCursor.delete();
      unsavedRowsCursor = await unsavedRowsCursor.continue();
    }
    await unsavedRowsTx.done;

    // Clear selected rows
    const selectedRowsTx = db.transaction('selectedRows', 'readwrite');
    const selectedRowsIndex = selectedRowsTx.store.index('by-tab');
    let selectedRowsCursor = await selectedRowsIndex.openCursor(IDBKeyRange.only(tabId));
    while (selectedRowsCursor) {
      await selectedRowsCursor.delete();
      selectedRowsCursor = await selectedRowsCursor.continue();
    }
    await selectedRowsTx.done;
  }

  // Clear all data from all object stores
  async clearAllTableData(): Promise<void> {
    const db = await this.initDB();
    // List of all object stores to clear
    const stores = ['rows', 'columns', 'editedRows', 'removedRows', 'unsavedRows', 'selectedRows'] as const;
    await Promise.all(
      stores.map(async (store) => {
        const tx = db.transaction(store, 'readwrite');
        await tx.store.clear();
        await tx.done;
      })
    );
  }
}

// Export a singleton instance
export const indexedDBService = new IndexedDBService();
