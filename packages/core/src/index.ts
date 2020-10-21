export const GLOBAL_NAMESPACE = '__scalprum__';

export interface AppMetadata {
  name: string;
  appId: string;
  elementId: string;
  rootLocation: string;
  scriptLocation: string;
}
export interface AppsConfig {
  [key: string]: AppMetadata;
}

export interface AppInitConfig extends Omit<Scalplet, 'nodeId'> {
  id: string;
  name: string;
}

export interface Scalplet {
  mount(): void;
  unmount(): void;
  update(): void;
  nodeId: string;
}
export interface Scalprum {
  apps: {
    [key: string]: Scalplet;
  };
  appsMetaData: AppsConfig;
}
declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    [GLOBAL_NAMESPACE]: Scalprum;
  }
}

export const initialize = ({ scalpLets }: { scalpLets: AppsConfig }): void => {
  window[GLOBAL_NAMESPACE] = {
    apps: {},
    appsMetaData: scalpLets,
  };
};

export function initializeApp(configuration: AppInitConfig) {
  if (typeof window[GLOBAL_NAMESPACE] === 'undefined') {
    throw 'Cannot inititlize app. Scalprum was not inititliazed!';
  }
  window[GLOBAL_NAMESPACE].apps[configuration.name] = {
    mount: configuration.mount,
    unmount: configuration.unmount,
    update: configuration.update,
    nodeId: configuration.id,
  };

  configuration.mount();
}

export const getApp = (name: string): Scalplet => window[GLOBAL_NAMESPACE].apps[name];

export const getAppsByRootLocation = (pathname: string): AppMetadata[] => {
  return Object.keys(window[GLOBAL_NAMESPACE].appsMetaData)
    .filter((key) => window[GLOBAL_NAMESPACE].appsMetaData[key].rootLocation === pathname)
    .map((key) => ({
      ...window[GLOBAL_NAMESPACE].appsMetaData[key],
      name: key,
    }));
};
