import type { AuthUserIdentity } from '@/api/auth/types';

/** Permission keys; the backend's package permission is the source of truth for what exists and how it is grouped. */
export const PERM = {
  connectionCreate: 'connection.create',
  dataImport: 'data.import',
  dataExport: 'data.export',
  dataCli: 'data.cli',
  aiUse: 'ai.use',
  aiSettings: 'ai.settings',
  aiMcp: 'ai.mcp',
  backupCreate: 'backup.create',
  backupRestore: 'backup.restore',
  backupTools: 'backup.tools',
  boardsReports: 'boards.reports',
  boardsDashboards: 'boards.dashboards',
  boardsShare: 'boards.share'
} as const;

export type Can = (key: string) => boolean;

/**
 * What the signed-in user may do. Outside login mode (desktop, no accounts) everything is allowed.
 * The server enforces the same permissions; this only hides what would be refused.
 */
export function makeCan(mode: string, user?: AuthUserIdentity): Can {
  if (mode !== 'local') {
    return () => true;
  }

  if (!user) {
    return () => false;
  }

  return (key) => user.permissions?.[key] ?? user.role === 'admin';
}

export const canCreateConnection = (mode: string, user?: AuthUserIdentity): boolean =>
  makeCan(mode, user)(PERM.connectionCreate);
export const canManageAiSettings = (mode: string, user?: AuthUserIdentity): boolean =>
  makeCan(mode, user)(PERM.aiSettings);
export const canManageMcpSettings = (mode: string, user?: AuthUserIdentity): boolean => makeCan(mode, user)(PERM.aiMcp);
export const canUseCli = (mode: string, user?: AuthUserIdentity): boolean => makeCan(mode, user)(PERM.dataCli);
export const canImport = (mode: string, user?: AuthUserIdentity): boolean => makeCan(mode, user)(PERM.dataImport);
export const canExport = (mode: string, user?: AuthUserIdentity): boolean => makeCan(mode, user)(PERM.dataExport);
export const canUseAi = (mode: string, user?: AuthUserIdentity): boolean => makeCan(mode, user)(PERM.aiUse);

export function isInstanceAdmin(mode: string, user?: AuthUserIdentity): boolean {
  return mode !== 'local' || user?.role === 'admin';
}
