import { useEffect, useState, useRef } from 'react';
import { asyncLoader, getCachedModule, ExposedScalprumModule, getAppData, injectScript, processManifest } from '@scalprum/core';

export type ModuleDefinition = {
  scope: string;
  module: string;
  processor?: (item: any) => string;
};

export function useLoadModule(
  { scope, module, processor }: ModuleDefinition,
  defaultState: any,
  options: {
    skipCache?: boolean;
  } = {}
): [ExposedScalprumModule | undefined, Error | undefined] {
  const defaultOptions = {
    skipCache: false,
    ...options,
  };
  const { scriptLocation, manifestLocation } = getAppData(scope);
  const [data, setData] = useState<ExposedScalprumModule>(defaultState);
  const [error, setError] = useState<Error>();
  const cachedModule = getCachedModule(scope, module, defaultOptions.skipCache);
  const isMounted = useRef(true);
  useEffect(() => {
    if (isMounted.current) {
      if (!cachedModule) {
        if (scriptLocation) {
          injectScript(scope, scriptLocation)
            .then(async () => {
              const Module: ExposedScalprumModule = await asyncLoader(scope, module);
              setData(() => Module);
            })
            .catch((e) => {
              setError(() => e);
            });
        } else if (manifestLocation) {
          processManifest(manifestLocation, scope, processor)
            .then(async () => {
              const Module: ExposedScalprumModule = await asyncLoader(scope, module);
              setData(() => Module);
            })
            .catch((e) => {
              setError(() => e);
            });
        }
      } else {
        try {
          asyncLoader(scope, module).then((Module: ExposedScalprumModule) => {
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
  }, [scope, cachedModule, defaultOptions.skipCache]);

  return [data, error];
}
