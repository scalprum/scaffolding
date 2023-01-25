import React, { useRef } from 'react';
import { initialize, AppsConfig, Scalprum } from '@scalprum/core';
import { ScalprumContext } from './scalprum-context';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';

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
}

export function ScalprumProvider<T extends Record<string, any> = Record<string, any>>({
  config,
  children,
  api,
}: ScalprumProviderProps<T>): React.ReactElement | React.ReactElement {
  const state = useRef<Scalprum<T>>(initialize<T>({ appsConfig: config, api: api as T }));

  return (
    <ScalprumContext.Provider
      value={{
        config,
        api,
        initialized: true,
      }}
    >
      <PluginStoreProvider store={state.current.pluginStore}>{children}</PluginStoreProvider>
    </ScalprumContext.Provider>
  );
}
