import { useEffect, useState, useRef } from 'react';
import { getCachedModule, ExposedScalprumModule, getAppData, processManifest, getScalprum } from '@scalprum/core';

export type ModuleDefinition = {
  scope: string;
  module: string;
  processor?: (item: any) => string[];
};

export function useLoadModule(
  { scope, module, processor }: ModuleDefinition,
  defaultState: any
): [ExposedScalprumModule | undefined, Error | undefined] {
  const { manifestLocation } = getAppData(scope);
  const [data, setData] = useState<ExposedScalprumModule>(defaultState);
  const [error, setError] = useState<Error>();
  const { cachedModule } = getCachedModule(scope, module);
  const isMounted = useRef(true);
  const { pluginStore } = getScalprum();
  useEffect(() => {
    if (isMounted.current) {
      if (!cachedModule) {
        if (manifestLocation) {
          processManifest(manifestLocation, scope, module, processor)
            .then(async () => {
              const Module: ExposedScalprumModule = await pluginStore.getExposedModule(scope, module);
              setData(() => Module);
            })
            .catch((e) => {
              setError(() => e);
            });
        }
      } else {
        try {
          pluginStore.getExposedModule<ExposedScalprumModule>(scope, module).then((Module) => {
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
  }, [scope, cachedModule]);

  return [data, error];
}
