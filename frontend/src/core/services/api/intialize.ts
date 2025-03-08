import axios from 'axios';

const $axios = axios.create({
  baseURL: import.meta.env.VITE_PUBLIC_SERVER_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000
});

$axios.interceptors.request.use((config) => {
  return config;
});

const servicePost = $axios.post;
const serviceGet = $axios.get;
const serviceDelete = $axios.delete;
const servicePatch = $axios.patch;

const changeUrl = (url: string) => {
  $axios.defaults.baseURL = url;
};

export { changeUrl, serviceDelete, serviceGet, servicePatch, servicePost };
