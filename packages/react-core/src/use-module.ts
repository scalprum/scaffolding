import { useEffect, useState, useCallback } from 'react';
import { getModule, RemoteModule } from '@scalprum/core';

export function useModule<S extends string, M extends string, I extends string | undefined = undefined>(
  scope: S,
  module: M,
  defaultState?: RemoteModule<S, M, I>,
  importName?: I,
): RemoteModule<S, M, I>;
export function useModule<T = any, P = any>(scope: string, module: string, defaultState?: any, importName?: string): T;
export function useModule<T = any, P = any, S extends string = string, M extends string = string, I extends string | undefined = undefined>(
  scope: S,
  module: M,
  defaultState?: T,
  importName = 'default',
): T {
  const [data, setData] = useState<T>(defaultState as T);
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
