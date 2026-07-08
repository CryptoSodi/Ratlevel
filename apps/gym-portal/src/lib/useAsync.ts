import { useCallback, useEffect, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setData: (updater: (current: T) => T) => void;
}

/** Small data-fetching hook: loading / error / reload / optimistic setData. */
export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setDataRaw] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const result = await fetcher();
      setDataRaw(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const setData = useCallback((updater: (current: T) => T) => {
    setDataRaw((current) => (current === null ? current : updater(current)));
  }, []);

  return { data, loading, error, reload, setData };
}
