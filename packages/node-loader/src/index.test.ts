import { isCodeRef, type AnyObject, type PluginLoaderOptions, type PluginManifest, type RemotePluginManifest } from '@openshift/dynamic-plugin-sdk';
import { createNodePluginLoader, type EnhancedRuntime } from './index';

const makeManifest = (loadScripts: string[] = ['/assets/chunk.js', '/assets/remoteEntry.cjs?v=4']): RemotePluginManifest => ({
  name: 'producer',
  version: '1.0.0',
  registrationMethod: 'custom',
  baseURL: '/assets',
  loadScripts,
  extensions: [
    { type: 'test/extension', properties: { component: { $codeRef: 'command.named' } } },
    { type: 'test/extension', properties: { component: { $codeRef: 'command' } } },
  ],
});

function makeRuntime(overrides: Partial<EnhancedRuntime> = {}): EnhancedRuntime {
  return {
    registerRemotes: jest.fn(),
    loadRemote: async <T extends AnyObject>(): Promise<T | null> => ({}) as T,
    remoteHandler: {
      getRemoteModuleAndOptions: async () => ({
        module: { init: async () => undefined },
        remoteMatchInfo: {},
      }),
    },
    ...overrides,
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const key of Reflect.ownKeys(value)) {
      deepFreeze(Reflect.get(value, key));
    }
    Object.freeze(value);
  }
  return value;
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('@scalprum/node-loader SDK contract', () => {
  it('acquires and validates remote manifests with fetchImpl', async () => {
    const manifest = makeManifest();
    const fetchImpl = jest.fn(async () => new Response(JSON.stringify(manifest), { status: 200 }));
    const loader = createNodePluginLoader({ fetchImpl });

    await expect(loader.loadPluginManifest('/manifest.json')).resolves.toEqual(manifest);
    expect(fetchImpl).toHaveBeenCalledWith('/manifest.json', { cache: 'no-cache' });

    const invalid = createNodePluginLoader({
      fetchImpl: async () => new Response(JSON.stringify({ name: 'missing-fields' }), { status: 200 }),
    });
    await expect(invalid.loadPluginManifest('/invalid.json')).rejects.toThrow('Invalid remote plugin manifest');
  });

  it('uses generic transform output once per original and transformed manifest without mutating input', () => {
    const original = makeManifest();
    let transformCalls = 0;
    const transform: NonNullable<PluginLoaderOptions['transformPluginManifest']> = <T extends PluginManifest>(manifest: T): T => {
      transformCalls += 1;
      manifest.name = 'transformed';
      return manifest;
    };
    const loader = createNodePluginLoader({ transformPluginManifest: transform });

    const transformed = loader.transformPluginManifest(original);
    expect(transformed.name).toBe('transformed');
    expect(loader.transformPluginManifest(original)).toBe(transformed);
    expect(loader.transformPluginManifest(transformed)).toBe(transformed);
    expect(transformCalls).toBe(1);
    expect(original.name).toBe('producer');
  });

  it('returns SDK-loaded extensions and a lazy entry module using encoded SDK code refs', async () => {
    const registerRemotes = jest.fn();
    const initRemote = jest.fn(async () => undefined);
    const getRemoteModuleAndOptions = jest.fn(async () => ({
      module: { init: initRemote },
      remoteMatchInfo: { remoteSnapshot: { modules: [] } },
    }));
    const remoteModule: AnyObject = { default: 'default export', named: 'named export' };
    const loadRemote = jest.fn(async <T extends AnyObject>(id: string): Promise<T | null> => {
      expect(id).toBe('producer/command');
      return remoteModule as T;
    }) as EnhancedRuntime['loadRemote'] & jest.Mock;
    const runtime = makeRuntime({
      registerRemotes,
      loadRemote,
      remoteHandler: { getRemoteModuleAndOptions },
    });
    const loader = createNodePluginLoader({ getRuntime: () => runtime });
    const manifest = makeManifest();
    const originalJson = JSON.stringify(manifest);

    const result = await loader.loadPlugin(manifest);
    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.errorMessage);
    }

    expect(result.loadedExtensions[0]).toEqual(
      expect.objectContaining({ pluginName: 'producer', uid: expect.stringMatching(/^producer\[0\]_/), type: 'test/extension' }),
    );
    expect(registerRemotes).toHaveBeenCalledWith([{ name: 'producer', entry: '/assets/remoteEntry.cjs?v=4', type: 'commonjs-module' }]);
    expect(getRemoteModuleAndOptions).toHaveBeenCalledWith({ id: 'producer' });
    expect(initRemote).toHaveBeenCalledWith('producer', { modules: [] });
    expect(JSON.stringify(manifest)).toBe(originalJson);
    expect(result.entryModule).toBeDefined();
    expect(loadRemote).not.toHaveBeenCalled();

    const component = result.loadedExtensions[0].properties.component;
    expect(isCodeRef(component)).toBe(true);
    if (!isCodeRef(component)) {
      throw new Error('SDK did not recognize decoded CodeRef');
    }
    await expect(component()).resolves.toBe('named export');
    expect(loadRemote).toHaveBeenCalledTimes(1);

    const defaultComponent = result.loadedExtensions[1].properties.component;
    expect(isCodeRef(defaultComponent)).toBe(true);
    if (!isCodeRef(defaultComponent)) {
      throw new Error('SDK did not recognize default CodeRef');
    }
    await expect(defaultComponent()).resolves.toBe('default export');
    expect(loadRemote).toHaveBeenCalledTimes(2);

    if (!result.entryModule) {
      throw new Error('Expected a loaded entry module');
    }
    const moduleFactory = await result.entryModule.get('./command');
    expect(moduleFactory().named).toBe('named export');
    expect(loadRemote).toHaveBeenCalledWith('producer/command');
  });

  it.each([null, undefined])('rejects nullish module result %s instead of returning a misleading factory', async (missing) => {
    const runtime = makeRuntime({ loadRemote: async <T extends AnyObject>() => missing as unknown as T | null });
    const loader = createNodePluginLoader({ getRuntime: () => runtime });
    const result = await loader.loadPlugin(makeManifest());

    expect(result.success).toBe(true);
    if (!result.success || !result.entryModule) {
      throw new Error('Expected a loaded remote entry module');
    }

    await expect(result.entryModule.get('./command')).rejects.toThrow(
      'Enhanced runtime returned no module for plugin "producer" request "./command".',
    );
  });

  it('decodes CodeRefs from deeply frozen manifests without mutating the source', async () => {
    const manifest = deepFreeze(makeManifest());
    const originalJson = JSON.stringify(manifest);
    const loader = createNodePluginLoader({ getRuntime: () => makeRuntime() });

    const result = await loader.loadPlugin(manifest);

    expect(result.success).toBe(true);
    expect(JSON.stringify(manifest)).toBe(originalJson);
    if (result.success) {
      expect(isCodeRef(result.loadedExtensions[0].properties.component)).toBe(true);
    }
  });

  it('registers the exact remoteEntry URL and query from the transformed manifest', async () => {
    const entry = 'https://cdn.example.test/plugins/v7/remoteEntry.cjs?build=42&kind=cjs';
    const registerRemotes = jest.fn();
    const transformPluginManifest: NonNullable<PluginLoaderOptions['transformPluginManifest']> = <T extends PluginManifest>(manifest: T): T => {
      (manifest as RemotePluginManifest).loadScripts = ['/assets/chunk.js', entry];
      return manifest;
    };
    const runtime = makeRuntime({ registerRemotes });
    const loader = createNodePluginLoader({ getRuntime: () => runtime, transformPluginManifest });
    const original = makeManifest();
    const originalEntry = original.loadScripts[1];
    const transformed = loader.transformPluginManifest(original);

    const result = await loader.loadPlugin(transformed);

    expect(result.success).toBe(true);
    expect(registerRemotes).toHaveBeenCalledWith([{ name: 'producer', entry, type: 'commonjs-module' }]);
    expect(original.loadScripts[1]).toBe(originalEntry);
  });

  it.each(['remoteEntry.abc123.js', 'remoteEntry.abc123.cjs', 'remoteEntry.abc123.mjs'])(
    'recognizes hashed remote entry filename %s without selecting other scripts',
    async (filename) => {
      const entry = `https://cdn.example.test/plugins/${filename}?build=42`;
      const registerRemotes = jest.fn();
      const result = await createNodePluginLoader({ getRuntime: () => makeRuntime({ registerRemotes }) }).loadPlugin(
        makeManifest([`/assets/${filename.replace('remoteEntry', 'chunk')}`, entry]),
      );

      expect(result.success).toBe(true);
      expect(registerRemotes).toHaveBeenCalledWith([{ name: 'producer', entry, type: 'commonjs-module' }]);
    },
  );

  it('rejects custom entry filenames rather than guessing from loadScripts order', async () => {
    const registerRemotes = jest.fn();
    const result = await createNodePluginLoader({ getRuntime: () => makeRuntime({ registerRemotes }) }).loadPlugin(
      makeManifest(['/assets/custom-entry.cjs', '/assets/chunk.js']),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorMessage).toContain('no declared remoteEntry');
    }
    expect(registerRemotes).not.toHaveBeenCalled();
  });

  it('supports local manifests without a federation host and honors canLoadPlugin reload state', async () => {
    const local: PluginManifest = {
      name: 'local-plugin',
      version: '1.0.0',
      registrationMethod: 'local',
      extensions: [{ type: 'test/local', properties: {} }],
    };
    const canLoadPlugin = jest.fn((_manifest: PluginManifest, reload: boolean) => !reload);
    const loader = createNodePluginLoader({ canLoadPlugin, getRuntime: () => undefined });

    const first = await loader.loadPlugin(local);
    expect(first.success).toBe(true);
    if (first.success) {
      expect(first.entryModule).toBeUndefined();
      expect(first.loadedExtensions[0].pluginName).toBe('local-plugin');
    }
    const reload = await loader.loadPlugin(local);
    expect(reload.success).toBe(false);
    if (!reload.success) {
      expect(reload.errorMessage).toContain('not allowed to be reloaded');
    }
    expect(canLoadPlugin).toHaveBeenNthCalledWith(1, local, false);
    expect(canLoadPlugin).toHaveBeenNthCalledWith(2, local, true);
  });

  it('allows retry after an unsuccessful first load and marks only success as a reload', async () => {
    const canLoadPlugin = jest.fn((_manifest: PluginManifest, reload: boolean) => !reload);
    const registerRemotes = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('first registration failed');
      })
      .mockImplementation(() => undefined);
    const runtime = makeRuntime({ registerRemotes });
    const remote = makeManifest();
    remote.name = 'retry-plugin';
    const remoteLoader = createNodePluginLoader({
      canLoadPlugin,
      getRuntime: () => runtime,
    });
    const first = await remoteLoader.loadPlugin(remote);
    expect(first.success).toBe(false);
    const retry = await remoteLoader.loadPlugin(remote);
    expect(retry.success).toBe(true);
    const subsequentReload = await remoteLoader.loadPlugin(remote);
    expect(subsequentReload.success).toBe(false);
    expect(canLoadPlugin).toHaveBeenNthCalledWith(1, remote, false);
    expect(canLoadPlugin).toHaveBeenNthCalledWith(2, remote, false);
    expect(canLoadPlugin).toHaveBeenNthCalledWith(3, remote, true);
    expect(registerRemotes).toHaveBeenCalledTimes(2);
  });

  it('passes reload=true for a later permitted reload after a successful load', async () => {
    const local: PluginManifest = {
      name: 'reload-plugin',
      version: '1.0.0',
      registrationMethod: 'local',
      extensions: [],
    };
    const canLoadPlugin = jest.fn((_manifest: PluginManifest, _reload: boolean) => true);
    const loader = createNodePluginLoader({ canLoadPlugin });

    expect((await loader.loadPlugin(local)).success).toBe(true);
    expect((await loader.loadPlugin(local)).success).toBe(true);
    expect(canLoadPlugin).toHaveBeenNthCalledWith(1, local, false);
    expect(canLoadPlugin).toHaveBeenNthCalledWith(2, local, true);
  });

  it('awaits remote acquisition and initialization while coalescing readiness across loaders', async () => {
    const registration = deferred<void>();
    const acquisition = deferred<{
      module: { init: () => Promise<void> };
      remoteMatchInfo: { remoteSnapshot: { modules: string[] } };
    }>();
    const initialization = deferred<void>();
    const acquireStarted = deferred<void>();
    const initStarted = deferred<void>();
    const registerRemotes = jest.fn(() => registration.promise);
    const getRemoteModuleAndOptions = jest.fn(() => {
      acquireStarted.resolve(undefined);
      return acquisition.promise;
    });
    const initRemote = jest.fn(() => {
      initStarted.resolve(undefined);
      return initialization.promise;
    });
    const runtime = makeRuntime({
      registerRemotes,
      remoteHandler: { getRemoteModuleAndOptions },
    });
    const loaderA = createNodePluginLoader({ getRuntime: () => runtime });
    const loaderB = createNodePluginLoader({ getRuntime: () => runtime });
    const manifest = makeManifest();

    const first = loaderA.loadPlugin(manifest);
    const second = loaderB.loadPlugin(manifest);
    await Promise.resolve();
    expect(registerRemotes).toHaveBeenCalledTimes(1);
    registration.resolve(undefined);
    await acquireStarted.promise;
    expect(getRemoteModuleAndOptions).toHaveBeenCalledTimes(1);

    let firstSettled = false;
    let secondSettled = false;
    void first.then(() => {
      firstSettled = true;
    });
    void second.then(() => {
      secondSettled = true;
    });
    acquisition.resolve({
      module: { init: initRemote },
      remoteMatchInfo: { remoteSnapshot: { modules: ['command'] } },
    });
    await initStarted.promise;
    await Promise.resolve();
    expect(firstSettled).toBe(false);
    expect(secondSettled).toBe(false);
    expect(initRemote).toHaveBeenCalledWith('producer', { modules: ['command'] });
    initialization.resolve(undefined);
    expect((await first).success).toBe(true);
    expect((await second).success).toBe(true);
    expect(registerRemotes).toHaveBeenCalledTimes(1);
    expect(getRemoteModuleAndOptions).toHaveBeenCalledTimes(1);
    expect(initRemote).toHaveBeenCalledTimes(1);

    const repeatedLoad = await loaderA.loadPlugin(manifest);
    expect(repeatedLoad.success).toBe(true);
    expect(registerRemotes).toHaveBeenCalledTimes(1);
    expect(getRemoteModuleAndOptions).toHaveBeenCalledTimes(1);
    expect(initRemote).toHaveBeenCalledTimes(1);

    const missingReadinessApi = await createNodePluginLoader({
      getRuntime: () => makeRuntime({ version: '2.8.0', remoteHandler: undefined }),
    }).loadPlugin(manifest);
    expect(missingReadinessApi.success).toBe(false);
    if (!missingReadinessApi.success) {
      expect(missingReadinessApi.errorMessage).toContain('Unsupported @module-federation/enhanced host runtime');
      expect(missingReadinessApi.errorMessage).toContain('version "2.8.0"');
      expect(missingReadinessApi.errorMessage).toContain('remoteHandler.getRemoteModuleAndOptions');
    }

    const missingHost = await createNodePluginLoader({ getRuntime: () => undefined }).loadPlugin(manifest);
    expect(missingHost.success).toBe(false);
    if (!missingHost.success) {
      expect(missingHost.errorMessage).toContain('Initialize the host first');
    }

    const invalidEntry = await loaderA.loadPlugin(makeManifest(['/assets/chunk.js']));
    expect(invalidEntry.success).toBe(false);
    if (!invalidEntry.success) {
      expect(invalidEntry.errorMessage).toContain('no declared remoteEntry');
    }

    const failedRuntime = makeRuntime({
      registerRemotes: () => {
        throw new Error('host registration failed');
      },
    });
    const failed = await createNodePluginLoader({ getRuntime: () => failedRuntime }).loadPlugin(makeManifest());
    expect(failed.success).toBe(false);
    if (!failed.success) {
      expect(failed.errorMessage).toContain('host registration failed');
      expect(failed.errorCause).toEqual(new Error('host registration failed'));
    }
  });

  it('returns acquisition and initialization failures as SDK failures and evicts failed readiness for retry', async () => {
    const acquisitionError = new Error('container acquisition failed');
    const acquisitionFailure = makeRuntime({
      remoteHandler: {
        getRemoteModuleAndOptions: async () => {
          throw acquisitionError;
        },
      },
    });
    const acquisitionResult = await createNodePluginLoader({ getRuntime: () => acquisitionFailure }).loadPlugin(makeManifest());
    expect(acquisitionResult.success).toBe(false);
    if (!acquisitionResult.success) {
      expect(acquisitionResult.errorMessage).toContain('container acquisition failed');
      expect(acquisitionResult.errorCause).toBe(acquisitionError);
    }

    const initializationError = new Error('container initialization failed');
    const registerRemotes = jest.fn();
    const initRemote = jest.fn(async (): Promise<void> => undefined);
    initRemote.mockRejectedValueOnce(initializationError).mockResolvedValueOnce(undefined);
    const getRemoteModuleAndOptions = jest.fn(async () => ({
      module: { init: initRemote },
      remoteMatchInfo: {},
    }));
    const retryRuntime = makeRuntime({
      registerRemotes,
      remoteHandler: { getRemoteModuleAndOptions },
    });
    const retryLoader = createNodePluginLoader({ getRuntime: () => retryRuntime });

    const firstAttempt = await retryLoader.loadPlugin(makeManifest());
    expect(firstAttempt.success).toBe(false);
    if (!firstAttempt.success) {
      expect(firstAttempt.errorMessage).toContain('container initialization failed');
      expect(firstAttempt.errorCause).toBe(initializationError);
    }
    const retry = await retryLoader.loadPlugin(makeManifest());
    expect(retry.success).toBe(true);
    expect(registerRemotes).toHaveBeenCalledTimes(2);
    expect(getRemoteModuleAndOptions).toHaveBeenCalledTimes(2);
    expect(initRemote).toHaveBeenCalledTimes(2);
  });

  it('rejects unsupported SDK options, with exact shared-scope guidance', () => {
    expect(() => createNodePluginLoader({ sharedScope: {} })).toThrow('not implemented yet; configure sharing in Rspack');
    expect(() => createNodePluginLoader({ canReloadScript: () => true })).toThrow('Unsupported SDK loader option(s): canReloadScript');
    expect(() => createNodePluginLoader({ customDependencyResolutions: {} })).toThrow(
      'Unsupported SDK loader option(s): customDependencyResolutions',
    );
  });
});
