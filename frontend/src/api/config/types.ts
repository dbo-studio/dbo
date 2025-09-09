import type { AiProviderType } from '@/types';

export type ConfigResponseType = {
  url: string;
  version: string;
  providers: AiProviderType[];
  newReleaseVersion?: NewReleaseType;
};

export type NewReleaseType = {
  name: string;
  url: string;
  body: string;
  publishedAt: string;
  isMinimum: boolean;
};
