import React, { useMemo } from 'react';
import { initialize, AppsConfig } from '@scalprum/core';
import { ScalprumContext } from './scalprum-context';
import { FeatureFlags, PluginLoaderOptions, PluginManifest, PluginStoreOptions, PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';

/**
 * @deprecated
 */
export type ScalprumFeed = AppsConfig;

export interface ScalprumProviderProps<T extends Record<string, any> = Record<string, any>> {
  config: AppsConfig;
  api?: T;
  children?: React.ReactNode;
  pluginSDKOptions?: {
    pluginStoreFeatureFlags?: FeatureFlags;
    pluginLoaderOptions?: PluginLoaderOptions & {
      /** @deprecated */
      postProcessManifest?: PluginLoaderOptions['transformPluginManifest'];
    };
    pluginStoreOptions?: PluginStoreOptions;
  };
}

function baseTransformPluginManifest(manifest: PluginManifest): PluginManifest {
  return { ...manifest, loadScripts: manifest.loadScripts.map((script) => `${manifest.baseURL}${script}`) };
}

export function ScalprumProvider<T extends Record<string, any> = Record<string, any>>({
  config,
  children,
  api,
  pluginSDKOptions,
}: ScalprumProviderProps<T>): React.ReactElement | React.ReactElement {
  const { postProcessManifest, transformPluginManifest } = pluginSDKOptions?.pluginLoaderOptions || {};
  // SDK v4 and v5 compatibility layer
  const internalTransformPluginManifest: PluginLoaderOptions['transformPluginManifest'] =
    (postProcessManifest || transformPluginManifest) ?? baseTransformPluginManifest;

  if (postProcessManifest) {
    console.error(
      `[Scalprum] Deprecation warning!
Please use pluginSDKOptions.pluginLoaderOptions.transformPluginManifest instead of pluginSDKOptions.pluginLoaderOptions.postProcessManifest.
The postProcessManifest option will be removed in the next major release.`,
    );
  }
  const state = useMemo(
    () =>
      initialize<T>({
        appsConfig: config,
        api,
        ...pluginSDKOptions,
        pluginLoaderOptions: {
          ...pluginSDKOptions?.pluginLoaderOptions,
          transformPluginManifest: internalTransformPluginManifest,
        },
      }),
    [],
  );

  return (
    <ScalprumContext.Provider
      value={{
        config,
        api,
        initialized: true,
        pluginStore: state.pluginStore,
      }}
    >
      <PluginStoreProvider store={state.pluginStore}>{children}</PluginStoreProvider>
    </ScalprumContext.Provider>
  );
}
