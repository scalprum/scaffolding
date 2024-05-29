import React, { PropsWithChildren, useMemo } from 'react';
import { initialize, AppsConfig, Scalprum } from '@scalprum/core';
import { ScalprumContext } from './scalprum-context';
import { FeatureFlags, PluginLoaderOptions, PluginManifest, PluginStoreOptions, PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';

/**
 * @deprecated
 */
export type ScalprumFeed = AppsConfig;

export type ScalprumProviderInstanceProps<T extends Record<string, any> = Record<string, any>> = PropsWithChildren<{
  scalprum: Scalprum<T>;
}>;

function isInstanceProps<T extends Record<string, any>>(props: ScalprumProviderProps<T>): props is ScalprumProviderInstanceProps<T> {
  return 'scalprum' in props;
}

export type ScalprumProviderConfigurableProps<T extends Record<string, any> = Record<string, any>> = PropsWithChildren<{
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
}>;

export type ScalprumProviderProps<T extends Record<string, any> = Record<string, any>> =
  | ScalprumProviderInstanceProps<T>
  | ScalprumProviderConfigurableProps<T>;

function baseTransformPluginManifest(manifest: PluginManifest): PluginManifest {
  return { ...manifest, loadScripts: manifest.loadScripts.map((script) => `${manifest.baseURL}${script}`) };
}

export function ScalprumProvider<T extends Record<string, any> = Record<string, any>>(
  props: ScalprumProviderProps<T>,
): React.ReactElement | React.ReactElement {
  const state: Scalprum<T> = useMemo(() => {
    if (isInstanceProps(props)) {
      return props.scalprum;
    }

    const { config, api, pluginSDKOptions } = props;
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
    return initialize<T>({
      appsConfig: config,
      api,
      ...pluginSDKOptions,
      pluginLoaderOptions: {
        ...pluginSDKOptions?.pluginLoaderOptions,
        transformPluginManifest: internalTransformPluginManifest,
      },
    });
  }, []);

  return (
    <ScalprumContext.Provider
      value={{
        config: state.appsConfig,
        api: state.api,
        initialized: true,
        pluginStore: state.pluginStore,
      }}
    >
      <PluginStoreProvider store={state.pluginStore}>{props.children}</PluginStoreProvider>
    </ScalprumContext.Provider>
  );
}
