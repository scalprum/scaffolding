import React, { useMemo } from 'react';
import { initialize, AppsConfig } from '@scalprum/core';
import { ScalprumContext } from './scalprum-context';
import { FeatureFlags, PluginLoaderOptions, PluginStoreOptions, PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';

/**
 * @deprecated
 */
export type ScalprumFeed = AppsConfig;

export interface ScalprumState<T extends Record<string, any> = Record<string, any>> {
  initialized: boolean;
  config: AppsConfig;
  api?: T;
}

export interface ScalprumProviderProps<T extends Record<string, any> = Record<string, any>> {
  config: AppsConfig;
  api?: T;
  children?: React.ReactNode;
  pluginSDKOptions?: {
    pluginStoreFeatureFlags?: FeatureFlags;
    pluginLoaderOptions?: PluginLoaderOptions;
    pluginStoreOptions?: PluginStoreOptions;
  };
}

export function ScalprumProvider<T extends Record<string, any> = Record<string, any>>({
  config,
  children,
  api,
  pluginSDKOptions,
}: ScalprumProviderProps<T>): React.ReactElement | React.ReactElement {
  const state = useMemo(
    () =>
      initialize<T>({
        appsConfig: config,
        api,
        ...pluginSDKOptions,
      }),
    []
  );

  return (
    <ScalprumContext.Provider
      value={{
        config,
        api,
        initialized: true,
      }}
    >
      <PluginStoreProvider store={state.pluginStore}>{children}</PluginStoreProvider>
    </ScalprumContext.Provider>
  );
}
