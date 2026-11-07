import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { toast } from 'sonner';

import { applyUserWorkspaceScope } from '@/core/storage/applyUserWorkspace';
import { useAuthStore } from '@/store/authStore/auth.store';
import { isRedisDriver } from '@/core/db/connectionAliases';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';

type ApiErrorResponse = {
  message?: string;
  data?: {
    connectionId?: number;
  };
};

/** Connection IDs whose password_required errors should be ignored (e.g. during/after close). */
const suppressedPasswordPromptConnectionIds = new Set<number>();

export const suppressPasswordPromptForConnection = (connectionId: number): void => {
  suppressedPasswordPromptConnectionIds.add(Number(connectionId));
};

export const resumePasswordPromptForConnection = (connectionId: number): void => {
  suppressedPasswordPromptConnectionIds.delete(Number(connectionId));
};

export const isPasswordPromptSuppressedForConnection = (connectionId: number): boolean => {
  return suppressedPasswordPromptConnectionIds.has(Number(connectionId));
};

declare module 'axios' {
  interface AxiosRequestConfig {
    /** The caller shows the error itself (the terminal prints it); skip the global toast. */
    silent?: boolean;
  }
}

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

const passwordlessTried = new Set<number>();

/** A Redis without a password has nothing to ask: unlock it with an empty one, and prompt only if that fails. */
const promptOrUnlockPasswordless = async (connectionId: number): Promise<void> => {
  const showPrompt = (): void =>
    useSettingStore
      .getState()
      .updateUI({ showConnectionPasswordPrompt: true, passwordPromptConnectionId: connectionId });
  const connection = useConnectionStore.getState().connections?.find((c) => Number(c.id) === Number(connectionId));

  if (!connection || !isRedisDriver(connection.type) || passwordlessTried.has(Number(connectionId)))
    return showPrompt();
  passwordlessTried.add(Number(connectionId));

  try {
    await api.post(
      '/connections/ping',
      { id: connectionId, type: connection.type, options: { ...connection.options, password: '' } },
      { silent: true }
    );
    await api.post(
      `/connections/${connectionId}/credentials`,
      { id: connectionId, password: '', rememberPassword: true },
      { silent: true }
    );
    passwordlessTried.delete(Number(connectionId));
    window.location.reload(); // simplest way to refetch every request that failed while locked
  } catch {
    showPrompt();
  }
};

const handleApiError = (error: AxiosError<ApiErrorResponse>): void => {
  const silent = error.config?.silent === true;
  const notify = (message: string): void => {
    if (!silent) toast.error(message);
  };
  const response = error.response;

  if (!response) {
    if (error.request) {
      notify('Network error. Please check your connection.');
    } else {
      notify('Unexpected error occurred.');
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
      !isPasswordPromptSuppressedForConnection(connectionId) &&
      currentConnectionId != null &&
      Number(currentConnectionId) === Number(connectionId)
    ) {
      void promptOrUnlockPasswordless(connectionId);
    }

    return;
  }

  if (status === 401 && message === 'unauthenticated') {
    const mode = useAuthStore.getState().mode;
    if (mode === 'local') {
      useAuthStore.getState().clear();
      void applyUserWorkspaceScope(undefined);
    }
    return;
  }

  if (status === 403 && message === 'must_change_password') {
    useAuthStore.getState().setGate('change_password');
    return;
  }

  if (status === 400 || status === 500) {
    notify(message || 'Server error occurred. Please try again later.');
  }

  // Safe Mode 403s are handled by callers (confirm modal / toast with reason).
  if (
    status === 403 &&
    (message === 'safe_mode_blocked' ||
      message === 'safe_mode_confirm_required' ||
      message === 'safe_mode_password_required' ||
      message === 'safe_mode_password_invalid')
  ) {
    return;
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
