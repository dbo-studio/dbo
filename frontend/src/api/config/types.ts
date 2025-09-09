import type { AiProviderType } from '@/types';

export type ConfigResponseType = {
  url: string;
  version: string;
  providers: AiProviderType[];
  newReleaseVersion?: CheckUpdateResponseType;
  logsPath: string;
};

export type CheckUpdateResponseType = {
  name: string;
  url: string;
  body: string;
  publishedAt: string;
  isMinimum: boolean;
};
