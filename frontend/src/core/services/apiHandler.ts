// import { toast } from 'react-toastify';
import { toast } from 'sonner';
import type { ArgumentType, MethodType, SimpleFunction } from '../../types';

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
  return new Promise((resolve, reject) => {
    startCallback?.();
    apiMethod(apiData)
      .then((data) => {
        resolve(data);
        endCallback?.();
      })
      .catch((error: any) => {
        const status = error?.response?.status;
        const message = error?.response?.data?.message;
        if (error.message === 'Network Error') {
          //   toast('مشکلی پیش آمده است.', {
          //     type: 'error'
          //   });
        } else if (status === 500 || status === 400 || status === 422) {
          toast.error(message, {
            closeButton: true,
            duration: undefined
          });
        }
        reject(error);
        endCallback?.();
      });
  });
}

export { apiHandler };
