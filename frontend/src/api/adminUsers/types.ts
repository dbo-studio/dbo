export type AdminUserType = {
  id: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
  disabledAt?: string | null;
  createdAt: string;
};
