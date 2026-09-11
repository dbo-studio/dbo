export type UserPermissions = {
  createConnection: boolean;
  aiSettings: boolean;
  mcpSettings: boolean;
};

export type AuthUserIdentity = {
  id: string;
  email: string;
  role: string;
  permissions?: UserPermissions;
};

export type AuthDirectoryUser = {
  id: string;
  email: string;
};

export type AuthStatusType = {
  mode: string;
  authenticated: boolean;
  mustChangePassword: boolean;
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
