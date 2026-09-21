const { resolve } = require('path');
const { ModuleFederationPlugin, ContainerPlugin } = require('@module-federation/enhanced');
const { DynamicRemotePlugin } = require('@openshift/dynamic-plugin-sdk-webpack');
const { ScalprumRemoteTypesProducerPlugin } = require('../dist/packages/remote-types');

console.log('Entry tests:', resolve(__dirname, './src/modules/moduleOne.tsx'));

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
  '@scalprum/core': {
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

const sdkExposes = {
  './ModuleOne': resolve(__dirname, './src/modules/moduleOne.tsx'),
  './ModuleTwo': resolve(__dirname, './src/modules/moduleTwo.tsx'),
  './ModuleThree': resolve(__dirname, './src/modules/moduleThree.tsx'),
  './ErrorModule': resolve(__dirname, './src/modules/errorModule.tsx'),
  './PreLoadedModule': resolve(__dirname, './src/modules/preLoad.tsx'),
  './NestedModule': resolve(__dirname, './src/modules/nestedModule.tsx'),
  './ModuleFour': resolve(__dirname, './src/modules/moduleFour.tsx'),
  './SDKComponent': resolve(__dirname, './src/modules/SDKComponent.tsx'),
  './ApiModule': resolve(__dirname, './src/modules/apiModule.tsx'),
  './DelayedModule': resolve(__dirname, './src/modules/delayedModule.tsx'),
  './useCounterHook': resolve(__dirname, './src/modules/useCounterHook.tsx'),
  './useApiHook': resolve(__dirname, './src/modules/useApiHook.tsx'),
  './useTimerHook': resolve(__dirname, './src/modules/useTimerHook.tsx'),
  './useSharedStoreHook': resolve(__dirname, './src/modules/useSharedStoreHook.tsx'),
};

class SDKModuleFederationPlugin extends ModuleFederationPlugin {
  constructor(options) {
    super({
      ...options,
      dts: false,
    });
  }
}

class FullManifestModuleFederationPlugin extends ModuleFederationPlugin {
  constructor(options) {
    super({
      ...options,
      dts: false,
    });
  }
}

const TestSDKPlugin = new DynamicRemotePlugin({
  extensions: [],
  sharedModules,
  entryScriptFilename: 'sdk-plugin.[contenthash].js',
  moduleFederationSettings: {
    // Use non native webpack plugins
    pluginOverride: {
      ModuleFederationPlugin: SDKModuleFederationPlugin,
      ContainerPlugin,
    },
  },
  pluginMetadata: {
    name: 'sdk-plugin',
    version: '1.0.0',
    exposedModules: sdkExposes,
  },
});

const FullManifest = new DynamicRemotePlugin({
  extensions: [],
  sharedModules,
  pluginManifestFilename: 'full-manifest.json',
  entryScriptFilename: 'full-manifest.js',
  moduleFederationSettings: {
    // Use non native webpack plugins
    pluginOverride: {
      ModuleFederationPlugin: FullManifestModuleFederationPlugin,
      ContainerPlugin,
    },
  },
  pluginMetadata: {
    name: 'full-manifest',
    version: '1.0.0',
    exposedModules: {
      './SDKComponent': resolve(__dirname, './src/modules/SDKComponent.tsx'),
    },
  },
});

function init() {
  /** @type { import("webpack").Configuration } */
  const config = {
    entry: {
      mock: resolve(__dirname, './src/index.tsx'),
    },
    cache: { type: 'filesystem', cacheDirectory: resolve(__dirname, '.cdn-cache') },
    output: {
      publicPath: 'auto',
    },
    mode: 'development',
    plugins: [
      new ScalprumRemoteTypesProducerPlugin({
        scope: 'sdk-plugin',
        exposes: sdkExposes,
        sourceRoot: './src',
        tsConfigPath: './tsconfig.json',
        outputDirectory: './dist',
        archiveFilename: 'sdk-plugin-mf-types.zip',
        sourceArchiveFilename: 'sdk-plugin-mf-types.zip',
      }),
      new ScalprumRemoteTypesProducerPlugin({
        scope: 'full-manifest',
        exposes: {
          './SDKComponent': resolve(__dirname, './src/modules/SDKComponent.tsx'),
        },
        sourceRoot: './src',
        tsConfigPath: './tsconfig.json',
        outputDirectory: './dist',
        archiveFilename: 'full-manifest-mf-types.zip',
        sourceArchiveFilename: 'full-manifest-mf-types.zip',
      }),
      TestSDKPlugin,
      FullManifest,
    ],
    resolve: {
      alias: {
        '@scalprum/react-core': resolve(__dirname, '../dist/packages/react-core/esm'),
        '@scalprum/core': resolve(__dirname, '../dist/packages/core/esm'),
      },
    },
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
