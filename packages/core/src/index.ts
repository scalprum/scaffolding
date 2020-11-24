export const GLOBAL_NAMESPACE = '__scalprum__';
export interface AppMetadata {
  name: string;
  appId?: string;
  elementId?: string;
  rootLocation?: string;
  scriptLocation?: string;
  manifestLocation?: string;
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
  pendingInjections: {
    [key: string]: () => void;
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
    if (rootLocation && routes[rootLocation]) {
      routes[rootLocation].push(name);
    } else if (rootLocation) {
      routes[rootLocation] = [name];
    }
  });
  return routes;
};

export const setPendingInjection = (id: string, callback: () => void): void => {
  window[GLOBAL_NAMESPACE].pendingInjections[id] = callback;
};

export const initialize = <T = unknown>({ scalpLets, api }: { scalpLets: AppsConfig; api?: T }): void => {
  window[GLOBAL_NAMESPACE] = {
    apps: {},
    appsMetaData: scalpLets,
    activeApps: {},
    scalpletRoutes: generateScalpletRoutes(scalpLets),
    pendingInjections: {},
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
  window[GLOBAL_NAMESPACE].pendingInjections[configuration.name]();
}

export const getApp = <T = unknown>(name: string): Scalplet<T> => window[GLOBAL_NAMESPACE].apps[name];
export const getAppData = (name: string): AppMetadata => window[GLOBAL_NAMESPACE].appsMetaData[name];

export const getAppsByRootLocation = (pathname: string): AppMetadata[] => {
  return Object.keys(window[GLOBAL_NAMESPACE].appsMetaData)
    .filter((key) => window[GLOBAL_NAMESPACE].appsMetaData[key].rootLocation === pathname)
    .map((key) => ({
      ...window[GLOBAL_NAMESPACE].appsMetaData[key],
      name: key,
    }));
};

export const injectScript = (
  appName: string,
  scriptLocation: string,
  skipPending: boolean | undefined = false
): Promise<[unknown, HTMLScriptElement | undefined]> => {
  let s: HTMLScriptElement | undefined = undefined;
  const injectionPromise: Promise<[unknown, HTMLScriptElement | undefined]> = new Promise((res, rej) => {
    s = document.createElement('script');
    s.src = scriptLocation;
    s.id = appName;
    if (skipPending) {
      s.onload = () => {
        res([name, s]);
      };
    } else {
      setPendingInjection(appName, () => res([name, s]));
    }
    s.onerror = (...args) => {
      console.log(args);
      if (skipPending) {
        rej([args, s]);
      } else {
        setPendingInjection(appName, () => rej([args, s]));
      }
    };
  });
  if (typeof s !== 'undefined') {
    document.body.appendChild(s);
  }

  return injectionPromise;
};

export async function processManifest(
  url: string,
  appName: string,
  scope: string,
  processor: ((value: any) => string) | undefined
): Promise<[unknown, HTMLScriptElement | undefined][]> {
  const manifest = await (await fetch(url)).json();
  return Promise.all(
    Object.entries(manifest)
      .filter(([key]) => (scope ? key === scope : true))
      .flatMap(processor || ((value: any) => (value[1] as { entry: string }).entry || value))
      .map((scriptLocation: any) => injectScript(appName, scriptLocation as string, true))
  );
}
