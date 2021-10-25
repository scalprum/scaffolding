import { useEffect, useState, useCallback } from 'react';
import { asyncLoader, getFactory, IModule } from '@scalprum/core';

export function useModule(
  scope: string,
  module: string,
  defaultState: any,
  options: {
    skipCache?: boolean;
  } = {}
): IModule | undefined {
  const defaultOptions = {
    skipCache: false,
    ...options,
  };
  const [data, setData] = useState<IModule>(defaultState);
  const fetchModule = useCallback(async () => {
    const factory = getFactory(scope, defaultOptions.skipCache);
    let Module: IModule;
    if (!factory) {
      try {
        Module = await asyncLoader(scope, module);
      } catch {
        console.error(
          `Module not initialized! Module "${module}" was not found in "${scope}" webpack scope. Make sure the remote container is loaded?`
        );
      }
    } else {
      Module = factory.get(module);
    }
    setData(() => Module);
  }, [scope, module]);

  useEffect(() => {
    fetchModule();
  }, [scope, module]);

  return data;
}
