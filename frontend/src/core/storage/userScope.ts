export const PERSIST_BASES = ['settings', 'tabs', 'tree', 'connections'] as const;

const UNSCOPED_CLAIMED_KEY = 'dbo:unscoped-migrated';

let activeUserId: string | undefined;

export const getActiveUserId = (): string | undefined => activeUserId;

export const persistName = (base: (typeof PERSIST_BASES)[number], userId?: string): string => {
  if (!userId) {
    return base;
  }

  return `dbo:${userId}:${base}`;
};

export const tableDataDbName = (userId?: string): string => {
  if (!userId) {
    return 'table-data-db';
  }

  return `table-data-db:${userId}`;
};

export const migrateUnscopedOnce = (userId: string): void => {
  if (localStorage.getItem(UNSCOPED_CLAIMED_KEY)) {
    return;
  }

  let copied = false;
  for (const base of PERSIST_BASES) {
    const scoped = persistName(base, userId);
    if (localStorage.getItem(scoped)) {
      continue;
    }

    const legacy = localStorage.getItem(base);
    if (legacy) {
      localStorage.setItem(scoped, legacy);
      copied = true;
    }
  }

  if (copied) {
    localStorage.setItem(UNSCOPED_CLAIMED_KEY, '1');
  }
};

export const setActiveUserId = (userId?: string): void => {
  activeUserId = userId;
};
