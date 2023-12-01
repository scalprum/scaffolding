/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { withNx, NxWebpackExecutionContext, composePluginsSync } from '@nx/webpack';
import { withReact } from '@nx/react';
import { merge } from 'webpack-merge';
import { Configuration, container, ProgressPlugin } from 'webpack';
import { join, resolve } from 'path';
import { DynamicRemotePlugin } from '@openshift/dynamic-plugin-sdk-webpack';

const { ModuleFederationPlugin } = container;

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

const TestAppFederation = new ModuleFederationPlugin({
  name: 'testApp',
  filename: 'testApp.js',
  library: {
    type: 'var',
    name: 'testApp',
  },
  exposes: {
    './ModuleOne': resolve(__dirname, './src/modules/moduleOne.tsx'),
    './ModuleTwo': resolve(__dirname, './src/modules/moduleTwo.tsx'),
    './ModuleThree': resolve(__dirname, './src/modules/moduleThree.tsx'),
    './ErrorModule': resolve(__dirname, './src/modules/errorModule.tsx'),
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
    type: 'var',
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
    type: 'var',
    name: 'testModule',
  },
  exposes: {
    './ModuleThree': resolve(__dirname, './src/modules/moduleThree.tsx'),
    './ModuleFour': resolve(__dirname, './src/modules/moduleFour.tsx'),
  },
  shared: [sharedModules],
});

const TestSDKPLugin = new DynamicRemotePlugin({
  extensions: [],
  sharedModules,
  entryScriptFilename: 'sdk-plugin.[fullhash].js',
  moduleFederationSettings: {
    libraryType: 'global',
  },
  pluginMetadata: {
    name: 'sdk-plugin',
    version: '1.0.0',
    exposedModules: {
      './SDKComponent': './src/modules/SDKComponent.tsx',
    },
  },
});

const withModuleFederation = (config: Configuration, { context }: NxWebpackExecutionContext): Configuration => {
  const plugins: Configuration['plugins'] = [new ProgressPlugin(), TestSDKPLugin, TestAppFederation, TestModuleFederation, TestPreLoadFederation];
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
