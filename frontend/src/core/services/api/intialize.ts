import { appConfig } from '@/src/appConfig';
import axios from 'axios';

const $axios = axios.create({
  baseURL: appConfig.apiUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000
});

$axios.interceptors.request.use((config) => {
  // config.headers.Authorization = localStorage.getItem('accessToken');
  return config;
});

// $axios.interceptors.response.use((response) => {
//   return response;
// });
const servicePost = $axios.post;
const serviceGet = $axios.get;
const serviceDelete = $axios.delete;
const servicePatch = $axios.patch;

const changeUrl = (url: string) => {
  $axios.defaults.baseURL = url;
};

export { changeUrl, serviceDelete, serviceGet, servicePatch, servicePost };
