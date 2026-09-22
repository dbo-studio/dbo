import type { UserPermissions } from '@/api/auth/types';

export type AdminUserType = {
  id: string;
  email: string;
  role: string;
  permissions: UserPermissions;
  mustChangePassword: boolean;
  totpEnabled?: boolean;
  disabledAt?: string | null;
  createdAt: string;
};
