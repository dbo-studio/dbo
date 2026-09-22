import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { migrateUnscopedOnce, persistName, setActiveUserId } from './userScope';

type PersistStore = {
  persist: {
    setOptions: (options: { name: string }) => void;
    rehydrate: () => void | Promise<void>;
  };
  setState: (state: never, replace?: boolean) => void;
  getInitialState: () => never;
};

let applied: string | undefined | null = null;
let inflight: { id?: string; promise: Promise<void> } | undefined;

const switchPersist = async (
  store: PersistStore,
  base: 'settings' | 'tabs' | 'tree' | 'connections',
  userId?: string
): Promise<void> => {
  const name = persistName(base, userId);
  store.persist.setOptions({ name });

  if (localStorage.getItem(name)) {
    await store.persist.rehydrate();
    return;
  }

  store.setState(store.getInitialState(), true);
};

const run = async (userId?: string): Promise<void> => {
  setActiveUserId(userId);

  if (userId) {
    migrateUnscopedOnce(userId);
  }

  await indexedDBService.setScope(userId);
  await switchPersist(useSettingStore as unknown as PersistStore, 'settings', userId);
  await switchPersist(useTabStore as unknown as PersistStore, 'tabs', userId);
  await switchPersist(useTreeStore as unknown as PersistStore, 'tree', userId);
  await switchPersist(useConnectionStore as unknown as PersistStore, 'connections', userId);
};

export const applyUserWorkspaceScope = async (userId?: string): Promise<void> => {
  if (applied === userId) {
    return;
  }

  if (inflight && inflight.id === userId) {
    await inflight.promise;
    return;
  }

  const promise = run(userId);
  inflight = { id: userId, promise };

  try {
    await promise;
    applied = userId;
  } finally {
    if (inflight?.promise === promise) {
      inflight = undefined;
    }
  }
};
