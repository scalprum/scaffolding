import React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { PluginEntryModule, PluginLoaderInterface, PluginManifest } from '@openshift/dynamic-plugin-sdk';
import { getScalprum, removeScalprum } from '@scalprum/core';
import { ScalprumProvider } from './scalprum-provider';

const manifest: PluginManifest = {
  name: 'fixture',
  version: '1.0.0',
  registrationMethod: 'custom',
  baseURL: '/fixtures/',
  loadScripts: [],
  extensions: [],
};

beforeEach(() => removeScalprum());
afterEach(() => {
  cleanup();
  removeScalprum();
  const browserGlobal = globalThis as unknown as Record<string, unknown>;
  delete browserGlobal.__webpack_share_scopes__;
  delete browserGlobal.fixture;
  jest.restoreAllMocks();
});

test('forwards a structural loader and store options through the provider', async () => {
  const entryModule = {
    init: async () => undefined,
    get: async () => () => ({ default: 'from provider' }),
  } as unknown as PluginEntryModule;
  const loadPlugin = jest.fn(async () => ({ success: true as const, loadedExtensions: [], entryModule }));
  const loader: PluginLoaderInterface = {
    loadPluginManifest: async () => manifest,
    transformPluginManifest: <T extends PluginManifest>(value: T): T => value,
    loadPlugin,
  };

  render(
    <ScalprumProvider
      config={{ fixture: { name: 'fixture', manifestLocation: '/fixtures/manifest.json' } }}
      api={{ greeting: 'hello' }}
      loader={loader}
      pluginSDKOptions={{
        pluginStoreFeatureFlags: { enabled: true },
        pluginStoreOptions: { autoEnableLoadedPlugins: false },
      }}
    >
      <div>Ready</div>
    </ScalprumProvider>,
  );

  const state = getScalprum();
  expect(state.api.greeting).toBe('hello');
  expect(state.pluginStore.getFeatureFlags().enabled).toBe(true);
  await state.pluginStore.loadPlugin(manifest);
  expect(loadPlugin).toHaveBeenCalledWith(manifest);
  expect(await state.pluginStore.getExposedModule('fixture', './widget')).toEqual({ default: 'from provider' });
  expect(state.pluginStore.getPluginInfo()[0]).toMatchObject({ status: 'loaded', enabled: false });
});

test.each(['transformPluginManifest', 'postProcessManifest'] as const)(
  'preserves the %s option for the default browser loader',
  async (optionName) => {
    const browserGlobal = globalThis as unknown as Record<string, unknown>;
    browserGlobal.__webpack_share_scopes__ = { default: {} };
    browserGlobal.fixture = {
      init: async () => undefined,
      get: async () => () => ({ default: 'browser module' }),
    };
    const transform = jest.fn(<T extends PluginManifest>(value: T): T => ({ ...value, version: '2.0.0' }) as T);
    const loaderOptions = optionName === 'postProcessManifest' ? { postProcessManifest: transform } : { transformPluginManifest: transform };
    const warning = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ScalprumProvider
        config={{ fixture: { name: 'fixture', manifestLocation: '/fixtures/manifest.json' } }}
        pluginSDKOptions={{ pluginLoaderOptions: loaderOptions }}
      >
        <div>Ready</div>
      </ScalprumProvider>,
    );

    const store = getScalprum().pluginStore;
    await store.loadPlugin(manifest);
    expect(transform).toHaveBeenCalledWith(manifest);
    expect(store.getPluginInfo()[0]).toMatchObject({ status: 'loaded', manifest: { version: '2.0.0' } });
    expect(warning).toHaveBeenCalledTimes(optionName === 'postProcessManifest' ? 1 : 0);
  },
);
