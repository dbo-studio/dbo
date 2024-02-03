// import { toast } from 'react-toastify';
import { ArgumentType, MethodType, SimpleFunction } from "../types";

interface ApiHandlerProps<T, M extends MethodType> {
  apiMethod: (data?: ArgumentType<M>) => Promise<T & { message?: string }>;
  startCallback?: SimpleFunction;
  endCallback?: SimpleFunction;
  apiData?: ArgumentType<M>;
}

function apiHandler<T, M extends MethodType>({
  apiMethod,
  startCallback,
  endCallback,
  apiData
}: ApiHandlerProps<T, M>): Promise<T> {
  return new Promise(function (resolve, reject) {
    startCallback?.();
    apiMethod(apiData)
      .then((data) => {
        resolve(data);
        endCallback?.();
      })
      .catch((error: any) => {
        const status = error?.data?.status;
        if (error.message === 'Network Error') {
        //   toast('مشکلی پیش آمده است.', {
        //     type: 'error'
        //   });
        } else if (status === 500) {
        //   toast('مشکلی پیش آمده است.', {
        //     type: 'error'
        //   });
        } else if (error?.data?.status === 400) {
        //   toast('مشکلی با توکن پیش آمده است.', {
        //     type: 'error'
        //   });
        }
        reject(error);
        endCallback?.();
      });
  });
}

export { apiHandler };
