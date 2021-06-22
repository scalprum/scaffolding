import React, { useEffect, useState } from 'react';
import { initialize, AppsConfig } from '@scalprum/core';
import { ScalprumContext } from './scalprum-context';

export type ScalprumFeed = AppsConfig | (() => AppsConfig) | (() => Promise<AppsConfig>);

export interface ScalprumState<T = Record<string, unknown>> {
  initialized: boolean;
  config: AppsConfig;
  api?: T;
}

export interface ScalprumProviderProps<T = Record<string, unknown>> {
  config: ScalprumFeed;
  api?: T;
  children: React.ReactNode;
}

export function ScalprumProvider<T = Record<string, unknown>>({
  config,
  children,
  api,
}: ScalprumProviderProps): React.ReactElement | React.ReactElement {
  const [state, setState] = useState<ScalprumState<T>>({
    initialized: false,
    config: {},
    api: api as T,
  });
  useEffect(() => {
    if (typeof config === 'object') {
      initialize<T>({ scalpLets: config as AppsConfig, api: api as T });
      setState((prev) => ({ ...prev, initialized: true, config: config as AppsConfig }));
    }

    if (typeof config === 'function') {
      Promise.resolve(config()).then((config) => {
        setState((prev) => ({ ...prev, initialized: true, config: config as AppsConfig }));
        initialize<T>({ scalpLets: config as AppsConfig, api: api as T });
      });
    }
  }, [config]);

  return <ScalprumContext.Provider value={state as ScalprumState<Record<string, unknown>>}>{children}</ScalprumContext.Provider>;
}
