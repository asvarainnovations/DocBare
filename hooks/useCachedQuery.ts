'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CacheManager, cacheUtils } from '@/lib/cache';

interface UseCachedQueryOptions<T> {
  cache?: CacheManager;
  ttl?: number;
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  retryCount?: number;
  retryDelay?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onSettled?: (data: T | null, error: Error | null) => void;
}

interface UseCachedQueryResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => Promise<void>;
  invalidate: () => void;
  clearCache: () => void;
}

export function useCachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: UseCachedQueryOptions<T> = {}
): UseCachedQueryResult<T> {
  const {
    cache = new CacheManager(),
    ttl,
    enabled = true,
    refetchOnWindowFocus = false,
    refetchOnReconnect = false,
    retryCount = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
    onSettled
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  // Check if data exists in cache
  const checkCache = useCallback(() => {
    const cachedData = cache.get<T>(key);
    if (cachedData !== null) {
      setData(cachedData);
      setIsSuccess(true);
      setIsError(false);
      onSuccess?.(cachedData);
      return true;
    }
    return false;
  }, [cache, key, onSuccess]);

  // Fetch data with retry logic
  const fetchData = useCallback(async (signal?: AbortSignal): Promise<T> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        if (signal?.aborted) {
          throw new Error('Request aborted');
        }

        const result = await queryFn();
        
        if (signal?.aborted) {
          throw new Error('Request aborted');
        }

        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        
        if (attempt === retryCount) {
          throw lastError;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }

    throw lastError!;
  }, [queryFn, retryCount, retryDelay]);

  // Main fetch function
  const executeQuery = useCallback(async (forceRefetch = false) => {
    if (!enabled) return;

    // Check cache first (unless forcing refetch)
    if (!forceRefetch && checkCache()) {
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setIsFetching(true);
    setIsError(false);
    setIsSuccess(false);
    setError(null);
    retryCountRef.current = 0;

    try {
      const result = await fetchData(abortControllerRef.current.signal);
      
      if (!isMountedRef.current) return;

      // Store in cache
      cache.set(key, result, ttl);
      
      setData(result);
      setIsSuccess(true);
      setIsError(false);
      onSuccess?.(result);
    } catch (err) {
      if (!isMountedRef.current) return;
      
      const error = err instanceof Error ? err : new Error(String(err));
      
      // Don't set error if request was aborted
      if (error.message !== 'Request aborted') {
        setError(error);
        setIsError(true);
        setIsSuccess(false);
        onError?.(error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsFetching(false);
        onSettled?.(data, error);
      }
    }
  }, [enabled, checkCache, fetchData, cache, key, ttl, onSuccess, onError, onSettled, data, error]);

  // Refetch function
  const refetch = useCallback(async () => {
    await executeQuery(true);
  }, [executeQuery]);

  // Invalidate cache
  const invalidate = useCallback(() => {
    cache.delete(key);
    setData(null);
    setIsSuccess(false);
  }, [cache, key]);

  // Clear cache
  const clearCache = useCallback(() => {
    cache.clear();
    setData(null);
    setIsSuccess(false);
  }, [cache]);

  // Effect for initial fetch
  useEffect(() => {
    if (enabled) {
      executeQuery();
    }
  }, [enabled, executeQuery]);

  // Effect for window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetchOnWindowFocus, refetch]);

  // Effect for reconnect refetch
  useEffect(() => {
    if (!refetchOnReconnect) return;

    const handleOnline = () => {
      refetch();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [refetchOnReconnect, refetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    error,
    isLoading,
    isFetching,
    isError,
    isSuccess,
    refetch,
    invalidate,
    clearCache
  };
}

// Hook for multiple queries
export function useCachedQueries<T>(
  queries: Array<{
    key: string;
    queryFn: () => Promise<T>;
    options?: UseCachedQueryOptions<T>;
  }>
): UseCachedQueryResult<T[]> {
  const results = queries.map(({ key, queryFn, options }) =>
    useCachedQuery(key, queryFn, options)
  );

  const isLoading = results.some(result => result.isLoading);
  const isFetching = results.some(result => result.isFetching);
  const isError = results.some(result => result.isError);
  const isSuccess = results.every(result => result.isSuccess);
  const error = results.find(result => result.error)?.error || null;
  const data = results.map(result => result.data).filter((item): item is T => item !== null);

  const refetch = useCallback(async () => {
    await Promise.all(results.map(result => result.refetch()));
  }, [results]);

  const invalidate = useCallback(() => {
    results.forEach(result => result.invalidate());
  }, [results]);

  const clearCache = useCallback(() => {
    results.forEach(result => result.clearCache());
  }, [results]);

  return {
    data,
    error,
    isLoading,
    isFetching,
    isError,
    isSuccess,
    refetch,
    invalidate,
    clearCache
  };
}

// Hook for infinite queries (pagination)
export function useInfiniteCachedQuery<T>(
  key: string,
  queryFn: (page: number, pageSize: number) => Promise<T[]>,
  options: UseCachedQueryOptions<T[]> & {
    pageSize?: number;
    getNextPageParam?: (lastPage: T[], allPages: T[][]) => number | null;
  } = {}
): UseCachedQueryResult<T[]> & {
  pages: T[][];
  hasNextPage: boolean;
  fetchNextPage: () => Promise<void>;
  fetchPreviousPage: () => Promise<void>;
} {
  const {
    pageSize = 10,
    getNextPageParam = (lastPage, allPages) => 
      lastPage.length === pageSize ? allPages.length : null,
    ...queryOptions
  } = options;

  const [pages, setPages] = useState<T[][]>([]);
  const [hasNextPage, setHasNextPage] = useState(true);

  const fetchPage = useCallback(async (page: number) => {
    const pageKey = `${key}:page:${page}`;
    return cacheUtils.memoize(pageKey, () => queryFn(page, pageSize));
  }, [key, queryFn, pageSize]);

  const fetchNextPage = useCallback(async () => {
    if (!hasNextPage) return;

    const nextPage = pages.length;
    const newPage = await fetchPage(nextPage);
    
    if (newPage.length > 0) {
      setPages(prev => [...prev, newPage]);
      setHasNextPage(getNextPageParam(newPage, [...pages, newPage]) !== null);
    } else {
      setHasNextPage(false);
    }
  }, [hasNextPage, pages, fetchPage, getNextPageParam]);

  const fetchPreviousPage = useCallback(async () => {
    if (pages.length <= 1) return;

    setPages(prev => prev.slice(0, -1));
    setHasNextPage(true);
  }, [pages]);

  const result = useCachedQuery(
    `${key}:infinite`,
    async () => {
      const firstPage = await fetchPage(0);
      setPages([firstPage]);
      setHasNextPage(getNextPageParam(firstPage, [firstPage]) !== null);
      return firstPage;
    },
    queryOptions
  );

  return {
    ...result,
    pages,
    hasNextPage,
    fetchNextPage,
    fetchPreviousPage
  };
}

// Export types
export type UseCachedQueryOptionsType<T> = UseCachedQueryOptions<T>;
export type UseCachedQueryResultType<T> = UseCachedQueryResult<T>; 