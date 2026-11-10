import type { UserPermissions } from '@/api/auth/types';

export const defaultMemberPermissions: UserPermissions = {
  createConnection: false,
  aiSettings: true,
  mcpSettings: false,
  cli: false,
  import: true,
  export: true,
  aiUse: true
};
