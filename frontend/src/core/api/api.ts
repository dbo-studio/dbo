import axios from 'axios';
import { toast } from 'sonner';

const api = axios.create({
  baseURL: import.meta.env.VITE_PUBLIC_SERVER_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000
});

api.interceptors.request.use((config) => {
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'An error occurred';

      if (status === 500 || status === 400) {
        toast.error(message || 'Server error occurred. Please try again later.');
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else if (error.code !== 'ERR_CANCELED') {
      toast.error('An unexpected error occurred.');
    }

    return Promise.reject(error);
  }
);

const changeUrl = (url: string): void => {
  api.defaults.baseURL = url;
};

export { api, changeUrl };
