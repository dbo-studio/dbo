export type AccountUser = {
  name: string;
  email: string;
  verified: boolean;
};

export type AccountSession = {
  token: string;
  user: AccountUser;
};

export type AccountConnectStart = {
  code: string;
  url: string;
};

export type AccountConnectPoll = {
  pending: boolean;
  session?: AccountSession;
};
