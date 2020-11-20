import { useEffect, useState } from 'react';
import { initialize, AppsConfig } from '@scalprum/core';
export * from './scalprum-route';
export * from './scalprum-link';
export * from './scalprum-component';

/**
 * This is totally random implemenetaion of something that does not exists yet. I needed some react code to setup tests.
 */

export type ScalprumFeed = AppsConfig | (() => AppsConfig) | (() => Promise<AppsConfig>);

export interface ScalprumState<T = Record<string, unknown>> {
  initialized: boolean;
  config: AppsConfig;
  api?: T;
}

export const useScalprum = <T = Record<string, unknown>>(applicationFeed: ScalprumFeed, api?: T): ScalprumState<T> => {
  const [state, setState] = useState<ScalprumState<T>>({
    initialized: false,
    config: {},
    api,
  });

  useEffect(() => {
    if (typeof applicationFeed === 'object') {
      initialize<T>({ scalpLets: applicationFeed as AppsConfig, api });
      setState((prev) => ({ ...prev, initialized: true, config: applicationFeed as AppsConfig }));
    }

    if (typeof applicationFeed === 'function') {
      Promise.resolve(applicationFeed()).then((config) => {
        setState((prev) => ({ ...prev, initialized: true, config: config as AppsConfig }));
        initialize<T>({ scalpLets: config as AppsConfig, api });
      });
    }
  }, []);

  return state;
};
