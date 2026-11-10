import type { AuthUserIdentity, UserPermissions } from '@/api/auth/types';

export const fullPermissions: UserPermissions = {
  createConnection: true,
  aiSettings: true,
  mcpSettings: true,
  cli: true,
  import: true,
  export: true,
  aiUse: true
};

export const noPermissions: UserPermissions = {
  createConnection: false,
  aiSettings: false,
  mcpSettings: false,
  cli: false,
  import: false,
  export: false,
  aiUse: false
};

export function resolvePermissions(mode: string, user?: AuthUserIdentity): UserPermissions {
  if (mode !== 'local') {
    return fullPermissions;
  }

  if (!user) {
    return noPermissions;
  }

  return user.permissions ?? (user.role === 'admin' ? fullPermissions : noPermissions);
}

export function canCreateConnection(mode: string, user?: AuthUserIdentity): boolean {
  return resolvePermissions(mode, user).createConnection;
}

export function canManageAiSettings(mode: string, user?: AuthUserIdentity): boolean {
  return resolvePermissions(mode, user).aiSettings;
}

export function canManageMcpSettings(mode: string, user?: AuthUserIdentity): boolean {
  return resolvePermissions(mode, user).mcpSettings;
}

export function canUseCli(mode: string, user?: AuthUserIdentity): boolean {
  return resolvePermissions(mode, user).cli;
}

export function canImport(mode: string, user?: AuthUserIdentity): boolean {
  return resolvePermissions(mode, user).import;
}

export function canExport(mode: string, user?: AuthUserIdentity): boolean {
  return resolvePermissions(mode, user).export;
}

export function canUseAi(mode: string, user?: AuthUserIdentity): boolean {
  return resolvePermissions(mode, user).aiUse;
}

export function isInstanceAdmin(mode: string, user?: AuthUserIdentity): boolean {
  return mode !== 'local' || user?.role === 'admin';
}
