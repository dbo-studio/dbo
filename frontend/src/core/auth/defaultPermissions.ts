import type { UserPermissions } from '@/api/auth/types';

export const defaultMemberPermissions: UserPermissions = {
  createConnection: false,
  aiSettings: true,
  mcpSettings: false
};

export const defaultAdminPermissions: UserPermissions = {
  createConnection: true,
  aiSettings: true,
  mcpSettings: true
};
