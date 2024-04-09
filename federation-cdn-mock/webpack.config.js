const { resolve } = require('path');
const { ModuleFederationPlugin } = require('@module-federation/enhanced');
const { DynamicRemotePluginEnhanced } = require('@scalprum/build-tools');
// import { DynamicRemotePlugin } from '@openshift/dynamic-plugin-sdk-webpack'

const sharedModules = {
  react: {
    singleton: true,
    requiredVersion: '*',
    version: '18.2.0',
  },
  'react-dom': {
    singleton: true,
    requiredVersion: '*',
    version: '18.2.0',
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
    type: 'global',
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
        version: '18.2.0',
      },
      'react-dom': {
        singleton: true,
        version: '18.2.0',
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
      './ModuleOne': resolve(__dirname, './src/modules/moduleOne.tsx'),
      './ModuleTwo': resolve(__dirname, './src/modules/moduleTwo.tsx'),
      './ModuleThree': resolve(__dirname, './src/modules/moduleThree.tsx'),
      './ErrorModule': resolve(__dirname, './src/modules/errorModule.tsx'),
      './PreLoadedModule': resolve(__dirname, './src/modules/preLoad.tsx'),
      './NestedModule': resolve(__dirname, './src/modules/nestedModule.tsx'),
      './ModuleThree': resolve(__dirname, './src/modules/moduleThree.tsx'),
      './ModuleFour': resolve(__dirname, './src/modules/moduleFour.tsx'),
      './SDKComponent': resolve(__dirname, './src/modules/SDKComponent.tsx'),
    },
  },
});

function init() {
  /** @type { import("webpack").Configuration } */
  const config = {
    entry: {},
    cache: { type: 'filesystem', cacheDirectory: resolve(__dirname, '.cdn-cache')},
    output: {
      publicPath: 'auto',
    },
    mode: 'development',
    plugins: [TestSDKPLugin],
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
              },
            },
          },
        },
      ],
    },
  };

  return config;
}

// Nx plugins for webpack to build config object from Nx options and context.
module.exports = init;
