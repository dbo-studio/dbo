import type { PingConnectionResponseType } from '@/api/connection/types';
import type { AxiosError } from 'axios';

type PingErrorData = {
  message?: string;
  data?: {
    category?: string;
    suggestion?: string;
    latencyMs?: number;
  };
};

export const formatPingSuccessMessage = (diagnostics: PingConnectionResponseType): string => {
  const details: string[] = [];

  details.push(`latency ${diagnostics.latencyMs}ms`);

  if (diagnostics.serverVersion) {
    details.push(`version ${diagnostics.serverVersion}`);
  }

  if (typeof diagnostics.sslNegotiated === 'boolean') {
    details.push(`SSL ${diagnostics.sslNegotiated ? 'on' : 'off'}`);
  } else if (diagnostics.sslMode) {
    details.push(`SSL mode ${diagnostics.sslMode}`);
  }

  return details.join(' | ');
};

export const formatPingFailureMessage = (error: unknown): string | null => {
  const axiosError = error as AxiosError<PingErrorData>;
  const response = axiosError.response?.data;
  if (!response) {
    return null;
  }

  const suggestion = response.data?.suggestion;
  const category = response.data?.category;
  if (suggestion && category) {
    return `${category}: ${suggestion}`;
  }

  return response.message ?? null;
};
