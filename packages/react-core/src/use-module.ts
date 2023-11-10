import { useEffect, useState, useCallback } from 'react';
import { getModule } from '@scalprum/core';

export function useModule<T = any, P = any>(scope: string, module: string, defaultState?: any, importName = 'default'): T {
  const [data, setData] = useState<T>(defaultState);
  const fetchModule = useCallback(async () => {
    try {
      const Module = await getModule<T, P>(scope, module, importName);
      setData(() => Module);
    } catch (error) {
      console.error(error);
    }
  }, [scope, module]);

  useEffect(() => {
    fetchModule();
  }, [scope, module, importName]);

  return data;
}
