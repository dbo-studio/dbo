import { apiHandler } from '@/core/services';
import { isServerSide, tools } from '@/core/utils';
import type { ArgumentType, MethodType } from '@/types';
import { type DependencyList, useEffect, useMemo, useState } from 'react';

interface UseAPI<T, M extends MethodType> {
  apiMethod: (data?: ArgumentType<M>) => Promise<T & { message?: string }>;
  fireOnLoad?: boolean;
  requestDataOnLoad?: ArgumentType<M>;
  successCallback?: (data: T) => void;
  failedCallback?: (error?: Error) => void;
  dependenciesOnLoad?: DependencyList;
}

interface UseAPIReturnType<T, M extends MethodType> {
  pending: boolean;
  // FIXME: apiData type can not be understood by TS when we call `request` function
  // `request` type is `(apiData?: any) => Promise<any>` always, in every use-case
  request: (apiData?: ArgumentType<M>) => Promise<T>;
}

export default function useAPI<T, M extends MethodType>({
  apiMethod,
  fireOnLoad,
  requestDataOnLoad,
  successCallback,
  failedCallback,
  dependenciesOnLoad
}: UseAPI<T, M>): UseAPIReturnType<T, M> {
  const [loading, setLoading] = useState(!!fireOnLoad);
  const isReady = !isServerSide;

  const startCallback = () => setLoading(true);

  const endCallback = () => setLoading(false);

  function request(apiData?: ArgumentType<M>): Promise<T> {
    return new Promise((resolve, reject) => {
      apiHandler<T, M>({
        apiData,
        apiMethod,
        startCallback,
        endCallback
      })
        ?.then((response: T) => {
          successCallback?.(response);
          resolve(response);
        })
        ?.catch((error: Error) => {
          failedCallback?.(error);
          reject(error);
        });
    });
  }

  const memoizedDependenciesOnLoad = useMemo(
    () => (tools.isEmpty(dependenciesOnLoad) ? [isReady] : [isReady, ...(dependenciesOnLoad || [])]),
    [isReady, dependenciesOnLoad]
  );

  useEffect(() => {
    if (fireOnLoad && isReady) {
      request(requestDataOnLoad);
    }
  }, memoizedDependenciesOnLoad);

  return {
    pending: loading,
    request
  };
}
