import React, { useEffect, useRef, useState } from 'react';
import { initialize, AppsConfig } from '@scalprum/core';
import { ScalprumContext } from './scalprum-context';

export type ScalprumFeed = AppsConfig | (() => AppsConfig) | (() => Promise<AppsConfig>);

export interface ScalprumState<T extends Record<string, any> = Record<string, any>> {
  initialized: boolean;
  config: AppsConfig;
  api?: T;
}

export interface ScalprumProviderProps<T extends Record<string, any> = Record<string, any>> {
  config: ScalprumFeed;
  api?: T;
  children?: React.ReactNode;
}

export function ScalprumProvider<T extends Record<string, any> = Record<string, any>>({
  config,
  children,
  api,
}: ScalprumProviderProps<T>): React.ReactElement | React.ReactElement {
  const mounted = useRef(false);
  const [state, setState] = useState<ScalprumState<T>>({
    initialized: false,
    config: {},
    api,
  });
  useEffect(() => {
    if (typeof config === 'object') {
      initialize<T>({ appsConfig: config, api: api as T });
      setState((prev) => ({ ...prev, initialized: true, config }));
      mounted.current = true;
    }

    if (typeof config === 'function') {
      Promise.resolve(config()).then((config) => {
        setState((prev) => ({ ...prev, initialized: true, config }));
        initialize<T>({ appsConfig: config, api: api as T });
        mounted.current = true;
      });
    }
  }, [config]);

  useEffect(() => {
    if (mounted.current) {
      setState((prev) => ({
        ...prev,
        api,
      }));
    }
  }, [api]);

  return <ScalprumContext.Provider value={state as ScalprumState<Record<string, any>>}>{children}</ScalprumContext.Provider>;
}
