import { useRouter } from 'next/router';
import { DependencyList, useEffect, useMemo } from 'react';
import type { MutatorOptions } from 'swr';
import useSWR from 'swr';
import { apiHandler } from '../core/services';
import { tools } from '../core/utils';
import { ArgumentType, MethodType, SimpleFunction } from '../types';
import { useMount } from './useMount.hook';

interface UsePageData<T, M extends MethodType> {
  apiMethod: (data?: ArgumentType<M>) => Promise<T & { message?: string }>;
  apiData?: ArgumentType<M>;
  dependencies?: DependencyList;
  url?: string;
  successCallback?: (data?: T) => void;
  failedCallback?: SimpleFunction;
  revalidateIfStale?: boolean;
  revalidateOnMount?: boolean;
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  revalidateOnEmptyCache?: boolean;
}

interface UsePageDataReturnType<T> {
  pageData?: T;
  pending: boolean;
  hasError: boolean;
  reload: () => Promise<T | unknown>;
  mutate: (data: T, options?: MutatorOptions) => void;
  cacheKey: Array<unknown>;
}

export function usePageData<T, M extends MethodType>({
  apiMethod,
  apiData,
  dependencies,
  url,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  successCallback = () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  failedCallback = () => {},
  revalidateIfStale = false,
  revalidateOnMount = true,
  revalidateOnFocus = false,
  revalidateOnReconnect = false,
  revalidateOnEmptyCache = false
}: UsePageData<T, M>): UsePageDataReturnType<T> {
  const isReady = useRouter().isReady;
  const isMounted = useMount();

  const fetcher = () => {
    return apiHandler({
      apiData,
      apiMethod
    });
  };

  const memoizedDependenciesOnLoad = useMemo(() => [url, ...(dependencies || [])], [dependencies, url]);

  const { data: cachedData } = useSWR(memoizedDependenciesOnLoad);

  const {
    data: pageData,
    error,
    mutate
  } = useSWR(isReady ? memoizedDependenciesOnLoad : null, fetcher, {
    onError: failedCallback,
    revalidateIfStale,
    revalidateOnMount: revalidateOnEmptyCache ? tools.isEmpty(cachedData) : revalidateOnMount,
    revalidateOnFocus,
    revalidateOnReconnect
  });

  const pending = !error && !pageData;

  useEffect(() => {
    if ((!isMounted && !pageData) || pending) return;
    successCallback?.(pageData);
  }, [isMounted, pageData, pending, successCallback]);

  const reload = () => mutate?.();

  return {
    pageData,
    pending,
    hasError: !!error,
    reload,
    mutate,
    cacheKey: memoizedDependenciesOnLoad
  };
}
