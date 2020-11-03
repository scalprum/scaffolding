import { useEffect, useState } from 'react';
import { initialize, AppsConfig } from '@scalprum/core';
export * from './scalprum-route';
export * from './scalprum-link';

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
      const result = applicationFeed();
      if (Object.prototype.hasOwnProperty.call(result, 'then')) {
        (result as Promise<AppsConfig>).then((config) => {
          setState((prev) => ({ ...prev, initialized: true, config }));
          initialize<T>({ scalpLets: config, api });
        });
      } else {
        setState((prev) => ({ ...prev, initialized: true, config: result as AppsConfig }));
        initialize<T>({ scalpLets: result as AppsConfig, api });
      }
    }
  }, []);

  return state;
};
