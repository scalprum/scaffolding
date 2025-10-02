import { useState, useEffect } from 'react';

export interface UseApiOptions {
  url?: string;
  delay?: number;
  mockData?: any;
  shouldFail?: boolean;
}

export interface UseApiResult<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Remote hook that simulates API calls
 * This will be loaded and executed remotely via useRemoteHook
 */
export const useApiHook = <T = any>(options: UseApiOptions = {}): UseApiResult<T> => {
  const {
    url = '/api/data',
    delay = 1000,
    mockData = { id: 1, message: 'Hello from remote API hook!' },
    shouldFail = false
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, delay));

      if (shouldFail) {
        throw new Error(`Failed to fetch data from ${url}`);
      }

      // Simulate successful API response
      setData(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [url, delay, shouldFail]);

  const refetch = () => {
    fetchData();
  };

  return {
    data,
    loading,
    error,
    refetch,
  };
};

export default useApiHook;