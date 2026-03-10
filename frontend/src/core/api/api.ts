import axios from 'axios';
import { toast } from 'sonner';

import { useSettingStore } from '@/store/settingStore/setting.store';

const api = axios.create({
  baseURL: import.meta.env.VITE_PUBLIC_SERVER_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Mode': 'web'
  },
  timeout: 60000,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isCancelled =
      error.code === 'ERR_CANCELED' ||
      error.name === 'CanceledError' ||
      error.name === 'AbortError' ||
      error.message?.toLowerCase().includes('canceled') ||
      error.message?.toLowerCase().includes('aborted');

    if (isCancelled) {
      return Promise.reject(error);
    }

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'An error occurred';

      if (status === 401 && message === 'password_required') {
        const connectionId = error.response.data?.data?.connectionId;
        if (connectionId != null) {
          useSettingStore.getState().updateUI({
            showConnectionPasswordPrompt: true,
            passwordPromptConnectionId: Number(connectionId)
          });
        }

        return Promise.reject(error);
      }

      if (status === 500 || status === 400) {
        toast.error(message || 'Server error occurred. Please try again later.');
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred.');
    }

    return Promise.reject(error);
  }
);

const changeUrl = (url: string): void => {
  api.defaults.baseURL = url;
};

export { api, changeUrl };
