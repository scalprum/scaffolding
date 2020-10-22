import { useEffect, useState } from 'react';
import { initialize, AppsConfig } from '@scalprum/core';
export * from './scalplet-route';

/**
 * This is totally random implemenetaion of something that does not exists yet. I needed some react code to setup tests.
 */

export type ScalprumFeed = AppsConfig | (() => AppsConfig) | (() => Promise<AppsConfig>);

export interface ScalprumState {
  initialized: boolean;
  config: AppsConfig;
}

export const useScalprum = (applicationFeed: ScalprumFeed): ScalprumState => {
  const [state, setState] = useState<ScalprumState>({
    initialized: false,
    config: {},
  });

  useEffect(() => {
    if (typeof applicationFeed === 'object') {
      initialize({ scalpLets: applicationFeed as AppsConfig });
      setState({ initialized: true, config: applicationFeed as AppsConfig });
    }

    if (typeof applicationFeed === 'function') {
      const result = applicationFeed();
      if (Object.prototype.hasOwnProperty.call(result, 'then')) {
        (result as Promise<AppsConfig>).then((config) => {
          setState({ initialized: true, config });
          initialize({ scalpLets: config });
        });
      } else {
        setState({ initialized: true, config: result as AppsConfig });
        initialize({ scalpLets: result as AppsConfig });
      }
    }
  }, []);

  return state;
};
