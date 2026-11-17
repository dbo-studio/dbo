import { type Can, makeCan, PERM } from '@/core/auth/permissions';
import { isRedisDriver } from '@/core/db/connectionAliases';
import { useCurrentConnection } from './useCurrentConnection';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useMemo } from 'react';

export type FeaturePermissions = { cli: boolean; import: boolean; export: boolean; ai: boolean };

/** `can(key)` for any permission (see PERM). The server enforces the same flags; this only hides what would be refused. */
export function useCan(): Can {
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);

  return useMemo(() => makeCan(mode, user), [mode, user]);
}

/** What the signed-in user may use of the data and AI features. */
export function useFeaturePermissions(): FeaturePermissions {
  const can = useCan();

  return { cli: can(PERM.dataCli), import: can(PERM.dataImport), export: can(PERM.dataExport), ai: can(PERM.aiUse) };
}

/** Reports are for SQL and MongoDB; Redis has none. Also needs the reports permission. */
export function useCanReports(): boolean {
  const can = useCan();
  const type = useCurrentConnection()?.type;

  return can(PERM.boardsReports) && !isRedisDriver(type);
}
