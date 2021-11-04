import { useEffect, useState, useRef } from 'react';
import { asyncLoader, getCachedModule, IModule, getAppData, injectScript, processManifest } from '@scalprum/core';

export type ModuleDefinition = {
  appName?: string;
  scope: string;
  module: string;
  processor?: (item: any) => string;
};

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
