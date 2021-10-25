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

export type Scalprum<T = any> = T & {
  appsConfig: AppsConfig;
  pendingInjections: {
    [key: string]: () => void;
  };
};

export interface Container extends Window {
  init: (module: any) => void;
}

export interface IModule {
  default: any;
}

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    [GLOBAL_NAMESPACE]: Scalprum;
  }
}

declare function __webpack_init_sharing__(scope: string): void;
declare let __webpack_share_scopes__: any;

export const getScalprum = <T = Record<string, unknown>>(): Scalprum<T> => window[GLOBAL_NAMESPACE];

export const setPendingInjection = (id: string, callback: () => void): void => {
  window[GLOBAL_NAMESPACE].pendingInjections[id] = callback;
};

export const initialize = <T = unknown>({ appsConfig, api }: { appsConfig: AppsConfig; api?: T }): void => {
  window[GLOBAL_NAMESPACE] = {
    appsConfig,
    pendingInjections: {},
    ...api,
  };
};

export const getAppData = (name: string): AppMetadata => window[GLOBAL_NAMESPACE].appsConfig[name];

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

export async function asyncLoader(scope: string, module: string): Promise<IModule> {
  if (typeof scope === 'undefined' || scope.length === 0) {
    throw new Error("Scope can't be undefined or empty");
  }
  if (typeof module === 'undefined' || module.length === 0) {
    throw new Error("Module can't be undefined or empty");
  }

  if (!module.startsWith('./')) {
    console.warn(`Your module ${module} doesn't start with './' this indicates an error`);
  }

  await __webpack_init_sharing__('default');
  const container: Container = (window as { [key: string]: any })[scope];
  await container.init(__webpack_share_scopes__.default);
  const factory = await (window as { [key: string]: any })[scope].get(module);
  return factory();
}
