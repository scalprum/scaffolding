import { randomUUID } from 'node:crypto';
import { getInstance } from '@module-federation/enhanced/runtime';
import {
  applyCodeRefSymbol,
  cloneDeepOnlyCloneableValues,
  isEncodedCodeRef,
  parseEncodedCodeRef,
  type AnyObject,
  type CodeRef,
  type LoadedExtension,
  type PluginEntryModule,
  type PluginLoadResult,
  type PluginLoaderInterface,
  type PluginLoaderOptions,
  type PluginManifest,
  type RemotePluginManifest,
  type ResourceFetch,
} from '@openshift/dynamic-plugin-sdk';

type RemoteConfig = { name: string; entry: string; type: 'commonjs-module' };

/** Public Module surface used for container acquisition and host-managed initialization. */
interface EnhancedRemoteModule {
  init(id?: string, remoteSnapshot?: unknown): Promise<unknown>;
}

interface EnhancedRemoteHandler {
  getRemoteModuleAndOptions(options: { id: string }): Promise<{
    module: EnhancedRemoteModule;
    remoteMatchInfo: { remoteSnapshot?: unknown };
  }>;
}

/** Subset of an initialized enhanced runtime used by this adapter. */
export interface EnhancedRuntime {
  version?: string;
  registerRemotes(remotes: RemoteConfig[]): unknown;
  loadRemote<T extends AnyObject>(id: string): Promise<T | null>;
  remoteHandler?: Partial<EnhancedRemoteHandler>;
}

export interface NodePluginLoaderOptions extends Partial<PluginLoaderOptions> {
  /** Test/embedding seam for an already initialized runtime; this callback must not initialize it. */
  getRuntime?: () => EnhancedRuntime | undefined;
}

const readiness = new WeakMap<EnhancedRuntime, Map<string, Promise<void>>>();
const remoteEntryPattern = /^remoteEntry(?:\.(?:js|cjs|mjs))?$/i;

function isEnhancedRuntime(value: unknown): value is EnhancedRuntime {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'registerRemotes') === 'function' &&
    typeof Reflect.get(value, 'loadRemote') === 'function'
  );
}

function runtimeFor(options: NodePluginLoaderOptions): EnhancedRuntime | undefined {
  if (options.getRuntime) {
    return options.getRuntime();
  }

  const instance: unknown = getInstance();
  return isEnhancedRuntime(instance) ? instance : undefined;
}

function isRemotePluginManifest(value: unknown): value is RemotePluginManifest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const name = Reflect.get(value, 'name');
  const version = Reflect.get(value, 'version');
  const baseURL = Reflect.get(value, 'baseURL');
  const extensions = Reflect.get(value, 'extensions');
  const loadScripts = Reflect.get(value, 'loadScripts');
  const registrationMethod = Reflect.get(value, 'registrationMethod');

  return (
    typeof name === 'string' &&
    name.length > 0 &&
    typeof version === 'string' &&
    typeof baseURL === 'string' &&
    Array.isArray(extensions) &&
    extensions.every((extension: unknown) => {
      if (typeof extension !== 'object' || extension === null) {
        return false;
      }
      const properties = Reflect.get(extension, 'properties');
      return (
        typeof Reflect.get(extension, 'type') === 'string' && typeof properties === 'object' && properties !== null && !Array.isArray(properties)
      );
    }) &&
    Array.isArray(loadScripts) &&
    loadScripts.every((script: unknown) => typeof script === 'string') &&
    (registrationMethod === 'callback' || registrationMethod === 'custom')
  );
}

function findRemoteEntry(manifest: RemotePluginManifest): string {
  const entry = manifest.loadScripts.find((script) => {
    const pathname = script.split(/[?#]/, 1)[0];
    const filename = pathname.slice(pathname.lastIndexOf('/') + 1);
    return remoteEntryPattern.test(filename);
  });

  if (!entry) {
    throw new Error(`Plugin "${manifest.name}" has no declared remoteEntry in its transformed loadScripts.`);
  }

  // Keep producer URL verbatim, including public path and query string.
  return entry;
}

function getModuleRequest(pluginName: string, publicCommand: string): string {
  const unqualified = publicCommand.startsWith(`${pluginName}/`) ? publicCommand.slice(pluginName.length + 1) : publicCommand;
  const expose = unqualified.startsWith('./') ? unqualified.slice(2) : unqualified;
  if (!expose) {
    throw new Error(`Plugin "${pluginName}" has an empty exposed module request.`);
  }
  return `${pluginName}/${expose}`;
}

function readinessApiError(runtime: EnhancedRuntime): string {
  const version = typeof runtime.version === 'string' ? runtime.version : 'unknown';
  return (
    `Unsupported @module-federation/enhanced host runtime version "${version}": remote readiness requires the Enhanced 2.9.0 API ` +
    'remoteHandler.getRemoteModuleAndOptions({ id }) and the returned module.init(id, remoteSnapshot). ' +
    'Initialize a compatible Enhanced host before loading plugins.'
  );
}

function registerRemote(runtime: EnhancedRuntime, manifest: RemotePluginManifest, entry: string): Promise<void> {
  let cache = readiness.get(runtime);
  if (!cache) {
    cache = new Map();
    readiness.set(runtime, cache);
  }

  const key = `${manifest.name}\u0000${entry}`;
  const existing = cache.get(key);
  if (existing) {
    return existing;
  }

  const pending = Promise.resolve().then(async () => {
    const remoteHandler = runtime.remoteHandler;
    if (typeof remoteHandler?.getRemoteModuleAndOptions !== 'function') {
      throw new Error(readinessApiError(runtime));
    }

    await runtime.registerRemotes([{ name: manifest.name, entry, type: 'commonjs-module' }]);

    const { module, remoteMatchInfo } = await remoteHandler.getRemoteModuleAndOptions({ id: manifest.name });
    if (!module || typeof module.init !== 'function') {
      throw new Error(`Enhanced runtime returned no initializable module for plugin "${manifest.name}".`);
    }

    // Enhanced Module.init owns remoteEntry acquisition and all host share-scope/container setup.
    // Deliberately do not call remoteEntryExports.init or request/execute an exposed module here.
    await module.init(manifest.name, remoteMatchInfo?.remoteSnapshot);
  });
  cache.set(key, pending);
  void pending.catch(() => {
    if (cache?.get(key) === pending) {
      cache.delete(key);
    }
  });
  return pending;
}

function createEntryModule(runtime: EnhancedRuntime, manifest: RemotePluginManifest): PluginEntryModule {
  return {
    // The Rspack host owns shared-module setup. SDK invokes this compatibility hook;
    // the adapter intentionally does not call remote init or manipulate a share scope.
    init: () => undefined,
    get: async <TModule extends AnyObject>(moduleRequest: string) => {
      const module: unknown = await runtime.loadRemote<TModule>(getModuleRequest(manifest.name, moduleRequest));
      if (module === null || module === undefined) {
        throw new Error(`Enhanced runtime returned no module for plugin "${manifest.name}" request "${moduleRequest}".`);
      }
      return () => module as TModule;
    },
  };
}

function decodeCodeRefValue(encoded: { $codeRef: string }, entryModule: PluginEntryModule, extensionUid: string): CodeRef {
  const codeRef: CodeRef = async () => {
    const reference = parseEncodedCodeRef(encoded);
    if (!reference) {
      throw new Error(`Invalid code reference '${encoded.$codeRef}' in extension ${extensionUid}`);
    }

    let module: AnyObject;
    try {
      const moduleFactory = await entryModule.get(reference.moduleName);
      module = moduleFactory();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load module '${reference.moduleName}' in extension ${extensionUid}: ${message}`);
    }

    if (!Object.prototype.hasOwnProperty.call(module, reference.exportName)) {
      throw new Error(`Missing module export '${reference.moduleName}.${reference.exportName}' in extension ${extensionUid}`);
    }

    return Reflect.get(module, reference.exportName);
  };
  return applyCodeRefSymbol(codeRef);
}

function decodeCodeRefs(extension: LoadedExtension, entryModule: PluginEntryModule): void {
  const visit = (value: unknown): unknown => {
    if (isEncodedCodeRef(value)) {
      return decodeCodeRefValue(value, entryModule, extension.uid);
    }
    if (Array.isArray(value)) {
      return value.map(visit);
    }
    if (typeof value === 'object' && value !== null) {
      const clone: Record<string, unknown> = {};
      for (const [key, nested] of Object.entries(value)) {
        clone[key] = visit(nested);
      }
      return clone;
    }
    return value;
  };

  const properties = visit(extension.properties);
  if (typeof properties === 'object' && properties !== null) {
    Reflect.set(extension, 'properties', properties);
  }
}

function createLoadedExtensions(manifest: PluginManifest, entryModule?: PluginEntryModule): LoadedExtension[] {
  const buildHash = manifest.registrationMethod === 'local' ? randomUUID() : manifest.buildHash ?? randomUUID();

  return manifest.extensions.map((extension, index) => {
    const loaded = Object.assign(cloneDeepOnlyCloneableValues(extension), {
      pluginName: manifest.name,
      uid: `${manifest.name}[${index}]_${buildHash}`,
    });
    if (entryModule) {
      decodeCodeRefs(loaded, entryModule);
    }
    return loaded;
  });
}

function failureResult(errorMessage: string, errorCause?: unknown): PluginLoadResult {
  return { success: false, errorMessage, ...(errorCause !== undefined ? { errorCause } : {}) };
}

function validateOptions(options: NodePluginLoaderOptions): void {
  if (options.sharedScope !== undefined) {
    throw new Error('not implemented yet; configure sharing in Rspack');
  }

  const unsupported: string[] = [];
  if (options.canReloadScript !== undefined) unsupported.push('canReloadScript');
  if (options.entryCallbackSettings !== undefined) unsupported.push('entryCallbackSettings');
  if (options.customDependencyResolutions !== undefined) unsupported.push('customDependencyResolutions');
  if (options.isDependencyResolvable !== undefined) unsupported.push('isDependencyResolvable');
  if (options.getPluginEntryModule !== undefined) unsupported.push('getPluginEntryModule');

  if (unsupported.length > 0) {
    throw new Error(`Unsupported SDK loader option(s): ${unsupported.join(', ')}.`);
  }
}

/** Create a Node adapter for SDK 9.1's PluginLoaderInterface. */
export function createNodePluginLoader(options: NodePluginLoaderOptions = {}): PluginLoaderInterface {
  validateOptions(options);

  const fetchImpl: ResourceFetch = options.fetchImpl ?? ((url, requestInit) => fetch(url, requestInit));
  const transformedManifests = new WeakMap<PluginManifest, PluginManifest>();
  const processedPlugins = new Set<string>();
  const pendingLoads = new Map<string, Promise<PluginLoadResult>>();

  const loadPluginOnce = async (manifest: PluginManifest, reload: boolean): Promise<PluginLoadResult> => {
    try {
      if (!(options.canLoadPlugin ?? (() => true))(manifest, reload)) {
        return failureResult(`Plugin ${manifest.name} is not allowed to be ${reload ? 'reloaded' : 'loaded'}`);
      }

      if (Object.keys(manifest.dependencies ?? {}).length > 0 || Object.keys(manifest.optionalDependencies ?? {}).length > 0) {
        return failureResult(`Plugin dependency resolution is not supported by @scalprum/node-loader (plugin ${manifest.name})`);
      }

      if (manifest.registrationMethod === 'local') {
        return { success: true, loadedExtensions: createLoadedExtensions(manifest) };
      }

      if (manifest.registrationMethod !== 'custom') {
        return failureResult(`Plugin ${manifest.name} uses unsupported callback registration; use custom registration`);
      }

      const runtime = runtimeFor(options);
      if (!runtime) {
        return failureResult(
          'No initialized @module-federation/enhanced host runtime was found. Initialize the host first, then inject this loader into Scalprum.',
        );
      }

      const entry = findRemoteEntry(manifest);
      await registerRemote(runtime, manifest, entry);
      const entryModule = createEntryModule(runtime, manifest);
      return { success: true, loadedExtensions: createLoadedExtensions(manifest, entryModule), entryModule };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return failureResult(`Failed to load plugin ${manifest.name}: ${message}`, error);
    }
  };

  const loader: PluginLoaderInterface = {
    async loadPluginManifest(manifestURL: string): Promise<RemotePluginManifest> {
      const response = await fetchImpl(manifestURL, { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`Unable to load plugin manifest at ${manifestURL}: ${response.status} ${response.statusText}`);
      }

      let manifest: unknown;
      try {
        manifest = JSON.parse(await response.text()) as unknown;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Unable to parse plugin manifest at ${manifestURL}: ${message}`);
      }

      if (!isRemotePluginManifest(manifest)) {
        throw new Error(`Invalid remote plugin manifest at ${manifestURL}`);
      }
      return manifest;
    },

    transformPluginManifest<T extends PluginManifest>(manifest: T): T {
      const cached = transformedManifests.get(manifest);
      if (cached) {
        return cached as T;
      }

      const clone = cloneDeepOnlyCloneableValues(manifest);
      const transformManifest = options.transformPluginManifest;
      const transformed = transformManifest ? transformManifest(clone) : clone;
      transformedManifests.set(manifest, transformed);
      transformedManifests.set(transformed, transformed);
      return transformed;
    },

    loadPlugin(manifest: PluginManifest): Promise<PluginLoadResult> {
      const pending = pendingLoads.get(manifest.name);
      if (pending) {
        return pending;
      }

      const reload = processedPlugins.has(manifest.name);
      processedPlugins.add(manifest.name);
      const request = loadPluginOnce(manifest, reload);
      pendingLoads.set(manifest.name, request);
      request.then(
        () => pendingLoads.delete(manifest.name),
        () => pendingLoads.delete(manifest.name),
      );
      return request;
    },
  };

  return loader;
}

export type {
  LoadedExtension,
  PluginEntryModule,
  PluginLoadResult,
  PluginLoaderInterface,
  PluginLoaderOptions,
  PluginManifest,
  RemotePluginManifest,
};
