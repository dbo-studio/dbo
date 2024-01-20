import axios from 'axios';

// const getToken = () => store.getters.user.token;

const http = axios.create({
  // baseURL: process.env.APP_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// const authInterceptor = (config) => {
//   config.headers["Authorization"] = "Bearer " + getToken();
//   return config;
// };

// http.interceptors.request.use(authInterceptor);

const errorInterceptor = (error: any) => {
  if (error.response.status === 401) {
    //
  } else {
    console.log('from errorInterceptor : ' + error);
  }
  return Promise.reject(error);
};

// Interceptor for responses
const responseInterceptor = (response: any) => {
  if (!response.data.status) {
    console.log('from responseInterceptor : ' + response.data.message);
  }
  return response;
};

http.interceptors.response.use(responseInterceptor, errorInterceptor);

// const post = async <T extends ResponseType>(url: string, payload: object): Promise<T> => {
//   const res: AxiosResponse = await http.post<T>(url, payload);
//   const data: T = res.data;
// };

// const get = async (url: string, payload: object) => {
//   url +=
//     '?' +
//     Object.entries(payload)
//       .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
//       .join('&');

//   const response = await http.post(url, payload);

//   return response;
// };

export { http };
