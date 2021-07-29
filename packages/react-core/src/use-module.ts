import { useEffect, useState, useCallback } from 'react';
import { asyncLoader, IModule } from '@scalprum/core';

export function useModule(scope: string, module: string, defaultState: any): IModule | undefined {
  const [data, setData] = useState<IModule>(defaultState);
  const fetchModule = useCallback(async () => {
    const Module: IModule = await asyncLoader(scope, module);
    setData(() => Module);
  }, [scope, module]);

  useEffect(() => {
    fetchModule();
  }, [fetchModule]);

  return data;
}
