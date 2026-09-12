/**
 * Minimal query/mutation hooks. Kept dependency-free deliberately: this bundle
 * ships to an offline edge node, and a data-fetching library that assumes a
 * healthy network buys us little here.
 *
 * Fixed from the previous version: `queryFn` was in the effect dependency array
 * as a raw value, so an inline arrow re-created every render caused a refetch
 * loop. It is now held in a ref and the caller controls refetching through an
 * explicit `deps` array.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseQueryOptions<T> {
  queryFn: () => Promise<T>;
  enabled?: boolean;
  refetchIntervalMs?: number;
  /** Values that should trigger a refetch when they change. */
  deps?: unknown[];
  onError?: (err: Error) => void;
  onSuccess?: (data: T) => void;
}

interface UseQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setData: (updater: T | ((prev: T | null) => T)) => void;
}

export function useQuery<T>(opts: UseQueryOptions<T>): UseQueryResult<T> {
  const { enabled = true, refetchIntervalMs, deps = [] } = opts;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mounted = useRef(true);
  const fnRef = useRef(opts.queryFn);
  const successRef = useRef(opts.onSuccess);
  const errorRef = useRef(opts.onError);
  const loadedOnce = useRef(false);

  fnRef.current = opts.queryFn;
  successRef.current = opts.onSuccess;
  errorRef.current = opts.onError;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const run = useCallback(async () => {
    if (loadedOnce.current) setIsRefreshing(true); else setIsLoading(true);
    try {
      const result = await fnRef.current();
      if (!mounted.current) return;
      setData(result);
      setError(null);
      loadedOnce.current = true;
      successRef.current?.(result);
    } catch (err) {
      if (!mounted.current) return;
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      errorRef.current?.(e);
    } finally {
      if (mounted.current) { setIsLoading(false); setIsRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    if (!enabled) { setIsLoading(false); return; }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  useEffect(() => {
    if (!refetchIntervalMs || !enabled) return;
    const id = setInterval(run, refetchIntervalMs);
    return () => clearInterval(id);
  }, [refetchIntervalMs, enabled, run]);

  const setDataExternal = useCallback((updater: T | ((prev: T | null) => T)) => {
    setData((prev) => (typeof updater === 'function' ? (updater as (p: T | null) => T)(prev) : updater));
  }, []);

  return { data, isLoading, isRefreshing, error, refetch: run, setData: setDataExternal };
}

interface UseMutationOptions<TData, TVars> {
  mutationFn: (vars: TVars) => Promise<TData>;
  onSuccess?: (data: TData, vars: TVars) => void;
  onError?: (err: Error, vars: TVars) => void;
}

interface UseMutationResult<TData, TVars> {
  data: TData | null;
  isLoading: boolean;
  error: Error | null;
  mutate: (vars: TVars) => Promise<TData | undefined>;
  reset: () => void;
}

export function useMutation<TData, TVars = void>(
  opts: UseMutationOptions<TData, TVars>,
): UseMutationResult<TData, TVars> {
  const [data, setData] = useState<TData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fnRef = useRef(opts.mutationFn);
  const successRef = useRef(opts.onSuccess);
  const errorRef = useRef(opts.onError);
  fnRef.current = opts.mutationFn;
  successRef.current = opts.onSuccess;
  errorRef.current = opts.onError;

  const mutate = useCallback(async (vars: TVars): Promise<TData | undefined> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fnRef.current(vars);
      setData(result);
      successRef.current?.(result, vars);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      errorRef.current?.(e, vars);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null); setError(null); setIsLoading(false);
  }, []);

  return { data, isLoading, error, mutate, reset };
}
