import axios from 'axios';

// const getToken = () => store.getters.user.token;

const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
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

export { http };
