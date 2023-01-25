import { useEffect, useState, useCallback } from 'react';
import { getCachedModule, ExposedScalprumModule, getScalprum } from '@scalprum/core';

export function useModule(scope: string, module: string, defaultState: any): ExposedScalprumModule | undefined {
  const [data, setData] = useState<ExposedScalprumModule>(defaultState);
  const { pluginStore } = getScalprum();
  const fetchModule = useCallback(async () => {
    const { cachedModule } = getCachedModule(scope, module);
    let Module: ExposedScalprumModule;
    if (!cachedModule) {
      try {
        Module = await pluginStore.getExposedModule(scope, module);
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
