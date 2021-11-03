import { useEffect, useState, useCallback, useRef } from 'react';
import { asyncLoader, getCachedModule, IModule, getAppData, injectScript, processManifest } from '@scalprum/core';

export type ModuleDefinition = {
  appName?: string;
  scope: string;
  module: string;
  processor?: (item: any) => string;
};
export interface IUseLoadModule {
  moduleDef: ModuleDefinition;
}

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
    const cachedModule = getCachedModule(scope, module, defaultOptions.skipCache);
    let Module: IModule;
    if (!cachedModule) {
      try {
        Module = await asyncLoader(scope, module);
      } catch {
        console.error(
          `Module not initialized! Module "${module}" was not found in "${scope}" webpack scope. Make sure the remote container is loaded?`
        );
      }
    } else {
      Module = cachedModule;
    }
    setData(() => Module);
  }, [scope, module]);

  useEffect(() => {
    fetchModule();
  }, [scope, module]);

  return data;
}

export function useLoadModule(
  { appName, scope, module, processor }: ModuleDefinition,
  defaultState: any,
  options: {
    skipCache?: boolean;
  } = {}
): [IModule | undefined, Error | undefined] {
  const defaultOptions = {
    skipCache: false,
    ...options,
  };
  const { scriptLocation, manifestLocation } = getAppData(appName || scope);
  const [data, setData] = useState<IModule>(defaultState);
  const [error, setError] = useState<Error>();
  const cachedModule = getCachedModule(scope, module, defaultOptions.skipCache);
  const isMounted = useRef(true);
  useEffect(() => {
    if (isMounted.current) {
      if (!cachedModule) {
        if (scriptLocation) {
          injectScript(appName || scope, scriptLocation)
            .then(async () => {
              const Module: IModule = await asyncLoader(scope, module);
              setData(() => Module);
            })
            .catch((e) => {
              setError(() => e);
            });
        } else if (manifestLocation) {
          processManifest(manifestLocation, appName || scope, scope, processor)
            .then(async () => {
              const Module: IModule = await asyncLoader(scope, module);
              setData(() => Module);
            })
            .catch((e) => {
              setError(() => e);
            });
        }
      } else {
        try {
          asyncLoader(scope, module).then((Module: IModule) => {
            setData(() => Module);
          });
        } catch (e) {
          setError(() => e as Error);
        }
      }
    }

    return () => {
      isMounted.current = false;
    };
  }, [appName, scope, cachedModule, defaultOptions.skipCache]);

  return [data, error];
}
