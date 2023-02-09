import { PluginStore } from '@openshift/dynamic-plugin-sdk';
import { AppsConfig } from '@scalprum/core';
import { createContext } from 'react';

export interface ScalprumState<T extends Record<string, any> = Record<string, any>> {
  initialized: boolean;
  config: AppsConfig;
  api?: T;
  pluginStore: PluginStore;
}

export const ScalprumContext = createContext<ScalprumState>({
  initialized: false,
  config: {},
  api: {},
  pluginStore: {} as unknown as PluginStore,
});
