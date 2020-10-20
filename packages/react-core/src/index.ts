import { useEffect, useState } from 'react';
import { initialize } from '@scalprum/core';

/**
 * This is totally random implemenetaion of something that does not exists yet. I needed some react code to setup tests.
 */

interface AppConfig {
  appId: string;
  elementId: string;
  rootLocation: string;
}

export type ScalprumFeed = AppConfig[] | (() => AppConfig[]) | (() => Promise<AppConfig[]>);

export interface ScalprumState {
  initialized: boolean;
  config: AppConfig[];
}

const useScalprum = (applicationFeed: ScalprumFeed): ScalprumState => {
  const [state, setState] = useState<ScalprumState>({
    initialized: false,
    config: [],
  });

  useEffect(() => {
    initialize('random text');
    if (Array.isArray(applicationFeed)) {
      setState({ initialized: true, config: applicationFeed });
    }

    if (typeof applicationFeed === 'function') {
      const result = applicationFeed();
      if (Object.prototype.hasOwnProperty.call(result, 'then')) {
        (result as Promise<AppConfig[]>).then((config) => setState({ initialized: true, config }));
      } else {
        setState({ initialized: true, config: result as AppConfig[] });
      }
    }
  }, []);

  return state;
};

export default useScalprum;
