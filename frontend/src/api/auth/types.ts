export type AuthUserIdentity = {
  id: string;
  email: string;
  role: string;
};

export type AuthStatusType = {
  mode: string;
  authenticated: boolean;
  mustChangePassword: boolean;
  user?: AuthUserIdentity;
};
