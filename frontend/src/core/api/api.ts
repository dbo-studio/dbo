import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { toast } from 'sonner';

import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';

type ApiErrorResponse = {
  message?: string;
  data?: {
    connectionId?: number;
  };
};

const suppressedPasswordPromptConnectionIds = new Set<number>();

export const suppressPasswordPromptForConnection = (connectionId: number): void => {
  suppressedPasswordPromptConnectionIds.add(connectionId);
};

export const resumePasswordPromptForConnection = (connectionId: number): void => {
  suppressedPasswordPromptConnectionIds.delete(connectionId);
};

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_PUBLIC_SERVER_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Mode': 'web'
  },
  timeout: 60000,
  withCredentials: true
});

const isRequestCancelled = (error: AxiosError): boolean => {
  return (
    error.code === 'ERR_CANCELED' ||
    error.name === 'CanceledError' ||
    error.name === 'AbortError' ||
    error.message?.toLowerCase().includes('canceled') ||
    error.message?.toLowerCase().includes('aborted')
  );
};

const handleApiError = (error: AxiosError<ApiErrorResponse>): void => {
  const response = error.response;

  if (!response) {
    if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('Unexpected error occurred.');
    }
    return;
  }

  const { status, data } = response;
  const message = data?.message ?? 'An error occurred';

  if (status === 401 && message === 'password_required') {
    const connectionId = data?.data?.connectionId;
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;

    // Ignore stale password errors after the connection was intentionally closed
    // (e.g. in-flight tree/query requests that complete after close-for-edit).
    if (
      connectionId != null &&
      !suppressedPasswordPromptConnectionIds.has(Number(connectionId)) &&
      currentConnectionId != null &&
      Number(currentConnectionId) === Number(connectionId)
    ) {
      useSettingStore.getState().updateUI({
        showConnectionPasswordPrompt: true,
        passwordPromptConnectionId: connectionId
      });
    }

    return;
  }

  if (status === 400 || status === 500) {
    toast.error(message || 'Server error occurred. Please try again later.');
  }
};

api.interceptors.request.use((config) => config);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    if (!axios.isAxiosError<ApiErrorResponse>(error)) {
      toast.error('Unknown error occurred.');
      return Promise.reject(new Error('Unknown error'));
    }

    if (isRequestCancelled(error)) {
      return Promise.reject(error);
    }

    handleApiError(error);

    return Promise.reject(error);
  }
);

const changeUrl = (url: string): void => {
  api.defaults.baseURL = url;
};

export { api, changeUrl };
