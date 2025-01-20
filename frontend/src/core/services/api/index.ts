import type { AxiosError, AxiosRequestHeaders } from 'axios';
import { toast } from 'sonner';
import { serviceDelete, serviceGet, servicePatch, servicePost } from './intialize';

const messageHandler = (response: any) => {
  const message = response?.data?.data?.message;
  message && toast.error(message);
};

interface ApiOptions {
  headers?: (AxiosRequestHeaders & { Authorization?: string }) | object;
  isPublic?: boolean;
  [key: string]: any;
}
function get<T = any>(url: string, params = {}, { headers = {}, isPublic, ...options }: ApiOptions = {}): Promise<T> {
  const completeHeaders = {
    ...headers
  };

  return new Promise((resolve, reject) => {
    serviceGet(url, { ...options, params: { ...params }, headers: completeHeaders })
      .then((response) => {
        const responseData = response?.data?.data;
        messageHandler(response);
        resolve(responseData);
      })
      .catch((error: AxiosError) => {
        console.log('🚀 ~ error:', error);
        reject(error);
      });
  });
}

function post<T = any>(
  url: string,
  data = {},
  { headers = {}, isPublic, isLocationBased, ...options }: ApiOptions = {}
): Promise<T> {
  const completeHeaders = {
    ...headers
  };
  const completeData = isLocationBased ? { ...data, ...location } : data;

  return new Promise((resolve, reject) => {
    servicePost(url, completeData, { ...options, headers: completeHeaders })
      .then((response) => {
        const responseData = response?.data?.data;
        messageHandler(response);
        resolve(responseData);
      })
      .catch((error) => {
        console.log('🚀 ~ error:', error);
        reject(error);
      });
  });
}

function patch<T = any>(
  url: string,
  data = {},
  { headers = {}, isPublic, isLocationBased, ...options }: ApiOptions = {}
): Promise<T> {
  const completeHeaders = {
    ...headers
  };

  const completeData = isLocationBased ? { ...data, ...location } : data;

  return new Promise((resolve, reject) => {
    servicePatch(url, completeData, { ...options, headers: completeHeaders })
      .then((response) => {
        const responseData = response?.data?.data;
        messageHandler(response);
        resolve(responseData);
      })
      .catch((error) => {
        console.log('🚀 ~ error:', error);
        reject(error);
      });
  });
}

function del<T = any>(url: string, data = {}, { headers = {}, isPublic, ...options }: ApiOptions = {}): Promise<T> {
  const completeHeaders = {
    ...headers
  };

  return new Promise((resolve, reject) => {
    serviceDelete(url, { ...options, data: { ...data }, headers: completeHeaders })
      .then((response) => {
        const responseData = response?.data?.data;
        messageHandler(response);
        resolve(responseData);
      })
      .catch((error) => {
        console.log('🚀 ~ error:', error);
        reject(error);
      });
  });
}

export default {
  get,
  post,
  del,
  patch
};
