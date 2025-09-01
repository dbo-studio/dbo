import type { AiProviderType } from '@/types';

export type ConfigResponseType = {
  url: string;
  version: string;
  providers: AiProviderType[];
};
