import axios from 'axios';

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

const changeUrl = (url: string) => {
  api.defaults.baseURL = url;
};

export { changeUrl, api };
