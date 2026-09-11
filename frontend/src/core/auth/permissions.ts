import type { AuthUserIdentity, UserPermissions } from '@/api/auth/types';

export const fullPermissions: UserPermissions = {
  createConnection: true,
  aiSettings: true,
  mcpSettings: true
};

export const noPermissions: UserPermissions = {
  createConnection: false,
  aiSettings: false,
  mcpSettings: false
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

export function isInstanceAdmin(mode: string, user?: AuthUserIdentity): boolean {
  return mode !== 'local' || user?.role === 'admin';
}
