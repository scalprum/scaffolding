import {
  isCodeRef,
  type AnyObject,
  type PluginLoaderOptions,
  type PluginManifest,
  type RemotePluginManifest,
} from '@openshift/dynamic-plugin-sdk';
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
    const remoteModule: AnyObject = { default: 'default export', named: 'named export' };
    const loadRemote = jest.fn(async <T extends AnyObject>(id: string): Promise<T> => {
      expect(id).toBe('producer/command');
      return remoteModule as T;
    });
    const runtime: EnhancedRuntime = { registerRemotes, loadRemote };
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
    expect(registerRemotes).toHaveBeenCalledWith([
      { name: 'producer', entry: '/assets/remoteEntry.cjs?v=4', type: 'commonjs-module' },
    ]);
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

    const moduleFactory = await result.entryModule?.get('./command');
    expect(moduleFactory().named).toBe('named export');
    expect(loadRemote).toHaveBeenCalledWith('producer/command');
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

  it('coalesces concurrent registration and resolves loader errors as SDK failure results', async () => {
    let finishRegistration: (() => void) | undefined;
    const registerRemotes = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finishRegistration = resolve;
        }),
    );
    const runtime: EnhancedRuntime = {
      registerRemotes,
      loadRemote: async <T extends AnyObject>() => ({} as T),
    };
    const loader = createNodePluginLoader({ getRuntime: () => runtime });
    const manifest = makeManifest();

    const first = loader.loadPlugin(manifest);
    const second = loader.loadPlugin(manifest);
    expect(registerRemotes).toHaveBeenCalledTimes(1);
    finishRegistration?.();
    expect((await first).success).toBe(true);
    expect((await second).success).toBe(true);

    const missingHost = await createNodePluginLoader({ getRuntime: () => undefined }).loadPlugin(manifest);
    expect(missingHost.success).toBe(false);
    if (!missingHost.success) {
      expect(missingHost.errorMessage).toContain('Initialize the host first');
    }

    const invalidEntry = await loader.loadPlugin(makeManifest(['/assets/chunk.js']));
    expect(invalidEntry.success).toBe(false);
    if (!invalidEntry.success) {
      expect(invalidEntry.errorMessage).toContain('no declared remoteEntry');
    }

    const failedRuntime: EnhancedRuntime = {
      registerRemotes: () => {
        throw new Error('host registration failed');
      },
      loadRemote: async <T extends AnyObject>() => ({} as T),
    };
    const failed = await createNodePluginLoader({ getRuntime: () => failedRuntime }).loadPlugin(makeManifest());
    expect(failed.success).toBe(false);
    if (!failed.success) {
      expect(failed.errorMessage).toContain('host registration failed');
      expect(failed.errorCause).toEqual(new Error('host registration failed'));
    }
  });

  it('rejects unsupported SDK options, with exact shared-scope guidance', () => {
    expect(() => createNodePluginLoader({ sharedScope: {} })).toThrow('not implemented yet; configure sharing in Rspack');
    expect(() => createNodePluginLoader({ canReloadScript: () => true })).toThrow('Unsupported SDK loader option(s): canReloadScript');
    expect(() => createNodePluginLoader({ customDependencyResolutions: {} })).toThrow(
      'Unsupported SDK loader option(s): customDependencyResolutions',
    );
  });
});
