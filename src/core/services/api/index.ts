import { AxiosError, AxiosRequestHeaders } from 'axios';
import { toast } from 'sonner';
import { serviceDelete, serviceGet, servicePatch, servicePost } from './intialize';

// const getToken = () => {
//   return store?.getState()?.user?.token;
// };

const messageHandler = (response: any) => {
  const message = response?.data?.data?.message;
  message && toast.error(message);
};

interface ApiOptions {
  headers?: (AxiosRequestHeaders & { Authorization?: string }) | {};
  isPublic?: boolean;
  [key: string]: any;
}
function get<T = any>(url: string, params = {}, { headers = {}, isPublic, ...options }: ApiOptions = {}): Promise<T> {
  const completeHeaders = {
    ...headers
  };
  // TODO: set csrf token
  // if (!isPublic) completeHeaders.Authorization = getToken();
  return new Promise(function (resolve, reject) {
    serviceGet(url, { ...options, params: { ...params }, headers: completeHeaders })
      .then(function (response) {
        const responseData = response?.data?.data;
        messageHandler(response);
        resolve(responseData);
      })
      .catch(function (error: AxiosError) {
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
  // Note: This because of handling FormData objects
  // TODO: Find a better way so we can have formData and location data together if it is needed
  const completeData = isLocationBased ? { ...data, ...location } : data;

  // TODO: set csrf token
  // if (!isPublic) completeHeaders.Authorization = getToken();
  return new Promise(function (resolve, reject) {
    servicePost(url, completeData, { ...options, headers: completeHeaders })
      .then(function (response) {
        const responseData = response?.data?.data;
        messageHandler(response);
        resolve(responseData);
      })
      .catch(function (error) {
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
  // Note: This because of handling FormData objects
  // TODO: Find a better way so we can have formData and location data together if it is needed
  const completeData = isLocationBased ? { ...data, ...location } : data;

  // TODO: set csrf token
  // if (!isPublic) completeHeaders.Authorization = getToken();
  return new Promise(function (resolve, reject) {
    servicePatch(url, completeData, { ...options, headers: completeHeaders })
      .then(function (response) {
        const responseData = response?.data?.data;
        messageHandler(response);
        resolve(responseData);
      })
      .catch(function (error) {
        console.log('🚀 ~ error:', error);
        reject(error);
      });
  });
}

function del<T = any>(url: string, params = {}, { headers = {}, isPublic, ...options }: ApiOptions = {}): Promise<T> {
  const completeHeaders = {
    ...headers
  };
  // TODO: set csrf token
  // if (!isPublic) completeHeaders.Authorization = getToken();
  return new Promise(function (resolve, reject) {
    serviceDelete(url, { ...options, params: { ...params }, headers: completeHeaders })
      .then(function (response) {
        const responseData = response?.data?.data;
        messageHandler(response);
        resolve(responseData);
      })
      .catch(function (error) {
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
