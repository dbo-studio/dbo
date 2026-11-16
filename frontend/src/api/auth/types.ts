/** Every permission key mapped to whether the user has it. */
export type UserPermissions = Record<string, boolean>;

/** One permission as the backend lists it: its group is how the admin screen sorts it. */
export type PermissionDef = { key: string; group: string; default: boolean };

export type AuthUserIdentity = {
  id: string;
  email: string;
  role: string;
  permissions?: UserPermissions;
};

export type AuthStatusType = {
  mode: string;
  authenticated: boolean;
  mustChangePassword: boolean;
  setupRequired?: boolean;
  totpEnabled?: boolean;
  permissions?: UserPermissions;
  user?: AuthUserIdentity;
};

export type AuthLoginResponse = {
  totpRequired?: boolean;
  challengeToken?: string;
};

export type AuthTotpStatusType = {
  enabled: boolean;
};

export type AuthTotpSetupResponse = {
  secret: string;
  otpauthUrl: string;
};
