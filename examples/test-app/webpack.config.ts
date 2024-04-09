/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { withNx, NxWebpackExecutionContext, composePluginsSync } from '@nx/webpack';
import { withReact } from '@nx/react';
import { merge } from 'webpack-merge';
import { Configuration, ProgressPlugin } from 'webpack';
import { join, resolve } from 'path';
import { ModuleFederationPlugin } from '@module-federation/enhanced';
import { DynamicRemotePluginEnhanced } from '@scalprum/build-tools/src/index';

const sharedModules = {
  react: {
    singleton: true,
    requiredVersion: '*',
  },
  'react-dom': {
    singleton: true,
    requiredVersion: '*',
  },
  '@scalprum/react-core': {
    singleton: true,
    requiredVersion: '*',
  },
  '@openshift/dynamic-plugin-sdk': {
    singleton: true,
    requiredVersion: '*',
  },
};

const ShellConfig = new ModuleFederationPlugin({
  name: 'shell',
  filename: 'shell.[contenthash].js',
  library: {
    type: 'global',
    name: 'shell',
  },
  shared: [
    {
      react: {
        singleton: true,
      },
      'react-dom': {
        singleton: true,
      },
      '@scalprum/react-core': {
        singleton: true,
      },
      '@openshift/dynamic-plugin-sdk': {
        singleton: true,
      },
    },
  ],
});

const TestPreLoadFederation = new ModuleFederationPlugin({
  name: 'preLoad',
  filename: 'preLoad.js',
  library: {
    type: 'global',
    name: 'preLoad',
  },
  exposes: {
    './PreLoadedModule': resolve(__dirname, './src/modules/preLoad.tsx'),
    './NestedModule': resolve(__dirname, './src/modules/nestedModule.tsx'),
  },
  shared: [sharedModules],
});

const TestModuleFederation = new ModuleFederationPlugin({
  name: 'testModule',
  filename: 'testModule.js',
  library: {
    type: 'global',
    name: 'testModule',
  },
  exposes: {
    './ModuleThree': resolve(__dirname, './src/modules/moduleThree.tsx'),
    './ModuleFour': resolve(__dirname, './src/modules/moduleFour.tsx'),
  },
  shared: [sharedModules],
});

const TestSDKPLugin = new DynamicRemotePluginEnhanced({
  extensions: [],
  sharedModules,
  entryScriptFilename: 'sdk-plugin.[contenthash].js',
  pluginMetadata: {
    name: 'sdk-plugin',
    version: '1.0.0',
    exposedModules: {
      './SDKComponent': './src/modules/SDKComponent.tsx',
    },
  },
});

const withModuleFederation = (config: Configuration, { context }: NxWebpackExecutionContext): Configuration => {
  const plugins: Configuration['plugins'] = [new ProgressPlugin(), ShellConfig];
  const newConfig = merge(config, {
    experiments: {
      outputModule: true,
    },
    output: {
      publicPath: 'auto',
    },
    plugins,
  });
  // @ts-ignore
  if (newConfig.devServer) {
    // @ts-ignore
    newConfig.devServer.client = {
      overlay: false,
    };
  }
  return newConfig;
};

const withWebpackCache = (config: Configuration, { context }: NxWebpackExecutionContext): Configuration => {
  return merge(config, {
    cache: {
      type: 'filesystem',
      cacheDirectory: join(context.root, '.webpack-cache'),
    },
  });
};

function init(...args: any[]) {
  // @ts-ignore
  const config = composePluginsSync(withNx(), withReact(), withWebpackCache, withModuleFederation)(...args);
  config.plugins?.forEach((plugin) => {
    if (plugin?.constructor.name === 'ReactRefreshPlugin') {
      // disable annoying overlay
      // @ts-ignore
      plugin.options.overlay = false;
    }
  });
  return config;
}

// Nx plugins for webpack to build config object from Nx options and context.
export default init;
