import type { GridMetaType } from '@/api/query/types';
import { tableDataDbName } from '@/core/storage/userScope';
import type { SelectedRow } from '@/store/dataStore/types';
import type { ColumnType, EditedRow, RowType } from '@/types';
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

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
      gridMeta?: GridMetaType;
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
  tabQueries: {
    key: string; // tabId
    value: {
      tabId: string;
      query: string;
    };
  };
}

const TAB_QUERIES_STORAGE_KEY = 'dbo_tab_queries';

class IndexedDBService {
  private dbPromise: Promise<IDBPDatabase<TableDataDB>> | null = null;
  private dbName = tableDataDbName();
  private readonly DB_VERSION = 2;
  private tabQueryCache: Record<string, string> = {};
  private tabQueriesHydrated = false;
  private tabQueriesHydrating: Promise<void> | null = null;

  constructor() {
    this.initDB().catch(() => undefined);
    void this.hydrateTabQueries();
  }

  async setScope(userId?: string): Promise<void> {
    const nextName = tableDataDbName(userId);
    if (this.dbName === nextName) {
      return;
    }

    if (this.dbPromise) {
      const db = await this.dbPromise.catch(() => undefined);
      db?.close();
    }

    this.dbName = nextName;
    this.dbPromise = null;
    this.tabQueryCache = {};
    this.tabQueriesHydrated = false;
    this.tabQueriesHydrating = null;
    await this.initDB();
    await this.hydrateTabQueries();
  }

  private initDB(): Promise<IDBPDatabase<TableDataDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<TableDataDB>(this.dbName, this.DB_VERSION, {
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

          if (!db.objectStoreNames.contains('tabQueries')) {
            db.createObjectStore('tabQueries', { keyPath: 'tabId' });
          }
        }
      });
    }
    return this.dbPromise;
  }

  async saveRows(tabId: string, rows: RowType[]): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction('rows', 'readwrite');

    const tabRowsIndex = tx.store.index('by-tab');
    let cursor = await tabRowsIndex.openCursor(IDBKeyRange.only(tabId));

    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    for (const row of rows) {
      const key = `${tabId}-${row.dbo_index}`;
      await tx.store.put({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
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

    return tabRows.sort((a, b) => a.rowIndex - b.rowIndex).map((item) => item.data);
  }

  async saveColumns(tabId: string, columns: ColumnType[], gridMeta?: GridMetaType): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction('columns', 'readwrite');
    const existing = await tx.store.get(tabId);
    await tx.store.put({
      tabId,
      columns,
      gridMeta: gridMeta ?? existing?.gridMeta
    });
    await tx.done;
  }

  async saveGridMeta(tabId: string, gridMeta: GridMetaType): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction('columns', 'readwrite');
    const existing = await tx.store.get(tabId);
    await tx.store.put({
      tabId,
      columns: existing?.columns ?? [],
      gridMeta
    });
    await tx.done;
  }

  async getGridMeta(tabId: string): Promise<GridMetaType | undefined> {
    const db = await this.initDB();
    const result = await db.transaction('columns').store.get(tabId);
    return result?.gridMeta;
  }

  async getColumns(tabId: string): Promise<ColumnType[]> {
    const db = await this.initDB();
    const result = await db.transaction('columns').store.get(tabId);
    return result?.columns || [];
  }

  async saveEditedRows(tabId: string, rows: EditedRow[]): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction('editedRows', 'readwrite');

    const tabRowsIndex = tx.store.index('by-tab');
    let cursor = await tabRowsIndex.openCursor(IDBKeyRange.only(tabId));

    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    for (const row of rows) {
      const key = `${tabId}-${row.dboIndex}`;
      await tx.store.put({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-expect-error
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

  async saveRemovedRows(tabId: string, rows: RowType[]): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction('removedRows', 'readwrite');

    const tabRowsIndex = tx.store.index('by-tab');
    let cursor = await tabRowsIndex.openCursor(IDBKeyRange.only(tabId));

    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    for (const row of rows) {
      const key = `${tabId}-${row.dbo_index}`;
      await tx.store.put({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-expect-error
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

  async saveUnsavedRows(tabId: string, rows: RowType[]): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction('unsavedRows', 'readwrite');

    const tabRowsIndex = tx.store.index('by-tab');
    let cursor = await tabRowsIndex.openCursor(IDBKeyRange.only(tabId));

    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    for (const row of rows) {
      const key = `${tabId}-${row.dbo_index}`;
      await tx.store.put({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-expect-error
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

  async saveSelectedRows(tabId: string, rows: SelectedRow[]): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction('selectedRows', 'readwrite');

    const tabRowsIndex = tx.store.index('by-tab');
    let cursor = await tabRowsIndex.openCursor(IDBKeyRange.only(tabId));

    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    for (const row of rows) {
      const key = `${tabId}-${row.index}`;
      await tx.store.put({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-expect-error
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

  async clearTabData(tabId: string): Promise<void> {
    const db = await this.initDB();

    const rowsTx = db.transaction('rows', 'readwrite');
    const rowsIndex = rowsTx.store.index('by-tab');
    let cursor = await rowsIndex.openCursor(IDBKeyRange.only(tabId));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await rowsTx.done;

    const columnsTx = db.transaction('columns', 'readwrite');
    await columnsTx.store.delete(tabId);
    await columnsTx.done;

    const editedRowsTx = db.transaction('editedRows', 'readwrite');
    const editedRowsIndex = editedRowsTx.store.index('by-tab');
    let editedRowsCursor = await editedRowsIndex.openCursor(IDBKeyRange.only(tabId));
    while (editedRowsCursor) {
      await editedRowsCursor.delete();
      editedRowsCursor = await editedRowsCursor.continue();
    }
    await editedRowsTx.done;

    const removedRowsTx = db.transaction('removedRows', 'readwrite');
    const removedRowsIndex = removedRowsTx.store.index('by-tab');
    let removedRowsCursor = await removedRowsIndex.openCursor(IDBKeyRange.only(tabId));
    while (removedRowsCursor) {
      await removedRowsCursor.delete();
      removedRowsCursor = await removedRowsCursor.continue();
    }
    await removedRowsTx.done;

    const unsavedRowsTx = db.transaction('unsavedRows', 'readwrite');
    const unsavedRowsIndex = unsavedRowsTx.store.index('by-tab');
    let unsavedRowsCursor = await unsavedRowsIndex.openCursor(IDBKeyRange.only(tabId));
    while (unsavedRowsCursor) {
      await unsavedRowsCursor.delete();
      unsavedRowsCursor = await unsavedRowsCursor.continue();
    }
    await unsavedRowsTx.done;

    const selectedRowsTx = db.transaction('selectedRows', 'readwrite');
    const selectedRowsIndex = selectedRowsTx.store.index('by-tab');
    let selectedRowsCursor = await selectedRowsIndex.openCursor(IDBKeyRange.only(tabId));
    while (selectedRowsCursor) {
      await selectedRowsCursor.delete();
      selectedRowsCursor = await selectedRowsCursor.continue();
    }
    await selectedRowsTx.done;
  }

  async clearAllTableData(): Promise<void> {
    const db = await this.initDB();
    const stores = ['rows', 'columns', 'editedRows', 'removedRows', 'unsavedRows', 'selectedRows'] as const;
    await Promise.all(
      stores.map(async (store) => {
        const tx = db.transaction(store, 'readwrite');
        await tx.store.clear();
        await tx.done;
      })
    );
  }

  private migrateLocalStorageTabQueries(): boolean {
    try {
      const stored = localStorage.getItem(TAB_QUERIES_STORAGE_KEY);
      if (!stored) {
        return false;
      }

      const parsed = JSON.parse(stored) as Record<string, string>;
      for (const [tabId, query] of Object.entries(parsed)) {
        this.tabQueryCache[tabId] = query;
      }

      return true;
    } catch (error) {
      console.error('Failed to migrate tab queries from localStorage:', error);
      return false;
    }
  }

  private async persistMigratedTabQueries(queries: Record<string, string>): Promise<void> {
    await Promise.all(Object.entries(queries).map(([tabId, query]) => this.saveTabQuery(tabId, query)));
    localStorage.removeItem(TAB_QUERIES_STORAGE_KEY);
  }

  async hydrateTabQueries(): Promise<void> {
    if (this.tabQueriesHydrated) {
      return;
    }

    if (!this.tabQueriesHydrating) {
      this.tabQueriesHydrating = (async (): Promise<void> => {
        const migrated = this.dbName === tableDataDbName() && this.migrateLocalStorageTabQueries();

        if (migrated) {
          await this.persistMigratedTabQueries({ ...this.tabQueryCache });
        } else {
          const db = await this.initDB();
          const entries = await db.getAll('tabQueries');
          for (const entry of entries) {
            this.tabQueryCache[entry.tabId] = entry.query;
          }
        }

        this.tabQueriesHydrated = true;
      })();
    }

    await this.tabQueriesHydrating;
  }

  getTabQuery(tabId: string): string {
    if (!this.tabQueriesHydrated) {
      this.migrateLocalStorageTabQueries();
    }

    return this.tabQueryCache[tabId] ?? '';
  }

  async saveTabQuery(tabId: string, query: string): Promise<void> {
    this.tabQueryCache[tabId] = query;

    const db = await this.initDB();
    const tx = db.transaction('tabQueries', 'readwrite');
    await tx.store.put({ tabId, query });
    await tx.done;
  }

  async removeTabQuery(tabId: string): Promise<void> {
    delete this.tabQueryCache[tabId];

    const db = await this.initDB();
    const tx = db.transaction('tabQueries', 'readwrite');
    await tx.store.delete(tabId);
    await tx.done;
  }

  async clearTabQueries(): Promise<void> {
    this.tabQueryCache = {};

    const db = await this.initDB();
    const tx = db.transaction('tabQueries', 'readwrite');
    await tx.store.clear();
    await tx.done;
  }
}

export const indexedDBService = new IndexedDBService();
