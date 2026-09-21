import { useEffect, useState, useRef } from 'react';
import { getCachedModule, ExposedScalprumModule, getAppData, processManifest, getScalprum, RemoteModule } from '@scalprum/core';

export type ModuleDefinition = {
  scope: string;
  module: string;
  importName?: string;
  processor?: (item: any) => string[];
};

export type TypedModuleDefinition<S extends string, M extends string, I extends string | undefined = undefined> = Omit<
  ModuleDefinition,
  'scope' | 'module' | 'importName'
> & {
  scope: S;
  module: M;
  importName?: I;
};

export function useLoadModule<S extends string, M extends string, I extends string | undefined = undefined>(
  definition: TypedModuleDefinition<S, M, I>,
  defaultState?: RemoteModule<S, M, I>,
): [RemoteModule<S, M, I> | undefined, Error | undefined];
export function useLoadModule<T>(definition: ModuleDefinition, defaultState: any): [ExposedScalprumModule<T> | undefined, Error | undefined];
export function useLoadModule<T, S extends string = string, M extends string = string, I extends string | undefined = undefined>(
  { scope, module, importName, processor }: ModuleDefinition,
  defaultState?: T,
): [ExposedScalprumModule<T> | undefined, Error | undefined] {
  const { manifestLocation } = getAppData(scope);
  const [data, setData] = useState<ExposedScalprumModule>(defaultState as ExposedScalprumModule);
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
              setData(() => Module[importName || 'default']);
            })
            .catch((e: unknown) => {
              setError(() => e as Error);
            });
        }
      } else {
        try {
          pluginStore.getExposedModule<ExposedScalprumModule>(scope, module).then((Module: ExposedScalprumModule) => {
            setData(() => Module[importName || 'default']);
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
