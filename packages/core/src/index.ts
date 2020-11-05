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

export interface AppInitConfig<T> extends Omit<Omit<Scalplet<T>, 'nodeId'>, 'mount'> {
  id: string;
  name: string;
  mount(api: Scalprum<T>): void;
}

export type Scalprum<T = any> = T & {
  apps: {
    [key: string]: Scalplet<T>;
  };
  appsMetaData: AppsConfig;
  activeApps: {
    [key: string]: boolean;
  };
  scalpletRoutes: {
    [key: string]: string[];
  };
};
export interface Scalplet<T> {
  mount<A = void>(api?: T): A;
  unmount(...args: any[]): void;
  update(): void;
  nodeId: string;
}
declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    [GLOBAL_NAMESPACE]: Scalprum;
  }
}

export const getScalprum = <T = Record<string, unknown>>(): Scalprum<T> => window[GLOBAL_NAMESPACE];

const generateScalpletRoutes = (scalpLets: AppsConfig): { [key: string]: string[] } => {
  const routes: { [key: string]: string[] } = {};
  Object.values(scalpLets).forEach(({ rootLocation, name }) => {
    if (routes[rootLocation]) {
      routes[rootLocation].push(name);
    } else {
      routes[rootLocation] = [name];
    }
  });
  return routes;
};

export const initialize = <T = unknown>({ scalpLets, api }: { scalpLets: AppsConfig; api?: T }): void => {
  window[GLOBAL_NAMESPACE] = {
    apps: {},
    appsMetaData: scalpLets,
    activeApps: {},
    scalpletRoutes: generateScalpletRoutes(scalpLets),
    ...api,
  };
};

export const setActiveApp = (name: string): void => {
  window[GLOBAL_NAMESPACE].activeApps[name] = true;
};
export const removeActiveApp = (name: string): void => {
  window[GLOBAL_NAMESPACE].activeApps[name] = false;
};
export const unmountAppsFromRoute = (route: string): void => {
  window[GLOBAL_NAMESPACE].scalpletRoutes[route]?.forEach((name: string) => window[GLOBAL_NAMESPACE].apps[name].unmount());
};

export const unmountAll = (): void => {
  Object.entries(window[GLOBAL_NAMESPACE].activeApps).filter(([name, isActive]) => {
    if (isActive) {
      window[GLOBAL_NAMESPACE].apps[name].unmount();
    }
  });
};

export function initializeApp<T extends Record<string, unknown>>(configuration: AppInitConfig<T>): void {
  if (typeof window[GLOBAL_NAMESPACE] === 'undefined') {
    throw 'Cannot inititlize app. Scalprum was not inititliazed!';
  }
  window[GLOBAL_NAMESPACE].apps[configuration.name] = {
    mount: (api: T) => {
      const fullApi: Scalprum<T> = {
        ...api,
        ...window[GLOBAL_NAMESPACE],
      };
      setActiveApp(configuration.name);
      return configuration.mount(fullApi);
    },
    unmount: () => {
      removeActiveApp(configuration.name);
      configuration.unmount();
    },
    update: configuration.update,
    nodeId: configuration.id,
  };
}

export const getApp = <T = unknown>(name: string): Scalplet<T> => window[GLOBAL_NAMESPACE].apps[name];

export const getAppsByRootLocation = (pathname: string): AppMetadata[] => {
  return Object.keys(window[GLOBAL_NAMESPACE].appsMetaData)
    .filter((key) => window[GLOBAL_NAMESPACE].appsMetaData[key].rootLocation === pathname)
    .map((key) => ({
      ...window[GLOBAL_NAMESPACE].appsMetaData[key],
      name: key,
    }));
};

export * from './inject-script';
