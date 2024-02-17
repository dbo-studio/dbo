// import { isProduction } from '@/utils';
import axios from 'axios';

const $axios = axios.create({
  //   baseURL: isProduction ? process.env.NEXT_PUBLIC_BACKEND_URL : process.env.NEXT_PUBLIC_BACKEND_URL_DEMO,
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000
});

$axios.interceptors.request.use((config) => {
  config.headers.Authorization = localStorage.getItem('accessToken');
  return config;
});
// TODO: promise chaining is not handled
$axios.interceptors.response.use((response) => {
  return response;
});
const servicePost = $axios.post;
const serviceGet = $axios.get;
const serviceDelete = $axios.delete;
export { serviceDelete, serviceGet, servicePost };
