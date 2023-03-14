import { PluginLoader, PluginStore, FeatureFlags, PluginLoaderOptions, PluginStoreOptions, PluginManifest } from '@openshift/dynamic-plugin-sdk';
import { warnDuplicatePkg } from './warnDuplicatePkg';
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

export type PrefetchFunction<T = any> = (ScalprumApi: Record<string, any> | undefined) => Promise<T>;
export type ExposedScalprumModule<T = any, P = any> = { default: T; prefetch?: PrefetchFunction<P> };
export type ScalprumModule<T = any, P = any> = {
  cachedModule?: ExposedScalprumModule<T, P>;
  prefetchPromise?: ReturnType<PrefetchFunction>;
};

export interface Factory<T = any, P = any> {
  init: (sharing: any) => void;
  modules: {
    [key: string]: ExposedScalprumModule<T, P>;
  };
  expiration: Date;
}

export interface ScalprumOptions {
  cacheTimeout: number;
  enableScopeWarning: boolean;
}

export type Scalprum<T extends Record<string, any> = Record<string, any>> = {
  appsConfig: AppsConfig;
  pendingInjections: {
    [key: string]: Promise<any>;
  };
  pendingLoading: {
    [key: string]: Promise<ScalprumModule>;
  };
  pendingPrefetch: {
    [key: string]: Promise<unknown>;
  };
  exposedModules: {
    [moduleId: string]: ExposedScalprumModule;
  };
  scalprumOptions: ScalprumOptions;
  api: T;
  pluginStore: PluginStore;
};

export type Container = Window & Factory;

declare function __webpack_init_sharing__(scope: string): void;
declare let __webpack_share_scopes__: any;

const SHARED_SCOPE_NAME = 'default';

let scalprum: Scalprum | undefined;

const getModuleIdentifier = (scope: string, module: string) => `${scope}#${module}`;

export const getScalprum = () => {
  if (!scalprum) {
    throw new Error('Scalprum was not initialized! Call the initialize function first.');
  }

  return scalprum;
};

export const initSharedScope = async () => __webpack_init_sharing__(SHARED_SCOPE_NAME);

/**
 * Get the webpack share scope object.
 */
export const getSharedScope = (enableScopeWarning?: boolean) => {
  if (!Object.keys(__webpack_share_scopes__).includes(SHARED_SCOPE_NAME)) {
    throw new Error('Attempt to access share scope object before its initialization');
  }

  const sharedScope = __webpack_share_scopes__[SHARED_SCOPE_NAME];
  if (enableScopeWarning) {
    warnDuplicatePkg(sharedScope);
  }

  return sharedScope;
};

export const handlePrefetchPromise = (id: string, prefetch?: Promise<any>) => {
  if (prefetch) {
    setPendingPrefetch(id, prefetch);
    prefetch.finally(() => {
      removePrefetch(id);
    });
  }
};

export const getCachedModule = <T = any, P = any>(scope: string, module: string): ScalprumModule<T, P> => {
  const moduleId = getModuleIdentifier(scope, module);
  try {
    const cachedModule = getScalprum().exposedModules[moduleId];
    if (!module) {
      return {};
    }

    const prefetchID = `${scope}#${module}`;
    const prefetchPromise = getPendingPrefetch(prefetchID);
    if (prefetchPromise) {
      return { cachedModule, prefetchPromise };
    }
    if (cachedModule?.prefetch) {
      handlePrefetchPromise(prefetchID, cachedModule.prefetch(getScalprum().api));
      return { cachedModule, prefetchPromise: getPendingPrefetch(prefetchID) };
    }
    return { cachedModule };
  } catch (error) {
    // If something goes wrong during the cache retrieval, reload module.
    console.warn(`Unable to retrieve cached module ${scope} ${module}. New module will be loaded.`, error);
    return {};
  }
};

export const setPendingPrefetch = (id: string, prefetch: Promise<any>): void => {
  getScalprum().pendingPrefetch[id] = prefetch;
};

export const getPendingPrefetch = (id: string): Promise<any> | undefined => {
  return getScalprum().pendingPrefetch?.[id];
};

export const removePrefetch = (id: string) => {
  delete getScalprum().pendingPrefetch[id];
};

export const resolvePendingInjection = (id: string) => {
  delete getScalprum().pendingInjections[id];
};

export const setPendingLoading = (scope: string, module: string, promise: Promise<any>): Promise<any> => {
  getScalprum().pendingLoading[`${scope}#${module}`] = promise;
  promise
    .then((data) => {
      delete getScalprum().pendingLoading[`${scope}#${module}`];
      return data;
    })
    .catch(() => {
      delete getScalprum().pendingLoading[`${scope}#${module}`];
    });
  return promise;
};

export const getPendingLoading = (scope: string, module: string): Promise<any> | undefined => {
  return getScalprum().pendingLoading[`${scope}#${module}`];
};

export const preloadModule = async (scope: string, module: string, processor?: (manifest: any) => string[]) => {
  const { manifestLocation } = getAppData(scope);
  const { cachedModule } = getCachedModule(scope, module);
  let modulePromise = getPendingLoading(scope, module);

  // lock preloading if module exists or is already being loaded
  if (!modulePromise && Object.keys(cachedModule || {}).length == 0 && manifestLocation) {
    modulePromise = processManifest(manifestLocation, scope, module, processor).then(() => getScalprum().pluginStore.getExposedModule(scope, module));
  }

  // add scalprum API later
  const prefetchID = `${scope}#${module}`;

  if (!getPendingPrefetch(prefetchID) && cachedModule?.prefetch) {
    handlePrefetchPromise(prefetchID, cachedModule.prefetch(getScalprum().api));
  }

  return setPendingLoading(scope, module, Promise.resolve(modulePromise));
};

export const initialize = <T extends Record<string, any> = Record<string, any>>({
  appsConfig,
  api,
  options,
  pluginStoreFeatureFlags = {},
  pluginLoaderOptions = {},
  pluginStoreOptions = {},
}: {
  appsConfig: AppsConfig;
  api?: T;
  options?: Partial<ScalprumOptions>;
  pluginStoreFeatureFlags?: FeatureFlags;
  pluginLoaderOptions?: PluginLoaderOptions;
  pluginStoreOptions?: PluginStoreOptions;
}): Scalprum<T> => {
  if (scalprum) {
    return scalprum as Scalprum<T>;
  }
  const defaultOptions: ScalprumOptions = {
    cacheTimeout: 120,
    enableScopeWarning: process.env.NODE_ENV === 'development',
    ...options,
  };

  // Create new plugin loader instance
  const pluginLoader = new PluginLoader({
    sharedScope: getSharedScope(defaultOptions.enableScopeWarning),
    getPluginEntryModule: ({ name }) => (window as { [key: string]: any })[name],
    ...pluginLoaderOptions,
  });

  // Create new plugin store
  const pluginStore = new PluginStore(pluginStoreOptions);
  pluginLoader.registerPluginEntryCallback();
  pluginStore.setLoader(pluginLoader);
  pluginStore.setFeatureFlags(pluginStoreFeatureFlags);

  scalprum = {
    appsConfig,
    pendingInjections: {},
    pendingLoading: {},
    pendingPrefetch: {},
    exposedModules: {},
    scalprumOptions: defaultOptions,
    api: api || {},
    pluginStore,
  };

  return scalprum as Scalprum<T>;
};

export const removeScalprum = () => {
  scalprum = undefined;
};

export const getAppData = (name: string): AppMetadata => getScalprum().appsConfig[name];

const setExposedModule = (moduleId: string, exposedModule: ExposedScalprumModule) => {
  getScalprum().exposedModules[moduleId] = exposedModule;
};

const clearPendingInjection = (scope: string) => {
  delete getScalprum().pendingInjections[scope];
};

const setPendingInjection = (scope: string, promise: Promise<any>) => {
  getScalprum().pendingInjections[scope] = promise;
};

const getPendingInjection = (scope: string): Promise<any> | undefined => getScalprum().pendingInjections[scope];

// PluginManifest typeguard
function isPluginManifest(manifest: any): manifest is PluginManifest {
  return (
    typeof manifest.name === 'string' &&
    typeof manifest.version === 'string' &&
    Array.isArray(manifest.extensions) &&
    Array.isArray(manifest.loadScripts)
  );
}

function extractBaseURL(path: string) {
  const result = path.split('/');
  // remove last section of pathname that inclides the JS filename
  result.pop();
  // make sure there is always at least leading / to satisfy sdk manifest validation
  return result.join('/') || '/';
}

export async function processManifest(url: string, scope: string, module: string, processor?: (manifest: any) => string[]): Promise<void> {
  let pendingInjection = getPendingInjection(scope);
  const { pluginStore } = getScalprum();
  if (pendingInjection) {
    await pendingInjection;
    const exposedModule = await pluginStore.getExposedModule<ExposedScalprumModule>(scope, module);
    setExposedModule(getModuleIdentifier(scope, module), exposedModule);
    return;
  }

  pendingInjection = (async () => {
    const headers = new Headers();
    headers.append('Pragma', 'no-cache');
    headers.append('Cache-Control', 'no-cache');
    headers.append('expires', '0');
    const manifestPromise = await fetch(url, {
      method: 'GET',
      headers,
    });
    // handle network errors
    if (!manifestPromise.ok) {
      const resClone = manifestPromise.clone();
      let data;
      try {
        data = await resClone.json();
      } catch (error) {
        throw new Error(`Unable to load manifest files at ${url}! ${resClone.status}: ${resClone.statusText}`);
      }
      throw new Error(`Unable to load manifest files at ${url}! ${data}`);
    }
    let manifest: PluginManifest | { [scope: string]: { entry: string[] } };
    try {
      manifest = await manifestPromise.json();
    } catch (error) {
      clearPendingInjection(scope);
      throw new Error(error as string);
    }
    let sdkManifest: PluginManifest;
    if (isPluginManifest(manifest)) {
      sdkManifest = manifest;
    } else {
      const loadScripts: string[] = processor ? processor(manifest) : manifest[scope].entry;
      const baseURL = extractBaseURL(loadScripts[0]);
      sdkManifest = {
        extensions: [],
        // remove base URL from script entry, baseURL is added by scalprum provider
        loadScripts: loadScripts.map((script) => script.replace(baseURL, '')),
        name: scope,
        registrationMethod: 'custom',
        version: '1.0.0',
        baseURL,
      };
    }
    await pluginStore.loadPlugin(sdkManifest.baseURL, sdkManifest);
    try {
      const exposedModule = await pluginStore.getExposedModule<ExposedScalprumModule>(scope, module);
      setExposedModule(getModuleIdentifier(scope, module), exposedModule);
      return;
    } catch (error) {
      clearPendingInjection(scope);
      throw new Error(error as string);
    }
  })();

  setPendingInjection(scope, pendingInjection);
  await pendingInjection;
  clearPendingInjection(scope);
}
